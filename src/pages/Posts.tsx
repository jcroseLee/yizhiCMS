import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Select, Checkbox } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Post } from '../types'
import { supabase } from '../lib/supabase'
import type { ColumnsType } from 'antd/es/table'

const SECTION_OPTIONS = [
  { value: 'study', label: '六爻研习' },
  { value: 'help', label: '卦象互助' },
  { value: 'casual', label: '易学闲谈' },
  { value: 'announcement', label: '官方公告' },
]

const STATUS_OPTIONS = [
  { value: 'published', label: '已发布' },
  { value: 'pending', label: '待审核' },
  { value: 'hidden', label: '已隐藏' },
  { value: 'rejected', label: '已拒绝' },
]

export const Posts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [form] = Form.useForm()
  const [users, setUsers] = useState<Array<{ id: string; nickname: string }>>([])
  const [sectionFilter, setSectionFilter] = useState<string | undefined>(undefined)

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nickname')
        .order('created_at', { ascending: false })

      if (!error && profiles) {
        setUsers(profiles.map(p => ({
          id: p.id,
          nickname: p.nickname || '未命名用户',
        })))
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      // 添加分类筛选
      if (sectionFilter) {
        query = query.eq('section', sectionFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setPosts(data || [])
    } catch (error: any) {
      message.error('加载帖子列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 初始化时加载用户列表（只执行一次）
  useEffect(() => {
    loadUsers()
  }, [])

  // 当分类筛选变化时重新加载帖子（包括初始化）
  useEffect(() => {
    loadPosts()
  }, [sectionFilter])

  const handleAdd = () => {
    setEditingPost(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Post) => {
    setEditingPost(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      loadPosts()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingPost) {
        // 编辑时，只更新允许的字段，排除 user_id 和统计字段
        const updateData: any = {
          title: values.title,
          content: values.content,
        }
        
        // 可选字段
        if (values.content_html !== undefined) {
          updateData.content_html = values.content_html || null
        }
        
        // 如果数据库有这些列，才添加（向后兼容）
        if (values.section !== undefined) {
          updateData.section = values.section
        }
        if (values.status !== undefined) {
          updateData.status = values.status
        }
        if (values.is_pinned !== undefined) {
          updateData.is_pinned = values.is_pinned || false
        }
        if (values.is_featured !== undefined) {
          updateData.is_featured = values.is_featured || false
        }
        
        const { error } = await supabase
          .from('posts')
          .update(updateData)
          .eq('id', editingPost.id)

        if (error) {
          // 获取完整的错误信息
          const errorObj = error as any
          const errorMsg = errorObj.message || errorObj.error || errorObj.hint || JSON.stringify(errorObj) || ''
          const errorCode = errorObj.code || errorObj.statusCode || ''
          const errorDetails = errorObj.details || ''
          
          console.error('Full update error:', {
            error,
            errorMsg,
            errorCode,
            errorDetails,
            updateData,
            errorString: JSON.stringify(errorObj, null, 2)
          })
          
          // 检查是否是列不存在的错误
          // PGRST204 是 PostgREST 的"列不存在"错误代码
          const errorMsgLower = errorMsg.toLowerCase()
          const hasColumnError = errorMsgLower.includes('column') || 
                                errorCode === '42703' || 
                                errorCode === 'PGRST204' ||
                                errorMsgLower.includes('does not exist') ||
                                errorMsgLower.includes('undefined column') ||
                                errorMsgLower.includes('could not find') ||
                                errorMsgLower.includes('schema cache')
          
          // 检查是否是新添加的列导致的错误
          const isNewColumnError = hasColumnError && (
            errorMsgLower.includes('section') || 
            errorMsgLower.includes('status') || 
            errorMsgLower.includes('is_pinned') || 
            errorMsgLower.includes('is_featured') ||
            errorMsgLower.includes('content_html')
          )
          
          if (isNewColumnError) {
            console.warn('Some columns missing, updating with minimal fields only')
            
            // 只更新最核心的字段：title 和 content
            const minimalUpdateData: any = {
              title: values.title,
              content: values.content,
            }
            
            // 尝试添加 content_html（如果数据库有这个列）
            if (values.content_html !== undefined && values.content_html !== null && values.content_html !== '') {
              // 先尝试包含 content_html
              const { error: withHtmlError } = await supabase
                .from('posts')
                .update({ ...minimalUpdateData, content_html: values.content_html })
                .eq('id', editingPost.id)
              
              if (!withHtmlError) {
                message.success('更新成功（部分字段因数据库限制未更新）')
                return
              }
              
              // 记录 content_html 错误
              const htmlErrorMsg = (withHtmlError as any)?.message || JSON.stringify(withHtmlError) || ''
              console.warn('content_html update failed:', { withHtmlError, htmlErrorMsg })
              
              // 如果 content_html 也有问题，回退到只更新 title 和 content
              if (htmlErrorMsg.toLowerCase().includes('content_html') || (withHtmlError as any)?.code === '42703') {
                console.warn('content_html column also missing, updating only title and content')
              } else {
                // 如果 content_html 的错误不是列不存在，说明是其他问题，抛出原始错误
                console.error('content_html error is not column-related:', withHtmlError)
                throw withHtmlError
              }
            }
            
            // 使用最少的字段更新（只有 title 和 content）
            console.log('Attempting minimal update with:', minimalUpdateData)
            const { error: minimalError } = await supabase
              .from('posts')
              .update(minimalUpdateData)
              .eq('id', editingPost.id)
            
            if (minimalError) {
              const minimalErrorMsg = (minimalError as any)?.message || JSON.stringify(minimalError) || '未知错误'
              const minimalErrorCode = (minimalError as any)?.code || 'N/A'
              console.error('Minimal update also failed:', {
                minimalError,
                minimalErrorMsg,
                minimalErrorCode,
                minimalUpdateData
              })
              throw new Error(`更新失败: ${minimalErrorMsg}。错误代码: ${minimalErrorCode}`)
            }
            message.success('更新成功（部分字段因数据库限制未更新）')
          } else {
            // 不是列不存在的错误，直接抛出
            console.error('Update error (not column-related):', error)
            throw new Error(`更新失败: ${errorMsg}。错误代码: ${errorCode}`)
          }
        } else {
          message.success('更新成功')
        }
      } else {
        // 创建新帖子
        if (!values.user_id) {
          message.error('请选择用户')
          return
        }

        const insertData: any = {
          user_id: values.user_id,
          title: values.title,
          content: values.content,
          view_count: 0,
          like_count: 0,
          comment_count: 0,
        }
        
        // 可选字段
        if (values.content_html) {
          insertData.content_html = values.content_html
        }
        
        // 如果数据库有这些列，才添加（向后兼容）
        if (values.section) {
          insertData.section = values.section
        }
        if (values.status) {
          insertData.status = values.status
        }
        if (values.is_pinned !== undefined) {
          insertData.is_pinned = values.is_pinned || false
        }
        if (values.is_featured !== undefined) {
          insertData.is_featured = values.is_featured || false
        }

        const { error } = await supabase
          .from('posts')
          .insert(insertData)

        if (error) {
          // 如果是因为列不存在而失败，尝试回退到基本字段
          const errorMsg = error.message || ''
          if (errorMsg.includes('column') && (errorMsg.includes('section') || errorMsg.includes('status') || errorMsg.includes('is_pinned') || errorMsg.includes('is_featured'))) {
            console.warn('Some columns missing, creating with basic fields only')
            const basicInsertData = {
              user_id: values.user_id,
              title: values.title,
              content: values.content,
              content_html: values.content_html || null,
              view_count: 0,
              like_count: 0,
              comment_count: 0,
            }
            const { error: basicError } = await supabase
              .from('posts')
              .insert(basicInsertData)
            
            if (basicError) throw basicError
            message.success('创建成功（部分字段因数据库限制未设置）')
          } else {
            throw error
          }
        } else {
          message.success('创建成功')
        }
      }

      setModalVisible(false)
      loadPosts()
    } catch (error: any) {
      console.error('Save error:', error)
      message.error('保存失败: ' + (error.message || '未知错误'))
    }
  }

  const columns: ColumnsType<Post> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'section',
      key: 'section',
      width: 120,
      render: (section: string) => {
        const option = SECTION_OPTIONS.find(opt => opt.value === section)
        return option ? option.label : section || '未分类'
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const option = STATUS_OPTIONS.find(opt => opt.value === status)
        return option ? option.label : status || '已发布'
      },
    },
    {
      title: '置顶',
      dataIndex: 'is_pinned',
      key: 'is_pinned',
      width: 60,
      render: (isPinned: boolean) => isPinned ? '是' : '否',
    },
    {
      title: '精选',
      dataIndex: 'is_featured',
      key: 'is_featured',
      width: 60,
      render: (isFeatured: boolean) => isFeatured ? '是' : '否',
    },
    {
      title: '浏览量',
      dataIndex: 'view_count',
      key: 'view_count',
      width: 80,
    },
    {
      title: '点赞数',
      dataIndex: 'like_count',
      key: 'like_count',
      width: 80,
    },
    {
      title: '评论数',
      dataIndex: 'comment_count',
      key: 'comment_count',
      width: 80,
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
      render: (_: any, record: Post) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个帖子吗？"
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>帖子管理</h2>
        <Space>
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 150 }}
            value={sectionFilter}
            onChange={(value) => setSectionFilter(value)}
            options={SECTION_OPTIONS}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加帖子
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={posts}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingPost ? '编辑帖子' : '添加帖子'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingPost && (
            <Form.Item
              name="user_id"
              label="用户"
              rules={[{ required: true, message: '请选择用户' }]}
            >
              <Select
                placeholder="请选择用户"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={users.map(u => ({
                  value: u.id,
                  label: `${u.nickname} (${u.id.substring(0, 8)}...)`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="section"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select
              placeholder="请选择分类"
              options={SECTION_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="published"
          >
            <Select
              placeholder="请选择状态"
              options={STATUS_OPTIONS}
            />
          </Form.Item>

          <Form.Item name="is_pinned" valuePropName="checked">
            <Checkbox>置顶</Checkbox>
          </Form.Item>

          <Form.Item name="is_featured" valuePropName="checked">
            <Checkbox>精选</Checkbox>
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>

          <Form.Item name="content_html" label="HTML内容（可选）">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPost ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

