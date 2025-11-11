import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Spin } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  CommentOutlined,
  DatabaseOutlined,
  StarOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  DollarOutlined,
  SafetyOutlined,
  AccountBookOutlined,
  CreditCardOutlined,
} from '@ant-design/icons'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Masters } from './pages/Masters'
import { Posts } from './pages/Posts'
import { Comments } from './pages/Comments'
import { Users } from './pages/Users'
import { Records } from './pages/Records'
import { Reviews } from './pages/Reviews'
import { Modules } from './pages/Modules'
import { Consultations } from './pages/Consultations'
import { Settlements } from './pages/Settlements'
import { Escrow } from './pages/Escrow'
import { PaymentTransactions } from './pages/PaymentTransactions'
import { RiskControl } from './pages/RiskControl'
import './App.css'

const { Header, Sider, Content } = Layout

const AppLayout: React.FC = () => {
  const { signOut, user } = useAuth()
  const [collapsed, setCollapsed] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/modules',
      icon: <AppstoreOutlined />,
      label: '模块管理',
    },
    {
      key: '/masters',
      icon: <TeamOutlined />,
      label: '卦师管理',
    },
    {
      key: '/posts',
      icon: <FileTextOutlined />,
      label: '帖子管理',
    },
    {
      key: '/comments',
      icon: <CommentOutlined />,
      label: '评论管理',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/records',
      icon: <DatabaseOutlined />,
      label: '占卜记录',
    },
    {
      key: '/reviews',
      icon: <StarOutlined />,
      label: '评价管理',
    },
    {
      key: '/consultations',
      icon: <ShoppingOutlined />,
      label: '咨询订单',
    },
    {
      key: '/settlements',
      icon: <DollarOutlined />,
      label: '结算管理',
    },
    {
      key: '/escrow',
      icon: <AccountBookOutlined />,
      label: '托管账户',
    },
    {
      key: '/payment-transactions',
      icon: <CreditCardOutlined />,
      label: '支付交易',
    },
    {
      key: '/risk-control',
      icon: <SafetyOutlined />,
      label: '风控管理',
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className="logo">
          {!collapsed && <h2 style={{ color: '#fff', margin: 0, padding: '16px' }}>CMS管理</h2>}
          {collapsed && <h2 style={{ color: '#fff', margin: 0, padding: '16px', textAlign: 'center' }}>C</h2>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key)
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>六爻占卜 CMS 管理系统</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>欢迎, {user?.email}</span>
            <Button type="primary" icon={<LogoutOutlined />} onClick={signOut}>
              退出登录
            </Button>
          </div>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', minHeight: 280 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/modules" replace />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/masters" element={<Masters />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/comments" element={<Comments />} />
            <Route path="/users" element={<Users />} />
            <Route path="/records" element={<Records />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/consultations" element={<Consultations />} />
            <Route path="/settlements" element={<Settlements />} />
            <Route path="/escrow" element={<Escrow />} />
            <Route path="/payment-transactions" element={<PaymentTransactions />} />
            <Route path="/risk-control" element={<RiskControl />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

// 根路径重定向组件
const RootRedirect: React.FC = () => {
  const { user, loading, isAdmin } = useAuth()
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />
  }
  
  return <Navigate to="/modules" replace />
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

