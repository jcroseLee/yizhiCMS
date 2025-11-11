import React, { useEffect, useState } from 'react'
import { Table, Button, Space, message, Popconfirm, Rate, Modal, Form, Input, InputNumber } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { MasterReview } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

export const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<MasterReview[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReview, setEditingReview] = useState<MasterReview | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('master_reviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (error: any) {
      message.error('加载评价列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: MasterReview) => {
    setEditingReview(record)
    form.setFieldsValue({
      ...record,
      tags: record.tags?.join('、') || '',
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('master_reviews')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadReviews()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const tagsArray = values.tags ? values.tags.split('、').filter((s: string) => s.trim()) : []

      const reviewData = {
        ...values,
        tags: tagsArray,
      }

      if (editingReview) {
        const { error } = await supabase
          .from('master_reviews')
          .update(reviewData)
          .eq('id', editingReview.id)

        if (error) throw error
        message.success('更新成功')
      }

      setModalVisible(false)
      loadReviews()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  const columns: ColumnsType<MasterReview> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled value={rating} />
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags?.join(', ') || '-',
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
      render: (_: any, record: MasterReview) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条评价吗？"
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
      <h2 style={{ marginBottom: 16 }}>评价管理</h2>

      <Table
        columns={columns}
        dataSource={reviews}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title="编辑评价"
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
            name="rating"
            label="评分"
            rules={[{ required: true, message: '请输入评分' }]}
          >
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="content" label="评价内容">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item name="tags" label='标签（用"、"分隔）'>
            <Input />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

