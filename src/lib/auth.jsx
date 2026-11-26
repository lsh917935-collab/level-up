import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// 회원가입 직후에는 트리거가 프로필을 만들 때까지 잠깐 걸릴 수 있어 몇 번 재시도
async function fetchProfile(uid) {
  for (let i = 0; i < 6; i++) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (data) return data
    await new Promise((r) => setTimeout(r, 400))
  }
  return null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session) setProfile(await fetchProfile(data.session.user.id))
      if (alive) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) setProfile(null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    const p = await fetchProfile(data.user.id)
    setProfile(p)
    return p
  }

  const signUp = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) throw new Error(error.message)
    if (data.session) {
      const p = await fetchProfile(data.user.id)
      setProfile(p)
      return { signedIn: true }
    }
    return { signedIn: false }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  return (
    <Ctx.Provider value={{ session, profile, loading, signIn, signUp, signOut, user: session?.user }}>
      {children}
    </Ctx.Provider>
  )
}
