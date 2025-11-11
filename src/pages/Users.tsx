import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Button, Space, Modal, Form, Select, Input } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { User } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

interface UserWithDetails {
  id: string
  email: string | null
  phone: string | null
  nickname: string | null
  avatar_url: string | null
  role: string
  wechat_openid: string | null
  login_type: 'wechat' | 'email' | 'unknown'
  created_at: string
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        message.error('未登录，请先登录')
        return
      }

      // Call Edge Function to get user details
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/get-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取用户列表失败')
      }

      const { users: usersData } = await response.json()
      setUsers(usersData || [])
    } catch (error: any) {
      console.error('Error loading users:', error)
      message.error('加载用户列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: any) => {
    setEditingUser(record)
    form.setFieldsValue({
      id: record.id,
      role: record.role || 'user',
    })
    setModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: values.role })
        .eq('id', values.id)

      if (error) throw error
      message.success('更新成功')
      setModalVisible(false)
      loadUsers()
    } catch (error: any) {
      message.error('保存失败: ' + error.message)
    }
  }

  const columns: ColumnsType<UserWithDetails> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '登录方式',
      key: 'login_type',
      width: 100,
      render: (_: any, record: UserWithDetails) => (
        <Tag color={record.login_type === 'wechat' ? 'green' : record.login_type === 'email' ? 'blue' : 'default'}>
          {record.login_type === 'wechat' ? '微信登录' : record.login_type === 'email' ? '邮箱登录' : '未知'}
        </Tag>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email: string | null) => email ? (email.endsWith('@wechat.user') ? '-' : email) : '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone: string | null) => {
        if (!phone) {
          return <Tag color="orange">未绑定</Tag>
        }
        return phone
      },
    },
    {
      title: '手机号绑定状态',
      key: 'phone_binding_status',
      width: 120,
      render: (_: any, record: UserWithDetails) => {
        if (record.phone) {
          return <Tag color="green">已绑定</Tag>
        }
        return <Tag color="orange">未绑定</Tag>
      },
    },
    {
      title: '微信 OpenID',
      dataIndex: 'wechat_openid',
      key: 'wechat_openid',
      width: 200,
      ellipsis: true,
      render: (openid: string | null) => openid || '-',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (nickname: string | null) => nickname || '-',
    },
    {
      title: '角色',
      key: 'role',
      width: 100,
      render: (_: any, record: UserWithDetails) => (
        <Tag color={record.role === 'admin' ? 'red' : 'blue'}>
          {record.role === 'admin' ? '管理员' : '用户'}
        </Tag>
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
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: UserWithDetails) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑角色
        </Button>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>用户管理</h2>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <Modal
        title="编辑用户角色"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item name="id" label="用户ID">
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="user">用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
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

