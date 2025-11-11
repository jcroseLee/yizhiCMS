import React, { useEffect, useState } from 'react'
import { Table, Button, Space, message, Popconfirm, Modal, Descriptions, Tag } from 'antd'
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { DivinationRecord } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

export const Records: React.FC = () => {
  const [records, setRecords] = useState<DivinationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<DivinationRecord | null>(null)

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('divination_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setRecords(data || [])
    } catch (error: any) {
      message.error('加载占卜记录失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (record: DivinationRecord) => {
    setSelectedRecord(record)
    setDetailVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('divination_records')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadRecords()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const columns: ColumnsType<DivinationRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
    },
    {
      title: '占卜时间',
      dataIndex: 'divination_time',
      key: 'divination_time',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: '本卦',
      dataIndex: 'original_key',
      key: 'original_key',
    },
    {
      title: '变卦',
      dataIndex: 'changed_key',
      key: 'changed_key',
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
      render: (_: any, record: DivinationRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗？"
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
      <h2 style={{ marginBottom: 16 }}>占卜记录管理</h2>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 50 }}
      />

      <Modal
        title="占卜记录详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">{selectedRecord.id}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedRecord.user_id || '未关联用户'}</Descriptions.Item>
            <Descriptions.Item label="问题">{selectedRecord.question || '未填写'}</Descriptions.Item>
            <Descriptions.Item label="占卜时间">
              {new Date(selectedRecord.divination_time).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="占卜方法">
              {selectedRecord.method === 1 ? '硬币法' : selectedRecord.method === 2 ? '数字法' : '其他'}
            </Descriptions.Item>
            <Descriptions.Item label="六爻">
              {selectedRecord.lines?.map((line, index) => (
                <Tag key={index} style={{ marginBottom: 4 }}>
                  {line}
                </Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="变爻标记">
              {selectedRecord.changing_flags?.map((flag, index) => (
                <Tag key={index} color={flag ? 'red' : 'default'} style={{ marginBottom: 4 }}>
                  {index + 1}爻: {flag ? '变' : '不变'}
                </Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="本卦">{selectedRecord.original_key}</Descriptions.Item>
            <Descriptions.Item label="变卦">{selectedRecord.changed_key}</Descriptions.Item>
            <Descriptions.Item label="本卦JSON">
              <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8 }}>
                {JSON.stringify(selectedRecord.original_json, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="变卦JSON">
              <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8 }}>
                {JSON.stringify(selectedRecord.changed_json, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

