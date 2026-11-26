import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useStudent } from './StudentLayout'
import { Card, Empty, LevelBadge, PageHeader, Pill, Spinner } from '../../components/ui'
import { fmtDate, todayStr } from '../../lib/logic'

export default function StudentAssignments() {
  const { data } = useStudent()
  const [tab, setTab] = useState('todo')
  if (!data) return <Spinner />

  const today = todayStr()
  const list = data.assignments.filter((a) => (tab === 'todo' ? a.status === 'assigned' : a.status === 'submitted'))
  const titleOf = (id) => data.assessments.find((a) => a.id === id)?.title || ''

  return (
    <div>
      <PageHeader title="내 맞춤 과제" desc="평가 영역별 결과에 따라 나에게 맞게 배정된 과제예요." />
      <div className="mb-4 flex gap-1 rounded-xl bg-sky-50 p-1 sm:w-fit">
        {[
          ['todo', `해야 할 과제 (${data.assignments.filter((a) => a.status === 'assigned').length})`],
          ['done', `완료한 과제 (${data.assignments.filter((a) => a.status === 'submitted').length})`],
        ].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-bold sm:flex-none ${tab === k ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="p-6">
          <Empty text={tab === 'todo' ? '해야 할 과제가 없어요. 평가를 응시하면 맞춤 과제가 배정됩니다.' : '아직 완료한 과제가 없어요.'} />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((a) => (
            <Link key={a.id} to={`/student/assignments/${a.id}`}>
              <Card className="h-full p-4 transition hover:border-sky-300">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <LevelBadge level={a.level} />
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
                <div className="font-extrabold text-slate-800">{a.area}</div>
                <div className="text-xs text-slate-400">{titleOf(a.assessment_id)}</div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{a.reason}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <CalendarDays size={13} /> 기한 {fmtDate(a.due_date)}
                  {a.status === 'assigned' && a.due_date && String(a.due_date) < today && <Pill tone="orange">기한 지남</Pill>}
                  {a.status === 'submitted' && (
                    <Pill tone="green">
                      <CheckCircle2 size={11} className="mr-0.5 inline" />
                      제출 완료{a.score != null ? ` · ${a.score}점` : ''}
                    </Pill>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
