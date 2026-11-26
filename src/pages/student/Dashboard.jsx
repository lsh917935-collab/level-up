import { Link } from 'react-router-dom'
import { ClipboardList, Clock, CheckCircle2, Target, CalendarDays, ChevronRight } from 'lucide-react'
import { useStudent } from './StudentLayout'
import { Card, Empty, LevelBadge, PageHeader, Pill, ProgressBar, Spinner } from '../../components/ui'
import { fmtDate, todayStr } from '../../lib/logic'

export default function StudentDashboard() {
  const { data, profile } = useStudent()
  if (!data) return <Spinner />

  const { assessments, submissions, assignments } = data
  const published = assessments.filter((a) => a.status === 'published')
  const taken = (id) => submissions.find((s) => s.assessment_id === id)
  const open = published.filter((a) => !taken(a.id))
  const done = published.filter((a) => taken(a.id))
  const totalTasks = assignments.length
  const doneTasks = assignments.filter((a) => a.status === 'submitted').length
  const progress = totalTasks ? Math.round((doneTasks * 100) / totalTasks) : 0
  const todo = assignments.filter((a) => a.status === 'assigned').sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
  const today = todayStr()

  return (
    <div>
      <PageHeader title={`안녕하세요, ${profile.name}님 👋`} desc="오늘도 한 단계 Level Up! 해 볼까요?" />

      <Card className="mb-4 bg-gradient-to-r from-sky-500 to-sky-600 p-5 text-white">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span>나의 학습 진행률</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-leaf-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 text-xs text-sky-100">
          맞춤 과제 {totalTasks}개 중 {doneTasks}개 완료 · 응시 가능한 평가 {open.length}개
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold text-slate-800">
            <ClipboardList size={18} className="text-sky-500" /> 형성평가
          </h2>
          {published.length === 0 ? (
            <Empty text="공개된 형성평가가 아직 없습니다. 선생님이 공개하면 이곳에 나타나요." />
          ) : (
            <ul className="space-y-2">
              {open.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-700">{a.title}</div>
                    <div className="text-xs text-slate-500">
                      <Clock size={12} className="inline" /> {a.time_limit}분 · {a.unit}
                    </div>
                  </div>
                  <Link to={`/student/assessments/${a.id}`} className="shrink-0 rounded-xl bg-leaf-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-leaf-600">
                    응시하기
                  </Link>
                </li>
              ))}
              {done.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-700">{a.title}</div>
                    <div className="text-xs text-slate-500">
                      <CheckCircle2 size={12} className="inline text-leaf-500" /> 응시 완료 · 정답률 {Math.round(taken(a.id).rate)}%
                    </div>
                  </div>
                  <Link to={`/student/results/${a.id}`} className="shrink-0 rounded-xl border border-sky-200 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50">
                    결과 보기
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-extrabold text-slate-800">
              <Target size={18} className="text-leaf-500" /> 해야 할 맞춤 과제
            </h2>
            <Link to="/student/assignments" className="text-xs font-bold text-sky-600 hover:underline">
              전체 보기
            </Link>
          </div>
          {todo.length === 0 ? (
            <Empty text={totalTasks ? '모든 과제를 완료했어요! 🎉' : '평가를 응시하면 맞춤 과제가 배정돼요.'} />
          ) : (
            <ul className="space-y-2">
              {todo.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={`/student/assignments/${a.id}`} className="flex items-center gap-3 rounded-xl border border-sky-100 p-3 hover:bg-sky-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-700">{a.area}</span>
                        <LevelBadge level={a.level} />
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        <CalendarDays size={12} className="inline" /> 기한 {fmtDate(a.due_date)} {a.due_date && String(a.due_date) < today && <Pill tone="orange">기한 지남</Pill>}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
