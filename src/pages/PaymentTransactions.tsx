import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Select, Statistic, Row, Col } from 'antd'
import { PaymentTransaction } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

export const PaymentTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    paidAmount: 0,
    refundedAmount: 0,
    pendingCount: 0,
    paidCount: 0,
    failedCount: 0,
  })

  useEffect(() => {
    loadTransactions()
  }, [statusFilter])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const transactionsData = data || []
      setTransactions(transactionsData)

      // Calculate statistics
      const stats = transactionsData.reduce(
        (acc, t) => {
          acc.totalAmount += Number(t.amount || 0)
          if (t.status === 'paid') {
            acc.paidAmount += Number(t.amount || 0)
            acc.paidCount++
          }
          if (t.status === 'refunded') {
            acc.refundedAmount += Number(t.amount || 0)
          }
          if (t.status === 'pending' || t.status === 'prepay_created') {
            acc.pendingCount++
          }
          if (t.status === 'failed') {
            acc.failedCount++
          }
          return acc
        },
        {
          totalAmount: 0,
          paidAmount: 0,
          refundedAmount: 0,
          pendingCount: 0,
          paidCount: 0,
          failedCount: 0,
        }
      )

      setStatistics(stats)
    } catch (error: any) {
      message.error('加载支付交易记录失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status: PaymentTransaction['status']) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待支付', color: 'orange' },
      prepay_created: { text: '预支付已创建', color: 'blue' },
      paid: { text: '已支付', color: 'green' },
      refunded: { text: '已退款', color: 'purple' },
      failed: { text: '失败', color: 'red' },
    }
    const info = statusMap[status] || { text: status, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getProviderTag = (provider: PaymentTransaction['provider']) => {
    const providerMap: Record<string, { text: string; color: string }> = {
      wechat: { text: '微信支付', color: 'green' },
    }
    const info = providerMap[provider] || { text: provider, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns: ColumnsType<PaymentTransaction> = [
    {
      title: '交易ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '咨询订单ID',
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
      title: '支付方式',
      dataIndex: 'provider',
      key: 'provider',
      width: 100,
      render: getProviderTag,
    },
    {
      title: '交易金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '交易状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: getStatusTag,
    },
    {
      title: '第三方交易号',
      dataIndex: 'provider_trade_no',
      key: 'provider_trade_no',
      width: 200,
      ellipsis: true,
      render: (no: string | null) => no || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>支付交易管理</h2>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
        >
          <Select.Option value="all">全部状态</Select.Option>
          <Select.Option value="pending">待支付</Select.Option>
          <Select.Option value="prepay_created">预支付已创建</Select.Option>
          <Select.Option value="paid">已支付</Select.Option>
          <Select.Option value="refunded">已退款</Select.Option>
          <Select.Option value="failed">失败</Select.Option>
        </Select>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic title="总交易金额" value={statistics.totalAmount} precision={2} prefix="¥" />
        </Col>
        <Col span={6}>
          <Statistic title="已支付金额" value={statistics.paidAmount} precision={2} prefix="¥" />
        </Col>
        <Col span={6}>
          <Statistic title="已退款金额" value={statistics.refundedAmount} precision={2} prefix="¥" />
        </Col>
        <Col span={6}>
          <Statistic
            title="待支付/已支付/失败"
            value={`${statistics.pendingCount} / ${statistics.paidCount} / ${statistics.failedCount}`}
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={transactions}
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

