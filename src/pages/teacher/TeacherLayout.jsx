import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, BarChart3, Target } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { listClasses, loadClassData } from '../../lib/api'
import { ErrorBox, Shell } from '../../components/ui'

const Ctx = createContext(null)
export const useTeacher = () => useContext(Ctx)

const NAV = [
  { to: '/teacher', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/teacher/classes', label: '학급·학생', icon: Users },
  { to: '/teacher/assessments', label: '형성평가', icon: ClipboardList },
  { to: '/teacher/results', label: '결과 분석', icon: BarChart3 },
  { to: '/teacher/assignments', label: '맞춤 과제', icon: Target },
]

export default function TeacherLayout() {
  const { profile, signOut } = useAuth()
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const reloadClasses = useCallback(async () => {
    const c = await listClasses(profile.id)
    setClasses(c)
    setClassId((cur) => (c.find((x) => x.id === cur) ? cur : c[0]?.id || null))
    if (!c.length) {
      setData(null)
      setLoading(false)
    }
  }, [profile.id])

  const reload = useCallback(
    async (silent = false) => {
      if (!classId) return
      if (!silent) setLoading(true)
      try {
        setData(await loadClassData(classId))
        setErr('')
      } catch (e) {
        setErr(e.message)
      }
      setLoading(false)
    },
    [classId],
  )

  useEffect(() => {
    reloadClasses().catch((e) => {
      setErr(e.message)
      setLoading(false)
    })
  }, [reloadClasses])

  useEffect(() => {
    setData(null)
    reload()
  }, [reload])

  const cls = classes.find((c) => c.id === classId)

  const selector = classes.length > 0 && (
    <select
      value={classId || ''}
      onChange={(e) => setClassId(e.target.value)}
      className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-700 outline-none"
      aria-label="학급 선택"
    >
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )

  return (
    <Ctx.Provider value={{ profile, classes, classId, setClassId, cls, data, loading, reload, reloadClasses }}>
      <Shell nav={NAV} user={profile} roleLabel="교사" onLogout={signOut} headerExtra={selector}>
        <ErrorBox message={err} />
        <Outlet />
      </Shell>
    </Ctx.Provider>
  )
}
