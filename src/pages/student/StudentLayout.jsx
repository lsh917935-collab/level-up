import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, ListChecks, LineChart } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { loadStudentData } from '../../lib/api'
import { ErrorBox, Shell, ClassBadge } from '../../components/ui'

const Ctx = createContext(null)
export const useStudent = () => useContext(Ctx)

const NAV = [
  { to: '/student', label: '홈', icon: Home, end: true },
  { to: '/student/assignments', label: '내 과제', icon: ListChecks },
  { to: '/student/results', label: '내 결과', icon: LineChart },
]

export default function StudentLayout() {
  const { profile, user, signOut } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    try {
      setData(await loadStudentData(user.id))
      setErr('')
    } catch (e) {
      setErr(e.message)
    }
  }, [user.id])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <Ctx.Provider value={{ profile, user, data, reload }}>
      <Shell nav={NAV} user={profile} roleLabel="학생" onLogout={signOut} headerExtra={data?.classes?.[0] && <ClassBadge name={data.classes[0].name} />}>
        <ErrorBox message={err} />
        <Outlet />
      </Shell>
    </Ctx.Provider>
  )
}
