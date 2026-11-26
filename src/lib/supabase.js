import { createClient } from '@supabase/supabase-js'

// 환경변수 값에 공백, 따옴표, 끝의 슬래시, /rest/v1 같은 경로가 섞여 들어와도
// 프로젝트 주소(origin)만 남겨서 사용합니다. (예: https://xxxx.supabase.co)
function cleanUrl(raw) {
  if (!raw) return ''
  const trimmed = String(raw).trim().replace(/^["']|["']$/g, '')
  try {
    return new URL(trimmed).origin
  } catch {
    return ''
  }
}

const url = cleanUrl(import.meta.env.VITE_SUPABASE_URL)
const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  .trim()
  .replace(/^["']|["']$/g, '')

export const isConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'))

export const supabase = isConfigured
  ? createClient(url, key)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')
