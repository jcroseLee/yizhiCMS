import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}\n` +
    `Please create a .env file in the cms directory with:\n` +
    `VITE_SUPABASE_URL=your_supabase_project_url\n` +
    `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`
  )
}

// Validate URL format
try {
  const url = new URL(supabaseUrl)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must use http or https protocol')
  }
} catch (error) {
  if (error instanceof TypeError || error instanceof Error) {
    throw new Error(
      `Invalid Supabase URL format: "${supabaseUrl}"\n` +
      `Please check your VITE_SUPABASE_URL environment variable.\n` +
      `It should be a valid URL like: https://xxxxx.supabase.co`
    )
  }
  throw error
}

// Check for placeholder values
if (
  supabaseUrl.includes('your_supabase') ||
  supabaseUrl.includes('your-project-ref') ||
  supabaseAnonKey.includes('your') ||
  supabaseAnonKey.length < 50
) {
  console.warn(
    '⚠️  Supabase configuration appears to use placeholder values.\n' +
    'Please update your .env file with actual Supabase credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

