import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Select, Button, Modal, Descriptions, Space } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { RiskControlViolation } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ColumnsType } from 'antd/es/table'

export const RiskControl: React.FC = () => {
  const [violations, setViolations] = useState<RiskControlViolation[]>([])
  const [loading, setLoading] = useState(false)
  const [resolvedFilter, setResolvedFilter] = useState<string>('all')
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedViolation, setSelectedViolation] = useState<RiskControlViolation | null>(null)
  const { user, isAdmin } = useAuth()

  useEffect(() => {
    if (user && isAdmin) {
      loadViolations()
    }
  }, [resolvedFilter, user, isAdmin])

  const loadViolations = async () => {
    if (!user || !isAdmin) {
      message.warning('需要管理员权限才能查看风控违规记录')
      return
    }

    setLoading(true)
    try {
      // Verify session is active
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('未登录或会话已过期，请重新登录')
      }

      let query = supabase
        .from('risk_control_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (resolvedFilter === 'resolved') {
        query = query.eq('is_resolved', true)
      } else if (resolvedFilter === 'unresolved') {
        query = query.eq('is_resolved', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      setViolations(data || [])
    } catch (error: any) {
      console.error('Error loading violations:', error)
      const errorMessage = error.message || error.error_description || '未知错误'
      const errorDetails = error.details ? ` (${error.details})` : ''
      const errorHint = error.code === 'PGRST301' 
        ? ' - 可能是权限不足或表不存在，请检查数据库迁移是否已应用'
        : error.code === '42501'
        ? ' - 权限不足，请确认您有管理员角色'
        : ''
      message.error(`加载风控违规记录失败: ${errorMessage}${errorDetails}${errorHint}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id: string) => {
    if (!user || !isAdmin) {
      message.warning('需要管理员权限才能处理违规记录')
      return
    }

    try {
      const { error } = await supabase
        .from('risk_control_violations')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('Update error:', error)
        throw error
      }
      message.success('已标记为已处理')
      loadViolations()
    } catch (error: any) {
      console.error('Error resolving violation:', error)
      const errorMessage = error.message || error.error_description || '未知错误'
      message.error(`处理失败: ${errorMessage}`)
    }
  }

  const handleViewDetail = (violation: RiskControlViolation) => {
    setSelectedViolation(violation)
    setDetailModalVisible(true)
  }

  const getViolationTypeTag = (type: RiskControlViolation['violation_type']) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      private_transaction: { text: '私下交易', color: 'red' },
      inappropriate_content: { text: '不当内容', color: 'orange' },
      spam: { text: '垃圾信息', color: 'default' },
    }
    const info = typeMap[type] || { text: type, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getActionTag = (action: RiskControlViolation['action_taken']) => {
    if (!action) return '-'
    const actionMap: Record<string, { text: string; color: string }> = {
      warning: { text: '警告', color: 'orange' },
      blocked: { text: '已屏蔽', color: 'red' },
      reported: { text: '已举报', color: 'purple' },
    }
    const info = actionMap[action] || { text: action, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns: ColumnsType<RiskControlViolation> = [
    {
      title: '违规ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '订单ID',
      dataIndex: 'consultation_id',
      key: 'consultation_id',
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
      title: '违规类型',
      dataIndex: 'violation_type',
      key: 'violation_type',
      width: 120,
      render: getViolationTypeTag,
    },
    {
      title: '违规内容',
      dataIndex: 'detected_content',
      key: 'detected_content',
      ellipsis: true,
      render: (text: string) => (text.length > 50 ? `${text.substring(0, 50)}...` : text),
    },
    {
      title: '处理措施',
      dataIndex: 'action_taken',
      key: 'action_taken',
      width: 100,
      render: getActionTag,
    },
    {
      title: '处理状态',
      dataIndex: 'is_resolved',
      key: 'is_resolved',
      width: 100,
      render: (resolved: boolean) => (
        <Tag color={resolved ? 'green' : 'orange'}>{resolved ? '已处理' : '待处理'}</Tag>
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
      render: (_: any, record: RiskControlViolation) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {!record.is_resolved && (
            <Button
              type="link"
              onClick={() => handleResolve(record.id)}
            >
              标记已处理
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>风控违规记录</h2>
        <Select
          value={resolvedFilter}
          onChange={setResolvedFilter}
          style={{ width: 150 }}
        >
          <Select.Option value="all">全部</Select.Option>
          <Select.Option value="unresolved">待处理</Select.Option>
          <Select.Option value="resolved">已处理</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={violations}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <Modal
        title="违规详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedViolation && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="违规ID" span={2}>
              {selectedViolation.id}
            </Descriptions.Item>
            <Descriptions.Item label="订单ID">{selectedViolation.consultation_id}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedViolation.user_id}</Descriptions.Item>
            <Descriptions.Item label="违规类型">{getViolationTypeTag(selectedViolation.violation_type)}</Descriptions.Item>
            <Descriptions.Item label="处理措施">{getActionTag(selectedViolation.action_taken)}</Descriptions.Item>
            <Descriptions.Item label="处理状态">
              <Tag color={selectedViolation.is_resolved ? 'green' : 'orange'}>
                {selectedViolation.is_resolved ? '已处理' : '待处理'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="消息ID">{selectedViolation.message_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="违规内容" span={2}>
              {selectedViolation.detected_content}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedViolation.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="处理时间">
              {selectedViolation.resolved_at
                ? new Date(selectedViolation.resolved_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

