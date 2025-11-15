import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, InputNumber, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabase'

interface CommunitySection {
  id: string
  key: string
  label: string
  description?: string
  order_index: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export const CommunitySections: React.FC = () => {
  const [sections, setSections] = useState<CommunitySection[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSection, setEditingSection] = useState<CommunitySection | null>(null)
  const [form] = Form.useForm()

  const loadSections = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('community_sections')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setSections(data || [])
    } catch (error: any) {
      message.error('加载分类列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
  }, [])

  const handleAdd = () => {
    setEditingSection(null)
    form.resetFields()
    form.setFieldsValue({
      is_enabled: true,
      order_index: sections.length > 0 ? Math.max(...sections.map(s => s.order_index)) + 1 : 0,
    })
    setModalVisible(true)
  }

  const handleEdit = (record: CommunitySection) => {
    setEditingSection(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('community_sections')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadSections()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingSection) {
        // 编辑
        const { error } = await supabase
          .from('community_sections')
          .update({
            key: values.key,
            label: values.label,
            description: values.description || null,
            order_index: values.order_index,
            is_enabled: values.is_enabled,
          })
          .eq('id', editingSection.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 创建
        // 检查key是否已存在
        const { data: existing } = await supabase
          .from('community_sections')
          .select('id')
          .eq('key', values.key)
          .single()

        if (existing) {
          message.error('分类标识符已存在')
          return
        }

        const { error } = await supabase
          .from('community_sections')
          .insert({
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
      loadSections()
    } catch (error: any) {
      console.error('Save error:', error)
      message.error('保存失败: ' + (error.message || '未知错误'))
    }
  }

  const columns = [
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
      render: (_: any, record: CommunitySection) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
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
        <h2>社区分类管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加分类
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sections}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingSection ? '编辑分类' : '添加分类'}
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
            name="key"
            label="标识符"
            rules={[
              { required: true, message: '请输入标识符' },
              { pattern: /^[a-z0-9_]+$/, message: '标识符只能包含小写字母、数字和下划线' },
            ]}
          >
            <Input 
              placeholder="例如: study, help, casual" 
              disabled={!!editingSection}
            />
          </Form.Item>

          <Form.Item
            name="label"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如: 六爻研习" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="分类描述（可选）" />
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
                {editingSection ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

