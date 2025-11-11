import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spin } from 'antd'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 如果没有用户，重定向到登录页
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 如果不是管理员，显示无权限提示
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h2>无权限访问</h2>
        <p>您需要管理员权限才能访问此系统</p>
        <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
          当前用户: {user.email} | 角色: 非管理员
        </p>
      </div>
    )
  }

  return <>{children}</>
}

