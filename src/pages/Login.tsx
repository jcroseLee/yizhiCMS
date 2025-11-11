import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import './Login.css'

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { signIn, user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // 如果已登录且是管理员，重定向到首页
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      const from = (location.state as any)?.from?.pathname || '/modules'
      navigate(from, { replace: true })
    }
  }, [user, isAdmin, authLoading, navigate, location])

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await signIn(values.email, values.password)
      message.success('登录成功')
      // 登录成功后，导航到之前尝试访问的页面，或默认到 /modules
      const from = (location.state as any)?.from?.pathname || '/modules'
      navigate(from, { replace: true })
    } catch (error: any) {
      message.error(error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 如果正在检查认证状态，显示加载中
  if (authLoading) {
    return (
      <div className="login-container">
        <Card className="login-card">
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        </Card>
      </div>
    )
  }

  // 如果已登录，不显示登录表单（会被上面的 useEffect 重定向）
  if (user && isAdmin) {
    return null
  }

  return (
    <div className="login-container">
      <Card title="六爻占卜 CMS 管理系统" className="login-card">
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

