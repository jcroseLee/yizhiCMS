# 六爻占卜 CMS 管理系统

PC端内容管理系统，用于管理六爻占卜应用的所有数据和功能模块。

## 功能特性

### 1. 模块管理
- 添加、编辑、删除功能模块
- 启用/禁用功能模块
- 设置模块排序顺序
- 默认模块包括：占卜功能、社区功能、卦师功能、消息功能、记录功能

### 2. 卦师管理
- 添加新卦师（关联现有用户）
- 编辑卦师信息（姓名、称号、认证、从业年限、擅长领域等）
- 删除卦师
- 查看卦师状态（启用/禁用）
- 查看评分和评价数

### 3. 用户管理
- 查看所有用户列表
- 修改用户角色（用户/管理员）
- 查看用户基本信息

### 4. 帖子管理
- 创建新帖子
- 编辑帖子内容
- 删除帖子
- 查看帖子统计数据（浏览量、点赞数、评论数）

### 5. 评论管理
- 编辑评论内容
- 删除评论
- 查看评论点赞数

### 6. 占卜记录管理
- 查看所有占卜记录
- 查看记录详情（包括六爻、变爻、本卦、变卦等完整信息）
- 删除占卜记录
- 支持分页浏览

### 7. 评价管理
- 编辑评价内容、评分、标签
- 删除评价
- 查看评价详情

### 8. 咨询订单管理
- 查看所有咨询订单列表
- 按状态筛选订单（待支付、待接单、咨询中、待结算、已完成等）
- 按日期范围筛选订单
- 查看订单详情（包括问题描述、支付信息、结算信息等）
- 查看订单状态流转记录

### 9. 结算管理
- 查看所有结算记录
- 按结算状态筛选（待结算、处理中、已完成、失败）
- 查看结算统计（订单总额、平台服务费、结算总额等）
- 查看结算详情（包括打款方式、打款账户、交易单号等）

### 10. 托管账户管理
- 查看所有资金托管记录
- 按状态筛选（托管中、已释放、已退款）
- 查看托管统计（托管中总额、已释放总额、已退款总额）
- 监控资金流向

### 11. 支付交易记录
- 查看所有支付交易记录
- 按交易状态筛选（待处理、预支付已创建、已支付、已退款、失败）
- 查看交易详情（包括商户订单号、交易金额、支付渠道等）

### 12. 风控管理
- 查看所有风控违规记录
- 按处理状态筛选（待处理、已处理）
- 查看违规详情（违规类型、违规内容、处理措施等）
- 标记违规记录为已处理

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5
- **路由**: React Router 6
- **后端**: Supabase (PostgreSQL + Auth)
- **构建工具**: Vite

## 环境配置

1. 复制环境变量文件：
```bash
cp env.example .env
```

2. 配置环境变量：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 安装依赖

```bash
cd cms
npm install
# 或
pnpm install
```

## 运行开发服务器

```bash
npm run dev
# 或
pnpm dev
```

## 构建生产版本

```bash
npm run build
# 或
pnpm build
```

## 数据库迁移

在使用CMS系统前，需要先运行数据库迁移：

```bash
# 在项目根目录执行
supabase migration up
```

主要迁移文件：
- `20250115_create_tables.sql` - 创建基础表结构
- `20250120_create_community_tables.sql` - 创建社区相关表
- `20250115_add_settlement_workflow.sql` - 添加结算工作流相关表结构
- `20250122_create_masters_table.sql` - 创建卦师表
- `20250123_add_admin_policies.sql` - 添加管理员权限策略
- `20250124_create_modules_table.sql` - 创建模块管理表

## 权限说明

### 管理员权限
- 只有角色为 `admin` 的用户才能访问CMS系统
- 管理员可以：
  - 管理所有数据（增删改查）
  - 修改用户角色
  - 管理功能模块
  - 管理卦师信息

### 设置管理员

CMS系统使用**邮箱密码**登录，需要先创建一个邮箱密码账户，然后设置为管理员。

#### 创建CMS管理员账户的完整步骤

**步骤1：创建邮箱密码账户**

在 Supabase Dashboard 中创建用户：

1. 登录 Supabase Dashboard
2. 进入 **Authentication** > **Users**
3. 点击 **"Add user"** > **"Create new user"**
4. 填写信息：
   - **Email**: 输入管理员邮箱（例如：`admin@example.com`）
   - **Password**: 设置一个强密码（至少8位，包含字母和数字）
   - **Auto Confirm User**: 建议勾选（跳过邮箱验证）
