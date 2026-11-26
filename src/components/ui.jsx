import { NavLink, Link } from 'react-router-dom'
import { X, Loader2, Inbox, TrendingUp, LogOut, School } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from 'recharts'

export const inputCls =
  'w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200'

export function Card({ className = '', children, ...p }) {
  return (
    <div className={`rounded-2xl border border-sky-100 bg-white shadow-card ${className}`} {...p}>
      {children}
    </div>
  )
}

export function Btn({ variant = 'primary', size = 'md', className = '', children, ...p }) {
  const v = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700',
    green: 'bg-leaf-500 text-white hover:bg-leaf-600',
    ghost: 'border border-sky-200 bg-white text-sky-700 hover:bg-sky-50',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  }
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...p}
    >
      {children}
    </button>
  )
}

const LEVEL_STYLE = {
  보충: 'bg-orange-50 text-orange-600 border-orange-200',
  기본: 'bg-sky-50 text-sky-700 border-sky-200',
  심화: 'bg-leaf-50 text-leaf-700 border-leaf-100',
}
export function LevelBadge({ level }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[level] || ''}`}>
      {level}학습
    </span>
  )
}

export function Pill({ children, tone = 'sky' }) {
  const t = {
    sky: 'bg-sky-100 text-sky-700',
    green: 'bg-leaf-100 text-leaf-700',
    gray: 'bg-slate-100 text-slate-600',
    orange: 'bg-orange-100 text-orange-700',
  }
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${t[tone]}`}>{children}</span>
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'sky' }) {
  const t = { sky: 'bg-sky-100 text-sky-600', green: 'bg-leaf-100 text-leaf-600', orange: 'bg-orange-100 text-orange-600' }
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-xl font-extrabold text-slate-800">{value}</div>
        {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
      </div>
    </Card>
  )
}

export function PageHeader({ title, desc, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Spinner({ text = '불러오는 중...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
      <Loader2 className="animate-spin" size={18} /> {text}
    </div>
  )
}

export function Empty({ text, children }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-slate-500">
      <Inbox size={32} className="text-sky-300" />
      <p>{text}</p>
      {children}
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
}

export function NeedClass() {
  return (
    <Card className="p-6">
      <Empty text="먼저 학급을 만들어 주세요.">
        <Link to="/teacher/classes" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
          학급 만들기
        </Link>
      </Empty>
    </Card>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Logo({ small = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf-500 text-white">
        <TrendingUp size={20} />
      </div>
      <div className="leading-tight">
        <div className={`font-extrabold text-sky-700 ${small ? 'text-base' : 'text-lg'}`}>Level Up</div>
        {!small && <div className="text-[10px] text-slate-400">Personalized English Learning</div>}
      </div>
    </div>
  )
}

export function Shell({ nav, user, roleLabel, onLogout, headerExtra, children }) {
  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-sky-50'
    }`
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sky-100 bg-white p-4 md:flex">
        <div className="mb-6 px-1">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-xl bg-sky-50 p-3">
          <div className="text-xs text-slate-400">{roleLabel}</div>
          <div className="truncate text-sm font-bold text-slate-700">{user?.name}</div>
          <button type="button" onClick={onLogout} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600">
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-sky-100 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="md:hidden">
            <Logo small />
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            {headerExtra}
            <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{user?.name}</span>
            <button type="button" onClick={onLogout} className="rounded-lg p-2 text-slate-500 hover:bg-sky-50 md:hidden" aria-label="로그아웃">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sky-100 bg-white md:hidden">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-sky-600' : 'text-slate-400'}`
            }
          >
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function ClassBadge({ name }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
      <School size={14} /> {name}
    </span>
  )
}

export const rateColor = (rate, pending, low = 60, high = 85) =>
  pending ? '#cbd5e1' : rate < low ? '#f59e0b' : rate >= high ? '#22b05a' : '#4a8ff0'

// data: [{ name, rate, pending }]
export function RateBarChart({ data, low = 60, high = 85, height = 260 }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6f1ff" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v, _n, p) => [p.payload.pending ? `${v}% (판정 보류)` : `${v}%`, '정답률']} />
          <ReferenceLine y={low} stroke="#f59e0b" strokeDasharray="4 4" />
          <ReferenceLine y={high} stroke="#22b05a" strokeDasharray="4 4" />
          <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={rateColor(d.rate, d.pending, low, high)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProgressBar({ value, tone = 'green' }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-sky-100">
      <div
        className={`h-full rounded-full transition-all ${tone === 'green' ? 'bg-leaf-500' : 'bg-sky-500'}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
