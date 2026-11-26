import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GraduationCap, BookOpen, AlertTriangle, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { isConfigured } from '../lib/supabase'
import { Btn, Card, Field, Logo, Spinner, inputCls } from '../components/ui'

const DEMO = [
  { role: 'teacher', name: '박영어 선생님', email: 'teacher@levelup.demo', note: '3학년 1반 담임 · 전체 결과 확인' },
  { role: 'student', name: '김민준', email: 'student1@levelup.demo', note: '불규칙 동사 보충 → 재평가 완료' },
  { role: 'student', name: '이서연', email: 'student2@levelup.demo', note: '불규칙·의문문 영역 차이' },
  { role: 'student', name: '박지호', email: 'student3@levelup.demo', note: '일반동사·부정문 보충' },
  { role: 'student', name: '최유나', email: 'student4@levelup.demo', note: '불규칙·의문문·부정문 영역별 차이' },
  { role: 'student', name: '정도윤', email: 'student5@levelup.demo', note: '여러 영역 보충 필요' },
  { role: 'student', name: '한소율', email: 'student6@levelup.demo', note: '고득점 · 일부 영역만 보충' },
]
const DEMO_PW = 'levelup1234'

export default function Login() {
  const { profile, session, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  if (loading) return <Spinner />
  if (profile) return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
  if (session && !profile) return <Spinner text="계정 정보를 확인하는 중..." />

  const run = async (fn) => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      if (mode === 'login') await signIn(email.trim(), pw)
      else {
        const r = await signUp(name.trim() || email.split('@')[0], email.trim(), pw)
        if (!r.signedIn) setMsg('가입 요청이 완료되었습니다. 이메일 인증이 필요한 설정이라면 메일의 링크를 확인한 뒤 로그인해 주세요.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-3xl font-extrabold text-slate-800 sm:text-4xl">
            Level <span className="text-leaf-500">Up</span>
          </h1>
          <p className="mt-2 text-slate-500">Personalized English Learning System</p>
          <p className="mt-1 text-sm text-slate-400">형성평가 결과를 영역별로 분석해 학생마다 다른 맞춤 과제를 배정합니다.</p>
        </div>

        {!isConfigured && (
          <Card className="mb-6 border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div>
                <b>Supabase 환경변수가 설정되지 않았습니다.</b> 프로젝트의 <code>.env</code>(또는 Vercel 환경변수)에{' '}
                <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>를 입력하고 다시 배포/실행해야 로그인이 동작합니다. 자세한 방법은 DEPLOY.md를 참고하세요.
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex gap-2 rounded-xl bg-sky-50 p-1">
              {[
                ['login', '로그인', LogIn],
                ['signup', '학생 가입', UserPlus],
              ].map(([k, label, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setMode(k)
                    setErr('')
                    setMsg('')
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold ${mode === k ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="space-y-3">
              {mode === 'signup' && (
                <Field label="이름(가명 사용 권장)">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
              )}
              <Field label="이메일">
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
              </Field>
              <Field label="비밀번호" hint={mode === 'signup' ? '6자 이상' : undefined}>
                <input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </Field>
              {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
              {msg && <div className="rounded-xl bg-leaf-50 px-3 py-2 text-sm text-leaf-700">{msg}</div>}
              <Btn type="submit" className="w-full" disabled={busy || !isConfigured}>
                {busy ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
              </Btn>
              {mode === 'signup' && (
                <p className="text-xs text-slate-400">가입 계정은 학생 권한으로 생성됩니다. 교사가 이메일로 학급에 추가하면 평가와 과제가 보입니다.</p>
              )}
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-base font-extrabold text-slate-800">시연용 테스트 계정</h2>
            <p className="mb-3 text-xs text-slate-500">
              모든 계정 비밀번호: <b className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">{DEMO_PW}</b> · 버튼을 누르면 바로 로그인됩니다. (가상 데이터)
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={busy || !isConfigured}
                  onClick={() => run(() => signIn(d.email, DEMO_PW))}
                  className="flex w-full items-center gap-3 rounded-xl border border-sky-100 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${d.role === 'teacher' ? 'bg-sky-100 text-sky-600' : 'bg-leaf-100 text-leaf-600'}`}>
                    {d.role === 'teacher' ? <GraduationCap size={20} /> : <BookOpen size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-700">
                      {d.name} <span className="text-xs font-medium text-slate-400">· {d.role === 'teacher' ? '교사' : '학생'}</span>
                    </div>
                    <div className="truncate text-xs text-slate-500">{d.email}</div>
                    <div className="truncate text-xs text-slate-400">{d.note}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
