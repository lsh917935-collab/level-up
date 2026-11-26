import { useState } from 'react'
import { Plus, Trash2, UserPlus, School, UserMinus } from 'lucide-react'
import { useTeacher } from './TeacherLayout'
import { addStudent, createClass, deleteClass, removeStudent } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, PageHeader, Spinner, inputCls } from '../../components/ui'

export default function Classes() {
  const { profile, classes, classId, setClassId, cls, data, loading, reload, reloadClasses } = useTeacher()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const guard = async (fn) => {
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

  const onCreate = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    guard(async () => {
      const c = await createClass(name.trim(), profile.id)
      setName('')
      await reloadClasses()
      setClassId(c.id)
    })
  }

  const onDeleteClass = (c) => {
    if (!window.confirm(`'${c.name}' 학급과 모든 평가·결과·과제가 삭제됩니다. 계속할까요?`)) return
    guard(async () => {
      await deleteClass(c.id)
      await reloadClasses()
    })
  }

  const onAdd = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    guard(async () => {
      const r = await addStudent(classId, email.trim())
      if (r === 'ok') {
        setMsg('학생을 학급에 추가했습니다.')
        setEmail('')
        await reload(true)
      } else setErr('해당 이메일의 학생 계정을 찾을 수 없습니다. 학생이 먼저 "학생 가입"을 해야 합니다.')
    })
  }

  const onRemove = (st) => {
    if (!window.confirm(`${st.name} 학생을 학급에서 제외할까요?`)) return
    guard(async () => {
      await removeStudent(classId, st.id)
      await reload(true)
    })
  }

  return (
    <div>
      <PageHeader title="학급·학생 관리" desc="학급을 만들고, 가입한 학생을 이메일로 추가합니다." />
      <ErrorBox message={err} />
      {msg && <div className="mb-4 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-700">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 font-extrabold text-slate-800">내 학급</h2>
          <form onSubmit={onCreate} className="mb-4 flex gap-2">
            <input className={inputCls} placeholder="예: 3학년 2반" value={name} onChange={(e) => setName(e.target.value)} />
            <Btn type="submit" variant="green" disabled={busy}>
              <Plus size={16} /> 생성
            </Btn>
          </form>
          {classes.length === 0 ? (
            <Empty text="아직 학급이 없습니다." />
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id} className={`flex items-center gap-2 rounded-xl border p-3 ${c.id === classId ? 'border-sky-400 bg-sky-50' : 'border-sky-100'}`}>
                  <button type="button" onClick={() => setClassId(c.id)} className="flex flex-1 items-center gap-2 text-left text-sm font-bold text-slate-700">
                    <School size={16} className="text-sky-500" /> {c.name}
                  </button>
                  <button type="button" onClick={() => onDeleteClass(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="학급 삭제">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-extrabold text-slate-800">{cls ? `${cls.name} 학생 (${data?.students.length ?? 0}명)` : '학생'}</h2>
          {!classId ? (
            <Empty text="학급을 먼저 만들어 주세요." />
          ) : (
            <>
              <form onSubmit={onAdd} className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input className={inputCls} type="email" placeholder="학생 이메일 (예: student1@levelup.demo)" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Btn type="submit" disabled={busy} className="shrink-0">
                  <UserPlus size={16} /> 학생 추가
                </Btn>
              </form>
              {loading || !data ? (
                <Spinner />
              ) : data.students.length === 0 ? (
                <Empty text="학급에 학생이 없습니다." />
              ) : (
                <ul className="divide-y divide-sky-50">
                  {data.students.map((st) => (
                    <li key={st.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-100 text-sm font-extrabold text-leaf-600">{st.name.slice(0, 1)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-700">{st.name}</div>
                        <div className="truncate text-xs text-slate-400">{st.email}</div>
                      </div>
                      <Btn variant="danger" size="sm" onClick={() => onRemove(st)} disabled={busy}>
                        <UserMinus size={14} /> 제외
                      </Btn>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
