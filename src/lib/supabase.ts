import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not configured. Please check your .env.local file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key-for-build'
)

// Types para as tabelas do banco de dados
export interface Profile {
  id: string
  name: string
  username: string
  avatar_path: string
  birth_date?: string
  gender?: string
  postal_code?: string
  guardian_email: string
  authorized?: boolean | null // NULL = pendente, TRUE = autorizado, FALSE = rejeitado
  user_role: 'app' | 'cms' | 'psicologos'
  approval_token: string
  approval_email_sent: boolean
  approval_email_sent_at?: string
  email_resend_count: number
  last_email_resent_at?: string
  authorized_at?: string
  authorized_by?: string
  rejection_reason?: string
  is_online: boolean
  created_at: string
  updated_at: string
}

export interface ChildrenGuardian {
  id: string
  child_name: string
  child_birth_date: string
  guardian_name: string
  guardian_email: string
  guardian_address: string
  guardian_postal_code: string
  terms_of_use: boolean
  gdpr_consent_declaration: boolean
  account_creation_authorization_date?: string
  record_creation_date: string
  created_at: string
  updated_at: string
}

export interface AuthorizationLog {
  id: string
  user_id: string
  action: 'account_created' | 'email_sent' | 'email_resent' | 'authorized' | 'rejected' | 'role_changed'
  guardian_email: string
  ip_address?: string
  user_agent?: string
  additional_data?: Record<string, unknown>
  created_at: string
} 