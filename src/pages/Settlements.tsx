import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Select, Statistic, Row, Col } from 'antd'
import { MasterSettlement } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

export const Settlements: React.FC = () => {
  const [settlements, setSettlements] = useState<MasterSettlement[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    totalFee: 0,
    totalPayout: 0,
    pendingCount: 0,
    completedCount: 0,
  })

  useEffect(() => {
    loadSettlements()
  }, [statusFilter])

  const loadSettlements = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('master_settlements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('settlement_status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const settlementsData = data || []
      setSettlements(settlementsData)

      // Calculate statistics
      const stats = settlementsData.reduce(
        (acc, s) => {
          acc.totalAmount += Number(s.total_amount || 0)
          acc.totalFee += Number(s.platform_fee_amount || 0)
          acc.totalPayout += Number(s.payout_amount || 0)
          if (s.settlement_status === 'pending') acc.pendingCount++
          if (s.settlement_status === 'completed') acc.completedCount++
          return acc
        },
        {
          totalAmount: 0,
          totalFee: 0,
          totalPayout: 0,
          pendingCount: 0,
          completedCount: 0,
        }
      )

      setStatistics(stats)
    } catch (error: any) {
      message.error('加载结算记录失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status: MasterSettlement['settlement_status']) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待结算', color: 'orange' },
      processing: { text: '处理中', color: 'blue' },
      completed: { text: '已完成', color: 'green' },
      failed: { text: '失败', color: 'red' },
    }
    const info = statusMap[status] || { text: status, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns: ColumnsType<MasterSettlement> = [
    {
      title: '结算ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '卦师ID',
      dataIndex: 'master_id',
      key: 'master_id',
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
      title: '订单总额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '平台服务费',
      dataIndex: 'platform_fee_amount',
      key: 'platform_fee_amount',
      width: 120,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '结算金额',
      dataIndex: 'payout_amount',
      key: 'payout_amount',
      width: 120,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '结算状态',
      dataIndex: 'settlement_status',
      key: 'settlement_status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '打款方式',
      dataIndex: 'payout_method',
      key: 'payout_method',
      width: 100,
      render: (method: MasterSettlement['payout_method']) => method || '-',
    },
    {
      title: '打款账户',
      dataIndex: 'payout_account',
      key: 'payout_account',
      width: 150,
      ellipsis: true,
      render: (account: string | null) => account || '-',
    },
    {
      title: '交易单号',
      dataIndex: 'payout_transaction_no',
      key: 'payout_transaction_no',
      width: 200,
      ellipsis: true,
      render: (no: string | null) => no || '-',
    },
    {
      title: '失败原因',
      dataIndex: 'failure_reason',
      key: 'failure_reason',
      width: 200,
      ellipsis: true,
      render: (reason: string | null) => reason || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (text: string | null) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>结算管理</h2>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
        >
          <Select.Option value="all">全部状态</Select.Option>
          <Select.Option value="pending">待结算</Select.Option>
          <Select.Option value="processing">处理中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
          <Select.Option value="failed">失败</Select.Option>
        </Select>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic title="订单总额" value={statistics.totalAmount} precision={2} prefix="¥" />
        </Col>
        <Col span={6}>
          <Statistic title="平台服务费" value={statistics.totalFee} precision={2} prefix="¥" />
        </Col>
        <Col span={6}>
          <Statistic title="结算总额" value={statistics.totalPayout} precision={2} prefix="¥" />
        </Col>
        <Col span={6}>
          <Statistic
            title="待结算/已完成"
            value={`${statistics.pendingCount} / ${statistics.completedCount}`}
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={settlements}
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

