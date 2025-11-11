import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Post } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

export const Posts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [form] = Form.useForm()
  const [users, setUsers] = useState<Array<{ id: string; nickname: string }>>([])

  useEffect(() => {
    loadPosts()
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nickname')
        .order('created_at', { ascending: false })

      if (!error && profiles) {
        setUsers(profiles.map(p => ({
          id: p.id,
          nickname: p.nickname || '未命名用户',
        })))
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error: any) {
      message.error('加载帖子列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingPost(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Post) => {
    setEditingPost(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadPosts()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingPost) {
        const { error } = await supabase
          .from('posts')
          .update(values)
          .eq('id', editingPost.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 创建新帖子
        if (!values.user_id) {
          message.error('请选择用户')
          return
        }

        const { error } = await supabase
          .from('posts')
          .insert({
            ...values,
            view_count: 0,
            like_count: 0,
            comment_count: 0,
          })

        if (error) throw error
        message.success('创建成功')
      }

      setModalVisible(false)
      loadPosts()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  const columns: ColumnsType<Post> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '浏览量',
      dataIndex: 'view_count',
      key: 'view_count',
    },
    {
      title: '点赞数',
      dataIndex: 'like_count',
      key: 'like_count',
    },
    {
      title: '评论数',
      dataIndex: 'comment_count',
      key: 'comment_count',
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
      render: (_: any, record: Post) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个帖子吗？"
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
        <h2>帖子管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加帖子
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={posts}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingPost ? '编辑帖子' : '添加帖子'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingPost && (
            <Form.Item
              name="user_id"
              label="用户"
              rules={[{ required: true, message: '请选择用户' }]}
            >
              <Select
                placeholder="请选择用户"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={users.map(u => ({
                  value: u.id,
                  label: `${u.nickname} (${u.id.substring(0, 8)}...)`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>

          <Form.Item name="content_html" label="HTML内容（可选）">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPost ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

