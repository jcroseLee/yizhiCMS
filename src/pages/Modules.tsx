import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Switch, message, Popconfirm, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

interface Module {
  id: string
  name: string
  display_name: string
  description: string | null
  is_enabled: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export const Modules: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Modules query error:', error)
        // Check if it's a 404 (table doesn't exist)
        if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          message.error('模块表不存在。请确保已运行迁移文件: 20250124_create_modules_table.sql')
        } else {
          message.error('加载模块列表失败: ' + error.message)
        }
        throw error
      }
      setModules(data || [])
    } catch (error: any) {
      // Error already handled above
      console.error('Failed to load modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingModule(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Module) => {
    setEditingModule(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadModules()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleToggleEnabled = async (record: Module) => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_enabled: !record.is_enabled })
        .eq('id', record.id)

      if (error) throw error
      message.success(record.is_enabled ? '模块已禁用' : '模块已启用')
      loadModules()
    } catch (error: any) {
      message.error('操作失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update(values)
          .eq('id', editingModule.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 检查模块名是否已存在
        const { data: existing } = await supabase
          .from('modules')
          .select('id')
          .eq('name', values.name)
          .single()

        if (existing) {
          message.error('模块名已存在')
          return
        }

        const { error } = await supabase
          .from('modules')
          .insert(values)

        if (error) throw error
        message.success('创建成功')
      }

      setModalVisible(false)
      loadModules()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  const columns: ColumnsType<Module> = [
    {
      title: '模块名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '显示名称',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'order_index',
      key: 'order_index',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 100,
      render: (isEnabled: boolean) => (
        <Tag color={isEnabled ? 'green' : 'red'}>
          {isEnabled ? '启用' : '禁用'}
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
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: Module) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => handleToggleEnabled(record)}
          >
            {record.is_enabled ? '禁用' : '启用'}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个模块吗？"
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
        <h2>模块管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加模块
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={modules}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingModule ? '编辑模块' : '添加模块'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="模块名（英文，唯一标识）"
            rules={[{ required: true, message: '请输入模块名' }]}
          >
            <Input disabled={!!editingModule} placeholder="例如: divination" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如: 占卜功能" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="模块功能描述" />
          </Form.Item>

          <Form.Item name="order_index" label="排序（数字越小越靠前）">
            <InputNumber min={0} style={{ width: '100%' }} defaultValue={0} />
          </Form.Item>

          <Form.Item name="is_enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingModule ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