5. 点击 **"Create user"**
6. **重要**：复制创建的用户ID（UUID格式，例如：`550e8400-e29b-41d4-a716-446655440000`）

**步骤2：创建profile记录并设置为管理员**

在 Supabase Dashboard 的 **SQL Editor** 中运行以下SQL（将 `YOUR_USER_ID_HERE` 替换为步骤1中复制的UUID）：

```sql
-- 创建profile记录并设置为管理员
INSERT INTO public.profiles (id, nickname, avatar_url, role)
VALUES (
  'YOUR_USER_ID_HERE',  -- ⚠️ 替换为步骤1中复制的用户UUID
  '管理员',              -- 昵称
  NULL,                  -- 头像URL（可选）
  'admin'                -- 角色：admin
)
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';
```

**步骤3：验证设置**

运行以下SQL验证管理员账户创建成功：

```sql
SELECT 
  p.id,
  p.nickname,
  p.role,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';
```

**步骤4：登录CMS**

现在可以使用以下信息登录CMS：
- **邮箱**: 你在步骤1中创建的邮箱
- **密码**: 你在步骤1中设置的密码

---

#### 其他方法（如果已有用户账户）

**方法1：将现有微信用户设置为管理员**

如果你的微信小程序账户已经存在，可以将其设置为管理员：

1. **查看所有用户**（在 Supabase Dashboard 的 SQL Editor 中运行）：
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'nickname' as nickname,
  raw_user_meta_data->>'wechat_openid' as wechat_openid,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

2. **为现有用户创建profile记录**（如果profiles表为空）：
```sql
INSERT INTO public.profiles (id, nickname, avatar_url, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'nickname', '用户') as nickname,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  'user' as role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

3. **设置管理员**（将 `YOUR_USER_ID_HERE` 替换为实际的用户UUID）：
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';
```

**注意**：
- 微信登录的用户通常没有邮箱，无法直接登录CMS
- 建议为CMS单独创建一个邮箱密码账户
- 用户 ID 必须是有效的 UUID 格式
- 不能使用占位符文本如 `'your_user_id'` 或 `'user_id'`

#### 相关SQL脚本

- `docs/setup_admin.sql` - 设置现有用户为管理员的脚本
- `docs/create_admin_account.sql` - 创建新管理员账户的完整指南

## 使用说明

### 1. 登录
- 使用管理员账号登录系统
- 登录页面：`/login`

### 2. 模块管理
- 进入"模块管理"页面
- 可以添加新模块、编辑现有模块、启用/禁用模块
- 模块状态会影响前端应用的功能显示

### 3. 卦师管理
- 添加卦师：选择关联的用户，填写卦师信息
- 编辑卦师：修改卦师的各项信息
- 删除卦师：删除卦师记录（会保留用户账号）

### 4. 用户管理
- 查看所有用户
- 编辑用户角色：将普通用户提升为管理员，或撤销管理员权限

### 5. 数据管理
- 各个数据管理页面都支持：
  - 列表查看
  - 搜索和筛选
  - 编辑和删除操作
  - 批量操作（部分功能）

## 注意事项

1. **数据安全**：删除操作会永久删除数据，请谨慎操作
2. **权限控制**：确保只有可信用户被设置为管理员
3. **模块管理**：禁用模块会影响前端应用的功能可用性
4. **卦师关联**：创建卦师时必须关联已存在的用户账号

## 开发说明

### 添加新页面
1. 在 `src/pages/` 目录下创建新页面组件
2. 在 `src/App.tsx` 中添加路由和菜单项
3. 如需数据库表，创建对应的迁移文件

### 权限策略
- 所有数据表都启用了 Row Level Security (RLS)
- 管理员策略在 `20250123_add_admin_policies.sql` 中定义
- 新增表需要添加对应的管理员策略

## 故障排查

### 无法登录
- 检查用户角色是否为 `admin`
- 检查 Supabase 连接配置是否正确

### 权限不足
- 确认用户角色为 `admin`
- 检查数据库策略是否正确应用

### 数据加载失败
- 检查 Supabase 连接
- 查看浏览器控制台错误信息
- 确认数据库迁移已执行

## 更新日志

### v1.0.0
- 初始版本
- 支持模块管理、卦师管理、用户管理、帖子管理、评论管理、占卜记录管理、评价管理
