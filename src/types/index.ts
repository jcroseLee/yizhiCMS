export interface Master {
  id: string
  user_id: string
  name: string
  title: string | null
  certification: string | null
  rating: number
  reviews_count: number
  experience_years: number
  expertise: string[]
  avatar_url: string | null
  highlight: string | null
  description: string | null
  achievements: string[]
  service_types: string[]
  is_active: boolean
  online_status: 'online' | 'busy' | 'offline'
  min_price: number
  orders_30d?: number // 近30天接单量（计算字段）
  created_at: string
  updated_at: string
}

export interface MasterService {
  id: string
  master_id: string
  name: string
  price: number
  service_type: '图文' | '语音'
  description: string | null
  is_active: boolean
  order_index: number
  consultation_duration_minutes?: number | null
  consultation_session_count?: number | null
  requires_birth_info?: boolean
  question_min_length?: number | null
  question_max_length?: number | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  title: string
  content: string
  content_html: string | null
  section?: 'study' | 'help' | 'casual' | 'announcement'
  status?: 'published' | 'pending' | 'hidden' | 'rejected'
  is_pinned?: boolean
  is_featured?: boolean
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  like_count: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email?: string
  user_metadata?: {
    nickname?: string
    avatar_url?: string
  }
  created_at: string
}

export interface DivinationRecord {
  id: string
  user_id: string | null
  question: string | null
  divination_time: string
  method: number
  lines: string[]
  changing_flags: boolean[]
  original_key: string
  changed_key: string
  original_json: any
  changed_json: any
  created_at: string
}

export interface MasterReview {
  id: string
  master_id: string
  user_id: string
  rating: number
  content: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Consultation {
  id: string
  master_id: string
  user_id: string
  service_id: string | null
  status: 'pending_payment' | 'awaiting_master' | 'in_progress' | 'pending_settlement' | 'completed' | 'cancelled' | 'refunded' | 'timeout_cancelled'
  payment_method: 'wechat' | 'balance' | null
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed'
  price: number
  question: string
  question_summary: string | null
  settlement_status: 'pending' | 'settled' | 'cancelled' | null
  settlement_scheduled_at: string | null
  settlement_completed_at: string | null
  platform_fee_rate: number | null
  platform_fee_amount: number | null
  master_payout_amount: number | null
  review_required: boolean
  review_submitted: boolean
  review_id: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
}

export interface PaymentTransaction {
  id: string
  consultation_id: string
  user_id: string
  provider: 'wechat'
  provider_trade_no: string | null
  amount: number
  status: 'pending' | 'prepay_created' | 'paid' | 'refunded' | 'failed'
  raw_response: any
  created_at: string
  updated_at: string
}

export interface MasterSettlement {
  id: string
  master_id: string
  consultation_id: string
  total_amount: number
  platform_fee_amount: number
  payout_amount: number
  settlement_status: 'pending' | 'processing' | 'completed' | 'failed'
  payout_method: 'wechat' | 'bank' | 'alipay' | null
  payout_account: string | null
  payout_transaction_no: string | null
  failure_reason: string | null
  created_at: string
  completed_at: string | null
  updated_at: string
}

export interface PlatformEscrow {
  id: string
  consultation_id: string
  amount: number
  status: 'held' | 'released' | 'refunded'
  held_at: string
  released_at: string | null
  created_at: string
}

export interface RiskControlViolation {
  id: string
  consultation_id: string
  user_id: string
  violation_type: 'private_transaction' | 'inappropriate_content' | 'spam'
  detected_content: string
  message_id: string | null
  action_taken: 'warning' | 'blocked' | 'reported' | null
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
}

