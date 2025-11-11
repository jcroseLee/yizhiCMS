import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Select, Statistic, Row, Col } from 'antd'
import { PlatformEscrow } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

export const Escrow: React.FC = () => {
  const [escrows, setEscrows] = useState<PlatformEscrow[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statistics, setStatistics] = useState({
    totalHeld: 0,
    totalReleased: 0,
    totalRefunded: 0,
  })

  useEffect(() => {
    loadEscrows()
  }, [statusFilter])

  const loadEscrows = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('platform_escrow')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        // Provide more helpful error messages
        if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('Not Found')) {
          throw new Error('平台托管账户表不存在。请确保已运行数据库迁移：20250131_ensure_platform_escrow.sql')
        }
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          throw new Error('权限不足。请确保您已登录为管理员账户。')
        }
        throw error
      }

      const escrowsData = data || []
      setEscrows(escrowsData)

      // Calculate statistics
      const stats = escrowsData.reduce(
        (acc, e) => {
          const amount = Number(e.amount || 0)
          if (e.status === 'held') acc.totalHeld += amount
          if (e.status === 'released') acc.totalReleased += amount
          if (e.status === 'refunded') acc.totalRefunded += amount
          return acc
        },
        {
          totalHeld: 0,
          totalReleased: 0,
          totalRefunded: 0,
        }
      )

      setStatistics(stats)
    } catch (error: any) {
      message.error('加载托管账户记录失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status: PlatformEscrow['status']) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      held: { text: '托管中', color: 'blue' },
      released: { text: '已释放', color: 'green' },
      refunded: { text: '已退款', color: 'red' },
    }
    const info = statusMap[status] || { text: status, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns: ColumnsType<PlatformEscrow> = [
    {
      title: '托管ID',
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
      title: '托管金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '托管时间',
      dataIndex: 'held_at',
      key: 'held_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '释放时间',
      dataIndex: 'released_at',
      key: 'released_at',
      width: 180,
      render: (text: string | null) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>托管账户管理</h2>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
        >
          <Select.Option value="all">全部状态</Select.Option>
          <Select.Option value="held">托管中</Select.Option>
          <Select.Option value="released">已释放</Select.Option>
          <Select.Option value="refunded">已退款</Select.Option>
        </Select>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Statistic title="托管中总额" value={statistics.totalHeld} precision={2} prefix="¥" />
        </Col>
        <Col span={8}>
          <Statistic title="已释放总额" value={statistics.totalReleased} precision={2} prefix="¥" />
        </Col>
        <Col span={8}>
          <Statistic title="已退款总额" value={statistics.totalRefunded} precision={2} prefix="¥" />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={escrows}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />
    </div>
  )
}

