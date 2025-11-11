import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Switch, message, Popconfirm, Tag, Select, Avatar, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ProfileOutlined } from '@ant-design/icons'
import { Master, MasterService } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

/**
 * Generate a random default avatar URL based on user ID or timestamp
 */
const generateRandomAvatar = (seed?: string): string => {
  const avatarSeed = seed || `master-${Date.now()}-${Math.random().toString(36).substring(7)}`
  return `https://picsum.photos/seed/${avatarSeed}/160`
}

export const Masters: React.FC = () => {
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingMaster, setEditingMaster] = useState<Master | null>(null)
  const [form] = Form.useForm()
  const [users, setUsers] = useState<Array<{ id: string; nickname: string; avatar_url?: string; email?: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [serviceModalVisible, setServiceModalVisible] = useState(false)
  const [serviceLoading, setServiceLoading] = useState(false)
  const [serviceMaster, setServiceMaster] = useState<Master | null>(null)
  const [services, setServices] = useState<MasterService[]>([])
  const [editingService, setEditingService] = useState<MasterService | null>(null)
  const [serviceForm] = Form.useForm()

  useEffect(() => {
    loadMasters()
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .order('created_at', { ascending: false })

      if (error) throw error

      // 获取已有卦师的user_id列表
      const { data: existingMasters } = await supabase
        .from('masters')
        .select('user_id')

      const existingMasterUserIds = (existingMasters || []).map(m => m.user_id)
      
      // 过滤掉已经是卦师的用户，并包含头像信息
      const availableUsers = (profiles || [])
        .filter(p => !existingMasterUserIds.includes(p.id))
        .map(p => ({
          id: p.id,
          nickname: p.nickname || '未命名用户',
          avatar_url: p.avatar_url || null,
        }))

      setUsers(availableUsers)
    } catch (error: any) {
      console.error('加载用户列表失败:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadMasters = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('masters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // 获取近30天接单量
      const mastersWithOrders = await Promise.all(
        (data || []).map(async (master) => {
          try {
            const { count, error: countError } = await supabase
              .from('consultations')
              .select('*', { count: 'exact', head: true })
              .eq('master_id', master.id)
              .eq('status', 'completed')
              .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            
            return {
              ...master,
              orders_30d: countError ? 0 : (count || 0)
            }
          } catch {
            return { ...master, orders_30d: 0 }
          }
        })
      )
      
      setMasters(mastersWithOrders)
    } catch (error: any) {
      message.error('加载卦师列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async (masterId: string) => {
    setServiceLoading(true)
    try {
      const { data, error } = await supabase
        .from('master_services')
        .select('*')
        .eq('master_id', masterId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (error: any) {
      message.error('加载服务项目失败: ' + error.message)
    } finally {
      setServiceLoading(false)
    }
  }

  const handleAdd = async () => {
    setEditingMaster(null)
    form.resetFields()
    await loadUsers() // 重新加载用户列表
    setModalVisible(true)
  }

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId)
    if (selectedUser) {
      // 自动填充姓名和头像
      form.setFieldsValue({
        name: selectedUser.nickname || '',
        avatar_url: selectedUser.avatar_url || generateRandomAvatar(userId),
      })
    }
  }

  const handleEdit = (record: Master) => {
    setEditingMaster(record)
    form.setFieldsValue({
      ...record,
      expertise: record.expertise?.join('、') || '',
      achievements: record.achievements?.join('\n') || '',
      service_types: record.service_types?.join('、') || '',
      online_status: record.online_status || 'offline',
      min_price: record.min_price || 0,
    })
    setModalVisible(true)
  }

  const handleManageServices = async (master: Master) => {
    setServiceMaster(master)
    setEditingService(null)
    serviceForm.resetFields()
    setServiceModalVisible(true)
    await loadServices(master.id)
  }

  const handleServiceEdit = (service: MasterService) => {
    setEditingService(service)
    serviceForm.setFieldsValue({
      ...service,
      description: service.description || '',
      consultation_duration_minutes: service.consultation_duration_minutes || null,
      consultation_session_count: service.consultation_session_count || null,
      requires_birth_info: service.requires_birth_info ?? true,
      question_min_length: service.question_min_length || 30,
      question_max_length: service.question_max_length || 800,
    })
  }

  const handleServiceAddNew = () => {
    setEditingService(null)
    serviceForm.resetFields()
  }

  const handleServiceSubmit = async (values: any) => {
    if (!serviceMaster) {
      message.error('未选择卦师')
      return
    }

    // Ensure question_max_length >= question_min_length
    const questionMinLength = values.question_min_length ? Number(values.question_min_length) : 30
    const questionMaxLength = values.question_max_length ? Number(values.question_max_length) : 800
    
    if (questionMaxLength < questionMinLength) {
      message.error(`问题最大字数(${questionMaxLength})不能小于最小字数(${questionMinLength})`)
      return
    }

    const buildPayload = (includeNewFields: boolean = true) => {
      const payload: any = {
        name: values.name,
        price: Number(values.price ?? 0),
        service_type: values.service_type,
        description: values.description ? values.description.trim() : null,
        is_active: values.is_active ?? true,
        order_index: Number(values.order_index ?? 0),
      }

      // Only include new fields if includeNewFields is true (to handle schema cache issues)
      if (includeNewFields) {
        // Include question length fields
        payload.question_min_length = questionMinLength
        payload.question_max_length = questionMaxLength
        
        // Include requires_birth_info (has DEFAULT true in database)
        payload.requires_birth_info = values.requires_birth_info ?? true

        // Only include consultation_duration_minutes if provided (nullable column)
        if (values.consultation_duration_minutes !== undefined && values.consultation_duration_minutes !== null && values.consultation_duration_minutes !== '') {
          payload.consultation_duration_minutes = Number(values.consultation_duration_minutes)
        }

        // Only include consultation_session_count if provided (database has DEFAULT 1)
        // If we pass null explicitly, it might override the default and violate CHECK constraint
        if (values.consultation_session_count !== undefined && values.consultation_session_count !== null) {
          payload.consultation_session_count = Number(values.consultation_session_count)
        }
      }

      return payload
    }

    // Track which new fields were actually provided (to show in warning if skipped)
    const providedNewFields: string[] = []
    // These fields are always provided if includeNewFields is true
    providedNewFields.push('question_min_length', 'question_max_length', 'requires_birth_info')
    if (values.consultation_duration_minutes !== undefined && values.consultation_duration_minutes !== null && values.consultation_duration_minutes !== '') {
      providedNewFields.push('consultation_duration_minutes')
    }
    if (values.consultation_session_count !== undefined && values.consultation_session_count !== null) {
      providedNewFields.push('consultation_session_count')
    }

    const performOperation = async (includeNewFields: boolean = true): Promise<{ success: boolean; skippedFields?: string[] }> => {
      const payload = buildPayload(includeNewFields)
      
      if (editingService) {
        const { error } = await supabase
          .from('master_services')
          .update(payload)
          .eq('id', editingService.id)

        if (error) {
          // If schema cache error and we haven't retried yet, retry without new fields
          if (includeNewFields && error.message && (
            error.message.includes('consultation_duration_minutes') || 
            error.message.includes('consultation_session_count') ||
            error.message.includes('requires_birth_info') ||
            error.message.includes('question_max_length') ||
            error.message.includes('question_min_length')
          )) {
            console.warn('Schema cache not updated, retrying without new fields')
            const result = await performOperation(false)
            // Return the fields that were provided but skipped
            return { ...result, skippedFields: providedNewFields }
          }
          throw error
        }
        return { success: true, skippedFields: [] }
      } else {
        const { error } = await supabase
          .from('master_services')
          .insert({
            ...payload,
            master_id: serviceMaster.id,
          })

        if (error) {
          // If schema cache error and we haven't retried yet, retry without new fields
          if (includeNewFields && error.message && (
            error.message.includes('consultation_duration_minutes') || 
            error.message.includes('consultation_session_count') ||
            error.message.includes('requires_birth_info') ||
            error.message.includes('question_max_length') ||
            error.message.includes('question_min_length')
          )) {
            console.warn('Schema cache not updated, retrying without new fields')
            const result = await performOperation(false)
            // Return the fields that were provided but skipped
            return { ...result, skippedFields: providedNewFields }
          }
          throw error
        }
        return { success: true, skippedFields: [] }
      }
    }

    try {
      const result = await performOperation()
      
      if (result.success) {
        if (editingService) {
          message.success('服务项目更新成功')
        } else {
          message.success('服务项目创建成功')
        }
        
        // Show warning if any fields were excluded due to schema cache
        if (result.skippedFields && result.skippedFields.length > 0) {
          const fieldNames = result.skippedFields.map(field => {
            if (field === 'consultation_duration_minutes') return '服务时长'
            if (field === 'consultation_session_count') return '服务次数'
            if (field === 'requires_birth_info') return '要求出生信息'
            if (field === 'question_min_length') return '问题最小字数'
            if (field === 'question_max_length') return '问题最大字数'
            return field
          }).join('、')
          message.warning(`注意：${fieldNames}字段因架构缓存未更新而暂时未保存。请在 Supabase Dashboard 刷新 API 架构缓存后重新编辑此服务。`)
        }
      }

      serviceForm.resetFields()
      setEditingService(null)
      await loadServices(serviceMaster.id)
      loadMasters()
    } catch (error: any) {
      console.error('Service submit error:', error)
      
      // Check if error is about missing columns
      if (error.message && (
        error.message.includes('consultation_duration_minutes') || 
        error.message.includes('consultation_session_count') ||
        error.message.includes('question_max_length') ||
        error.message.includes('question_min_length') ||
        error.message.includes('requires_birth_info')
      )) {
        const errorMessage = '数据库架构未更新：缺少新列。请确保已应用最新的数据库迁移，并在 Supabase Dashboard 中刷新 API 架构缓存。'
        message.error(errorMessage)
      } else {
        const errorMessage = error.message || error.details || error.hint || '保存服务项目失败'
        message.error('保存服务项目失败: ' + errorMessage)
      }
    }
  }

  const handleServiceDelete = async (service: MasterService) => {
    try {
      const { error } = await supabase
        .from('master_services')
        .delete()
        .eq('id', service.id)

      if (error) throw error
      message.success('删除服务项目成功')
      if (serviceMaster) {
        await loadServices(serviceMaster.id)
        loadMasters()
      }
    } catch (error: any) {
      message.error('删除服务项目失败: ' + error.message)
    }
  }

  const handleServiceToggle = async (service: MasterService, nextStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('master_services')
        .update({ is_active: nextStatus })
        .eq('id', service.id)

      if (error) throw error
      message.success('服务状态已更新')
      if (serviceMaster) {
        await loadServices(serviceMaster.id)
      }
    } catch (error: any) {
      message.error('更新服务状态失败: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('masters')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadMasters()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const expertiseArray = values.expertise ? values.expertise.split('、').filter((s: string) => s.trim()) : []
      const achievementsArray = values.achievements ? values.achievements.split('\n').filter((s: string) => s.trim()) : []
      const serviceTypesArray = values.service_types ? values.service_types.split('、').filter((s: string) => s.trim()) : []

      // 确定头像URL：使用提供的头像，回退到用户头像，然后随机默认头像
      let finalAvatarUrl = values.avatar_url
      if (!finalAvatarUrl && values.user_id) {
        const selectedUser = users.find(u => u.id === values.user_id)
        finalAvatarUrl = selectedUser?.avatar_url || generateRandomAvatar(values.user_id)
      }

      const masterData = {
        ...values,
        expertise: expertiseArray,
        achievements: achievementsArray,
        service_types: serviceTypesArray,
        avatar_url: finalAvatarUrl || null,
        online_status: values.online_status || 'offline',
        min_price: values.min_price || 0,
      }

      if (editingMaster) {
        const { error } = await supabase
          .from('masters')
          .update(masterData)
          .eq('id', editingMaster.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 创建新卦师
        if (!values.user_id) {
          message.error('请选择关联用户')
          return
        }

        // 检查该用户是否已经是卦师
        const { data: existingMaster } = await supabase
          .from('masters')
          .select('id')
          .eq('user_id', values.user_id)
          .single()

        if (existingMaster) {
          message.error('该用户已经是卦师')
          return
        }

        const { error } = await supabase
          .from('masters')
          .insert({
            ...masterData,
            user_id: values.user_id,
          })

        if (error) throw error
        message.success('创建成功')
      }

      setModalVisible(false)
      loadMasters()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  const serviceColumns: ColumnsType<MasterService> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => `¥${(price ?? 0).toFixed(2)}`,
    },
    {
      title: '服务形式',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 100,
      render: (type: MasterService['service_type']) => (
        <Tag color={type === '语音' ? 'gold' : 'blue'}>{type}</Tag>
      ),
    },
    {
      title: '时长/次数',
      key: 'duration_session',
      width: 120,
      render: (_: any, record: MasterService) => {
        const duration = record.consultation_duration_minutes ? `${record.consultation_duration_minutes}分钟` : null
        const sessions = record.consultation_session_count ? `${record.consultation_session_count}次` : null
        if (duration && sessions) {
          return `${duration}/${sessions}`
        }
        return duration || sessions || '-'
      },
    },
    {
      title: '需出生信息',
      dataIndex: 'requires_birth_info',
      key: 'requires_birth_info',
      width: 100,
      render: (requires: boolean | undefined) => (
        <Tag color={requires ? 'green' : 'default'}>{requires ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '问题字数',
      key: 'question_length',
      width: 120,
      render: (_: any, record: MasterService) => {
        const min = record.question_min_length || 30
        const max = record.question_max_length || 800
        return `${min}-${max}字`
      },
    },
    {
      title: '排序',
      dataIndex: 'order_index',
      key: 'order_index',
      width: 80,
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (_: boolean, record: MasterService) => (
        <Switch
          checked={record.is_active}
          onChange={(checked) => handleServiceToggle(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: MasterService) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleServiceEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此服务项目吗？"
            okText="确定"
            cancelText="取消"
            onConfirm={() => handleServiceDelete(record)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const columns: ColumnsType<Master> = [
    {
      title: '头像',
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      width: 80,
      render: (avatarUrl: string | null, record: Master) => (
        <Avatar 
          src={avatarUrl || generateRandomAvatar(record.user_id)} 
          size="large"
        />
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '称号',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => rating.toFixed(2),
    },
    {
      title: '评价数',
      dataIndex: 'reviews_count',
      key: 'reviews_count',
    },
    {
      title: '从业年限',
      dataIndex: 'experience_years',
      key: 'experience_years',
    },
    {
      title: '在线状态',
      dataIndex: 'online_status',
      key: 'online_status',
      render: (status: 'online' | 'busy' | 'offline') => {
        const statusMap = {
          online: { text: '在线', color: 'green' },
          busy: { text: '忙碌', color: 'orange' },
          offline: { text: '离线', color: 'default' },
        }
        const statusInfo = statusMap[status] || statusMap.offline
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      },
    },
    {
      title: '最低价格',
      dataIndex: 'min_price',
      key: 'min_price',
      render: (price: number) => `¥${price || 0}`,
    },
    {
      title: '近30天接单',
      dataIndex: 'orders_30d',
      key: 'orders_30d',
      render: (count: number | undefined) => count ?? 0,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Master) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<ProfileOutlined />}
            onClick={() => handleManageServices(record)}
          >
            服务配置
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个卦师吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>卦师管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加卦师
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={masters}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingMaster ? '编辑卦师' : '添加卦师'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingMaster && (
            <Form.Item
              name="user_id"
              label="关联用户"
              rules={[{ required: true, message: '请选择关联用户' }]}
            >
              <Select
                placeholder="请选择用户"
                loading={loadingUsers}
                showSearch
                onChange={handleUserSelect}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                optionRender={(option) => {
                  const user = users.find(u => u.id === option.value)
                  const avatarUrl = user?.avatar_url || generateRandomAvatar(user?.id)
                  return (
                    <Space>
                      <Avatar src={avatarUrl} size="small" />
                      <span>{user?.nickname || '未命名用户'} ({user?.id.substring(0, 8)}...)</span>
                    </Space>
                  )
                }}
                options={users.map(u => ({
                  value: u.id,
                  label: `${u.nickname} (${u.id.substring(0, 8)}...)`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="title" label="称号">
            <Input />
          </Form.Item>

          <Form.Item name="certification" label="认证">
            <Input defaultValue="实名认证" />
          </Form.Item>

          <Form.Item name="experience_years" label="从业年限">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item 
            name="online_status" 
            label="在线状态"
            initialValue="offline"
          >
            <Select>
              <Select.Option value="online">在线</Select.Option>
              <Select.Option value="busy">忙碌</Select.Option>
              <Select.Option value="offline">离线</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="min_price" 
            label="最低咨询价格（元）"
            initialValue={0}
            rules={[{ required: true, message: '请输入最低咨询价格' }]}
          >
            <InputNumber 
              min={0} 
              precision={2}
              style={{ width: '100%' }} 
              placeholder="0"
            />
          </Form.Item>

          <Form.Item name="expertise" label='擅长领域（用"、"分隔）'>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="highlight" label="个人亮点">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="description" label="个人简介">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item name="achievements" label="主要成就（每行一个）">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item name="service_types" label='服务方式（用"、"分隔）'>
            <Input />
          </Form.Item>

          <Form.Item 
            name="avatar_url" 
            label="头像URL"
            extra="留空将自动使用用户头像或生成随机头像"
          >
            <Input placeholder="留空将自动使用用户头像或生成随机头像" />
          </Form.Item>

          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingMaster ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={serviceMaster ? `配置服务：${serviceMaster.name}` : '配置服务'}
        open={serviceModalVisible}
        onCancel={() => setServiceModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>服务项目列表</h3>
          <Button type="primary" onClick={handleServiceAddNew}>
            新增服务
          </Button>
        </div>

        <Table
          columns={serviceColumns}
          dataSource={services}
          rowKey="id"
          loading={serviceLoading}
          pagination={false}
          style={{ marginBottom: 16 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: serviceMaster ? '暂无服务项目' : '请选择卦师' }}
        />

        <Divider />

        <Form
          form={serviceForm}
          layout="vertical"
          onFinish={handleServiceSubmit}
          initialValues={{
            service_type: '图文',
            is_active: true,
            price: 0,
            order_index: 0,
            consultation_session_count: 1,
            requires_birth_info: true,
            question_min_length: 30,
            question_max_length: 800,
          }}
        >
          <Form.Item
            name="name"
            label="服务名称"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input placeholder="例如：六爻占卜详解" />
          </Form.Item>

          <Form.Item
            name="price"
            label="价格（元）"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            name="service_type"
            label="服务形式"
            rules={[{ required: true, message: '请选择服务形式' }]}
          >
            <Select>
              <Select.Option value="图文">图文</Select.Option>
              <Select.Option value="语音">语音</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="order_index"
            label="排序优先级（越小越靠前）"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="服务说明"
          >
            <Input.TextArea rows={3} placeholder="服务内容简介" />
          </Form.Item>

          <Form.Item
            name="consultation_duration_minutes"
            label="服务时长（分钟）"
            tooltip="语音服务建议设置时长，图文服务可留空"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空表示不限制" />
          </Form.Item>

          <Form.Item
            name="consultation_session_count"
            label="服务次数"
            tooltip="该服务包含的咨询次数，默认为1次"
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="requires_birth_info"
            label="是否要求填写出生信息"
            valuePropName="checked"
            tooltip="开启后，用户下单时必须填写出生日期、时间、地点和性别"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="question_min_length"
            label="问题描述最小字数"
            rules={[{ required: true, message: '请输入最小字数' }]}
          >
            <InputNumber min={10} max={1000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="question_max_length"
            label="问题描述最大字数"
            rules={[{ required: true, message: '请输入最大字数' }]}
          >
            <InputNumber min={50} max={5000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="是否启用"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" disabled={!serviceMaster}>
                {editingService ? '更新服务' : '创建服务'}
              </Button>
              <Button onClick={handleServiceAddNew}>清空表单</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

