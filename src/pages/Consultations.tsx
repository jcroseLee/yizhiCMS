import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, message, Modal, Descriptions, Select, DatePicker } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { Consultation } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

export const Consultations: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)

  useEffect(() => {
    loadConsultations()
  }, [statusFilter, dateRange])

  const loadConsultations = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('consultations')
        .select(`
          *,
          profiles!consultations_user_id_fkey(id, phone, nickname, wechat_openid)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (dateRange) {
        const [start, end] = dateRange
        query = query
          .gte('created_at', start.startOf('day').toISOString())
          .lte('created_at', end.endOf('day').toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setConsultations(data || [])
    } catch (error: any) {
      message.error('加载订单列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setDetailModalVisible(true)
  }

  const getStatusTag = (status: Consultation['status']) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending_payment: { text: '待支付', color: 'orange' },
      awaiting_master: { text: '待接单', color: 'blue' },
      in_progress: { text: '咨询中', color: 'green' },
      pending_settlement: { text: '待结算', color: 'purple' },
      completed: { text: '已完成', color: 'success' },
      cancelled: { text: '已取消', color: 'default' },
      refunded: { text: '已退款', color: 'red' },
      timeout_cancelled: { text: '超时取消', color: 'default' },
    }
    const info = statusMap[status] || { text: status, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getPaymentStatusTag = (status: Consultation['payment_status']) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      unpaid: { text: '未支付', color: 'default' },
      pending: { text: '支付中', color: 'orange' },
      paid: { text: '已支付', color: 'green' },
      refunded: { text: '已退款', color: 'red' },
      failed: { text: '支付失败', color: 'red' },
    }
    const info = statusMap[status] || { text: status, color: 'default' }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns: ColumnsType<Consultation> = [
    {
      title: '订单ID',
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
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '用户手机号绑定',
      key: 'user_phone_binding',
      width: 130,
      render: (_: any, record: any) => {
        const profile = record.profiles
        if (!profile) return <Tag color="default">未知</Tag>
        if (profile.phone) {
          return <Tag color="green">已绑定</Tag>
        }
        return <Tag color="orange">未绑定</Tag>
      },
    },
    {
      title: '问题摘要',
      dataIndex: 'question_summary',
      key: 'question_summary',
      ellipsis: true,
      render: (text: string | null) => text || '-',
    },
    {
      title: '金额',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => `¥${(price ?? 0).toFixed(2)}`,
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method: Consultation['payment_method']) => {
        if (!method) return '-'
        return <Tag>{method === 'wechat' ? '微信支付' : '余额支付'}</Tag>
      },
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 100,
      render: getPaymentStatusTag,
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: getStatusTag,
    },
    {
      title: '结算状态',
      dataIndex: 'settlement_status',
      key: 'settlement_status',
      width: 100,
      render: (status: Consultation['settlement_status']) => {
        if (!status) return '-'
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '待结算', color: 'orange' },
          settled: { text: '已结算', color: 'green' },
          cancelled: { text: '已取消', color: 'default' },
        }
        const info = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '评价状态',
      key: 'review',
      width: 120,
      render: (_: any, record: Consultation) => {
        if (!record.review_required) return '-'
        return record.review_submitted ? (
          <Tag color="green">已评价</Tag>
        ) : (
          <Tag color="orange">待评价</Tag>
        )
      },
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
      render: (_: any, record: Consultation) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>咨询订单管理</h2>
        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="pending_payment">待支付</Select.Option>
            <Select.Option value="awaiting_master">待接单</Select.Option>
            <Select.Option value="in_progress">咨询中</Select.Option>
            <Select.Option value="pending_settlement">待结算</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="refunded">已退款</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            format="YYYY-MM-DD"
          />
          <Button onClick={loadConsultations}>刷新</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={consultations}
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
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedConsultation && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="订单ID" span={2}>
              {selectedConsultation.id}
            </Descriptions.Item>
            <Descriptions.Item label="卦师ID">{selectedConsultation.master_id}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedConsultation.user_id}</Descriptions.Item>
            <Descriptions.Item label="用户手机号绑定">
              {(selectedConsultation as any).profiles?.phone ? (
                <Tag color="green">已绑定: {(selectedConsultation as any).profiles.phone}</Tag>
              ) : (
                <Tag color="orange">未绑定</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="服务ID">{selectedConsultation.service_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="订单状态">{getStatusTag(selectedConsultation.status)}</Descriptions.Item>
            <Descriptions.Item label="支付方式">
              {selectedConsultation.payment_method ? (
                <Tag>{selectedConsultation.payment_method === 'wechat' ? '微信支付' : '余额支付'}</Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="支付状态">{getPaymentStatusTag(selectedConsultation.payment_status)}</Descriptions.Item>
            <Descriptions.Item label="订单金额">¥{selectedConsultation.price.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="问题描述" span={2}>
              {selectedConsultation.question || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结算状态">
              {selectedConsultation.settlement_status ? (
                <Tag color={selectedConsultation.settlement_status === 'settled' ? 'green' : 'orange'}>
                  {selectedConsultation.settlement_status === 'settled' ? '已结算' : '待结算'}
                </Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="平台服务费">
              {selectedConsultation.platform_fee_amount
                ? `¥${selectedConsultation.platform_fee_amount.toFixed(2)} (${((selectedConsultation.platform_fee_rate || 0) * 100).toFixed(1)}%)`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="卦师结算金额">
              {selectedConsultation.master_payout_amount
                ? `¥${selectedConsultation.master_payout_amount.toFixed(2)}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="计划结算时间">
              {selectedConsultation.settlement_scheduled_at
                ? new Date(selectedConsultation.settlement_scheduled_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="实际结算时间">
              {selectedConsultation.settlement_completed_at
                ? new Date(selectedConsultation.settlement_completed_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="评价状态">
              {selectedConsultation.review_required ? (
                selectedConsultation.review_submitted ? (
                  <Tag color="green">已评价</Tag>
                ) : (
                  <Tag color="orange">待评价</Tag>
                )
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="评价ID">{selectedConsultation.review_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedConsultation.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedConsultation.updated_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="过期时间">
              {selectedConsultation.expires_at
                ? new Date(selectedConsultation.expires_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

