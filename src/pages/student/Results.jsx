import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { useStudent } from './StudentLayout'
import { ensureAssignments, fetchQuestions } from '../../lib/api'
import { Card, Empty, LevelBadge, PageHeader, Pill, ProgressBar, RateBarChart, Spinner } from '../../components/ui'
import { fmtDate, latestRetest } from '../../lib/logic'

export default function StudentResults() {
  const { id } = useParams()
  const { data } = useStudent()
  if (!data) return <Spinner />

  if (id) {
    const a = data.assessments.find((x) => x.id === id)
    const sub = data.submissions.find((s) => s.assessment_id === id)
    if (!a || !sub)
      return (
        <Card className="p-6">
          <Empty text="아직 응시하지 않았거나 결과를 찾을 수 없습니다.">
            <Link to="/student" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white">
              홈으로
            </Link>
          </Empty>
        </Card>
      )
    return <Detail a={a} sub={sub} />
  }

  const rows = data.submissions
    .map((s) => ({ s, a: data.assessments.find((x) => x.id === s.assessment_id) }))
    .filter((r) => r.a)

  return (
    <div>
      <PageHeader title="내 결과" desc="응시한 형성평가와 재평가 변화를 확인하세요." />
      {rows.length === 0 ? (
        <Card className="p-6">
          <Empty text="아직 응시한 평가가 없습니다." />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ s, a }) => {
            const rts = data.retests.filter((r) => r.assessment_id === a.id)
            return (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-800">{a.title}</h3>
                    <div className="text-xs text-slate-500">제출일 {fmtDate(s.submitted_at)} · 재평가 {rts.length}회</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-sky-700">{Math.round(s.rate)}%</div>
                      <div className="text-xs text-slate-400">
                        {s.score}/{s.total}점
                      </div>
                    </div>
                    <Link to={`/student/results/${a.id}`} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700">
                      자세히 <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Detail({ a, sub }) {
  const { data, user, reload } = useStudent()
  const [qs, setQs] = useState(null)
  const fixed = useRef(false)
  const asgs = data.assignments.filter((x) => x.assessment_id === a.id)

  useEffect(() => {
    fetchQuestions(a.id).then(setQs).catch(() => setQs([]))
  }, [a.id])

  // 제출은 됐지만 과제 생성이 누락된 경우 복구 (정상이라면 실행되지 않음)
  useEffect(() => {
    const canPlan = Object.values(sub.area_stats || {}).some((s) => !s.pending)
    if (!fixed.current && asgs.length === 0 && canPlan) {
      fixed.current = true
      ensureAssignments(user, a, sub).then(reload).catch(() => {})
    }
  }, [asgs.length, a, sub, user, reload])

  const stats = sub.area_stats || {}
  const chart = Object.entries(stats).map(([area, s]) => ({ name: area, rate: s.rate, pending: s.pending }))
  const main = (qs || []).filter((q) => q.purpose === 'main')

  return (
    <div>
      <PageHeader title={a.title} desc={`제출일 ${fmtDate(sub.submitted_at)}`} actions={<Link to="/student/results" className="text-sm font-bold text-sky-600 hover:underline">← 내 결과 목록</Link>} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <div className="text-xs text-slate-500">점수</div>
          <div className="text-2xl font-extrabold text-slate-800">
            {sub.score}
            <span className="text-sm text-slate-400"> / {sub.total}</span>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-slate-500">전체 정답률</div>
          <div className="text-2xl font-extrabold text-leaf-600">{Math.round(sub.rate)}%</div>
        </Card>
      </div>

      <Card className="mb-4 p-5">
        <h2 className="mb-1 font-extrabold text-slate-800">영역별 정답률</h2>
        <p className="mb-2 text-xs text-slate-400">전체 점수가 높아도 영역별로 과제가 달라질 수 있어요.</p>
        <RateBarChart data={chart} low={a.low_cut} high={a.high_cut} height={230} />
      </Card>

      <h2 className="mb-2 font-extrabold text-slate-800">영역별 맞춤 과제와 배정 이유</h2>
      <div className="mb-6 space-y-3">
        {Object.entries(stats).map(([area, s]) => {
          const asg = asgs.find((x) => x.area === area)
          const rt = latestRetest(data.retests, user.id, a.id, area)
          return (
            <Card key={area} className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700">{area}</span>
                {s.pending ? <Pill tone="gray">판정 보류</Pill> : asg ? <LevelBadge level={asg.level} /> : <Pill tone="gray">배정 중</Pill>}
              </div>
              <ProgressBar value={s.rate} tone="sky" />
              <div className="mt-1 text-xs text-slate-500">
                정답률 {s.rate}% ({s.earned}/{s.total}점)
              </div>
              <p className="mt-2 rounded-lg bg-sky-50 p-2.5 text-xs text-slate-600">
                {s.pending
                  ? `이 영역은 문항이 ${s.count}개뿐이라 성취도를 확정하지 않아 과제를 배정하지 않았어요.`
                  : asg
                    ? asg.reason
                    : '과제를 준비하고 있어요.'}
              </p>
              {rt && (
                <div className="mt-2 flex items-center gap-2 text-sm font-bold text-leaf-600">
                  <TrendingUp size={16} /> 재평가 {s.rate}% → {Math.round(rt.rate)}% ({Math.round(rt.rate) - s.rate >= 0 ? '+' : ''}
                  {Math.round(rt.rate) - s.rate}%p)
                </div>
              )}
              {asg && (
                <Link to={`/student/assignments/${asg.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline">
                  {asg.status === 'submitted' ? '과제 다시 보기' : '과제 하러 가기'} <ArrowRight size={13} />
                </Link>
              )}
            </Card>
          )
        })}
      </div>

      <h2 className="mb-2 font-extrabold text-slate-800">문항별 결과와 해설</h2>
      {!qs ? (
        <Spinner />
      ) : (
        <ol className="space-y-2">
          {main.map((q, i) => {
            const right = sub.results?.[q.id]
            return (
              <li key={q.id} className={`rounded-xl border p-4 text-sm ${right ? 'border-leaf-100 bg-leaf-50/60' : 'border-orange-200 bg-orange-50/60'}`}>
                <div className="mb-1 flex items-center gap-2">
                  <b className={right ? 'text-leaf-700' : 'text-orange-600'}>
                    {i + 1}번 {right ? '정답' : '오답'}
                  </b>
                  <Pill tone="gray">{q.area}</Pill>
                </div>
                <div className="font-semibold text-slate-700">{q.content}</div>
                <div className="mt-1 text-xs text-slate-600">
                  내 답: <b>{sub.answers?.[q.id] || '(무응답)'}</b>
                  {!right && (
                    <>
                      {' '}
                      · 정답: <b className="text-leaf-700">{q.answer.split('|')[0]}</b>
                    </>
                  )}
                </div>
                {q.explanation && <div className="mt-1 text-xs text-slate-500">해설: {q.explanation}</div>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
