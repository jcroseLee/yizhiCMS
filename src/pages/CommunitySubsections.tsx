import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, InputNumber, Switch, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabase'

const { Option } = Select

interface CommunitySubsection {
  id: string
  section_key: string
  key: string
  label: string
  description?: string
  order_index: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

interface CommunitySection {
  key: string
  label: string
}

export const CommunitySubsections: React.FC = () => {
  const [subsections, setSubsections] = useState<CommunitySubsection[]>([])
  const [sections, setSections] = useState<CommunitySection[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSubsection, setEditingSubsection] = useState<CommunitySubsection | null>(null)
  const [form] = Form.useForm()

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from('community_sections')
        .select('key, label')
        .eq('is_enabled', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      setSections(data || [])
    } catch (error: any) {
      console.error('Failed to load sections:', error)
    }
  }

  const loadSubsections = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('community_subsections')
        .select('*')
        .order('section_key', { ascending: true })
        .order('order_index', { ascending: true })

      if (error) throw error
      setSubsections(data || [])
    } catch (error: any) {
      message.error('加载分区列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
    loadSubsections()
  }, [])

  const handleAdd = () => {
    setEditingSubsection(null)
    form.resetFields()
    form.setFieldsValue({
      is_enabled: true,
      order_index: subsections.length > 0 ? Math.max(...subsections.map(s => s.order_index)) + 1 : 0,
    })
    setModalVisible(true)
  }

  const handleEdit = (record: CommunitySubsection) => {
    setEditingSubsection(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('community_subsections')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadSubsections()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingSubsection) {
        // 编辑
        const { error } = await supabase
          .from('community_subsections')
          .update({
            section_key: values.section_key,
            key: values.key,
            label: values.label,
            description: values.description || null,
            order_index: values.order_index,
            is_enabled: values.is_enabled,
          })
          .eq('id', editingSubsection.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 创建
        // 检查 (section_key, key) 是否已存在
        const { data: existing } = await supabase
          .from('community_subsections')
          .select('id')
          .eq('section_key', values.section_key)
          .eq('key', values.key)
          .single()

        if (existing) {
          message.error('该分类下已存在相同标识符的分区')
          return
        }

        const { error } = await supabase
          .from('community_subsections')
          .insert({
            section_key: values.section_key,
            key: values.key,
            label: values.label,
            description: values.description || null,
            order_index: values.order_index,
            is_enabled: values.is_enabled,
          })

        if (error) throw error
        message.success('创建成功')
      }

      setModalVisible(false)
      loadSubsections()
    } catch (error: any) {
      console.error('Save error:', error)
      message.error('保存失败: ' + (error.message || '未知错误'))
    }
  }

  const getSectionLabel = (sectionKey: string) => {
    const section = sections.find(s => s.key === sectionKey)
    return section ? section.label : sectionKey
  }

  const columns = [
    {
      title: '所属分类',
      dataIndex: 'section_key',
      key: 'section_key',
      width: 120,
      render: (key: string) => getSectionLabel(key),
    },
    {
      title: '标识符',
      dataIndex: 'key',
      key: 'key',
      width: 150,
    },
    {
      title: '名称',
      dataIndex: 'label',
      key: 'label',
      width: 150,
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
      title: '启用',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 80,
      render: (enabled: boolean) => (enabled ? '是' : '否'),
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
      render: (_: any, record: CommunitySubsection) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分区吗？"
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>版块分区管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加分区
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={subsections}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingSubsection ? '编辑分区' : '添加分区'}
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
            name="section_key"
            label="所属分类"
            rules={[{ required: true, message: '请选择所属分类' }]}
          >
            <Select 
              placeholder="选择分类"
              disabled={!!editingSubsection}
            >
              {sections.map(section => (
                <Option key={section.key} value={section.key}>
                  {section.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="key"
            label="标识符"
            rules={[
              { required: true, message: '请输入标识符' },
              { pattern: /^[a-z0-9_]+$/, message: '标识符只能包含小写字母、数字和下划线' },
            ]}
          >
            <Input 
              placeholder="例如: theory, practice, question" 
              disabled={!!editingSubsection}
            />
          </Form.Item>

          <Form.Item
            name="label"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如: 六爻理论" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="分区描述（可选）" />
          </Form.Item>

          <Form.Item
            name="order_index"
            label="排序"
            rules={[{ required: true, message: '请输入排序值' }]}
          >
            <InputNumber 
              min={0} 
              placeholder="数字越小越靠前"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="is_enabled"
            label="启用"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSubsection ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

