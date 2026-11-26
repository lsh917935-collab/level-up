import { useMemo, useState } from 'react'
import { useTeacher } from './TeacherLayout'
import { Card, Empty, LevelBadge, Modal, NeedClass, PageHeader, Pill, ProgressBar, RateBarChart, Spinner, rateColor } from '../../components/ui'
import { classAreaRates, computeStats, latestRetest, levelFor, mainQuestions, questionRates, weakAreasOf } from '../../lib/logic'

export default function Results() {
  const { data, loading, classId } = useTeacher()
  const [aid, setAid] = useState('')
  const [tab, setTab] = useState('student')
  const [detail, setDetail] = useState(null)

  const withSubs = useMemo(() => (data ? data.assessments.filter((a) => a.status === 'published' || data.submissions.some((s) => s.assessment_id === a.id)) : []), [data])

  if (!classId) return <NeedClass />
  if (loading || !data) return <Spinner />
  if (withSubs.length === 0)
    return (
      <div>
        <PageHeader title="결과 분석" />
        <Card className="p-6">
          <Empty text="공개된 형성평가가 없습니다." />
        </Card>
      </div>
    )

  const a = withSubs.find((x) => x.id === aid) || withSubs[withSubs.length - 1]
  const mainQs = mainQuestions(a)
  const subs = data.submissions.filter((s) => s.assessment_id === a.id)
  const qRates = questionRates(mainQs, subs)
  const aRates = classAreaRates(mainQs, subs, a.min_items)
  const confirmed = aRates.filter((x) => !x.pending)
  const weakest = subs.length && confirmed.length ? [...confirmed].sort((x, y) => x.rate - y.rate)[0] : null
  const avg = subs.length ? Math.round(subs.reduce((t, s) => t + Number(s.rate), 0) / subs.length) : null

  const rows = data.students.map((st) => {
    const s = subs.find((x) => x.student_id === st.id)
    const stats = s ? computeStats(mainQs, s.results, a.min_items) : null
    return { st, s, stats, weak: stats ? weakAreasOf(stats, a.low_cut) : [] }
  })
  const areaNames = aRates.map((x) => x.area)

  return (
    <div>
      <PageHeader
        title="결과 분석"
        desc="학생별·문항별·영역별 정답률을 확인합니다."
        actions={
          <select value={a.id} onChange={(e) => setAid(e.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-sky-700">
            {withSubs.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-slate-500">응시 / 전체</div>
          <div className="text-xl font-extrabold text-slate-800">
            {subs.length} / {data.students.length}명
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">평균 정답률</div>
          <div className="text-xl font-extrabold text-slate-800">{avg == null ? '-' : `${avg}%`}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">학급 공통 취약 영역</div>
          <div className="text-xl font-extrabold text-orange-600">{weakest ? `${weakest.area} (${weakest.rate}%)` : '-'}</div>
        </Card>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-sky-50 p-1 sm:w-fit">
        {[
          ['student', '학생별'],
          ['question', '문항별'],
          ['area', '영역별'],
        ].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-bold sm:flex-none ${tab === k ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {subs.length === 0 && (
        <Card className="p-6">
          <Empty text="아직 제출한 학생이 없습니다." />
        </Card>
      )}

      {subs.length > 0 && tab === 'student' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sky-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">학생</th>
                  <th className="px-3 py-2.5">점수</th>
                  <th className="px-3 py-2.5">정답률</th>
                  {areaNames.map((n) => (
                    <th key={n} className="px-3 py-2.5">
                      {n}
                    </th>
                  ))}
                  <th className="px-3 py-2.5">취약 영역</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ st, s, stats, weak }) => (
                  <tr key={st.id} className="cursor-pointer border-t border-sky-50 hover:bg-sky-50/60" onClick={() => s && setDetail(st.id)}>
                    <td className="px-4 py-3 font-semibold text-sky-700">{st.name}</td>
                    <td className="px-3 py-3">{s ? `${s.score}/${s.total}` : '-'}</td>
                    <td className="px-3 py-3 font-bold">{s ? `${Math.round(s.rate)}%` : <Pill tone="gray">미응시</Pill>}</td>
                    {areaNames.map((n) => {
                      const st2 = stats?.[n]
                      return (
                        <td key={n} className="px-3 py-3">
                          {st2 ? (
                            st2.pending ? (
                              <Pill tone="gray">보류</Pill>
                            ) : (
                              <span className="font-bold" style={{ color: rateColor(st2.rate, false, a.low_cut, a.high_cut) }}>
                                {st2.rate}%
                              </span>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3">
                      {s ? (
                        weak.length ? (
                          <div className="flex flex-wrap gap-1">
                            {weak.map((w) => (
                              <Pill key={w} tone="orange">
                                {w}
                              </Pill>
                            ))}
                          </div>
                        ) : (
                          <Pill tone="green">없음</Pill>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-sky-50 px-4 py-2 text-xs text-slate-400">학생 행을 누르면 문항별 응답과 재평가 비교를 볼 수 있습니다.</p>
        </Card>
      )}

      {subs.length > 0 && tab === 'question' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 font-extrabold text-slate-800">문항별 정답률</h2>
            <RateBarChart data={qRates.map((q, i) => ({ name: `${i + 1}번`, rate: q.rate }))} low={a.low_cut} high={a.high_cut} />
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-sky-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">번호</th>
                    <th className="px-3 py-2.5">문제</th>
                    <th className="px-3 py-2.5">영역</th>
                    <th className="px-3 py-2.5">난이도</th>
                    <th className="px-3 py-2.5">정답 인원</th>
                    <th className="px-3 py-2.5">정답률</th>
                  </tr>
                </thead>
                <tbody>
                  {qRates.map((q, i) => (
                    <tr key={q.id} className="border-t border-sky-50">
                      <td className="px-4 py-3 font-bold text-sky-700">{i + 1}</td>
                      <td className="max-w-xs px-3 py-3 text-slate-700">{q.content}</td>
                      <td className="px-3 py-3">
                        <Pill tone="green">{q.area}</Pill>
                      </td>
                      <td className="px-3 py-3">{q.difficulty}</td>
                      <td className="px-3 py-3">
                        {q.correct}/{q.n}
                      </td>
                      <td className="px-3 py-3 font-bold" style={{ color: rateColor(q.rate, false, a.low_cut, a.high_cut) }}>
                        {q.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {subs.length > 0 && tab === 'area' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 font-extrabold text-slate-800">영역별 학급 정답률</h2>
            <RateBarChart data={aRates.map((x) => ({ name: x.area, rate: x.rate, pending: x.pending }))} low={a.low_cut} high={a.high_cut} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {aRates.map((x) => {
              const lv = levelFor(x.rate, a.low_cut, a.high_cut)
              const need = rows.filter((r) => r.stats?.[x.area] && !r.stats[x.area].pending && r.stats[x.area].rate < a.low_cut).length
              return (
                <Card key={x.area} className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">{x.area}</h3>
                    {x.pending ? <Pill tone="gray">판정 보류 · {x.count}문항</Pill> : <LevelBadge level={lv} />}
                  </div>
                  <ProgressBar value={x.rate} tone="sky" />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>정답률 {x.rate}% · {x.count}문항</span>
                    <span>보충 필요 {need}명</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {detail && (
        <StudentDetail
          student={data.students.find((s) => s.id === detail)}
          sub={subs.find((s) => s.student_id === detail)}
          assessment={a}
          mainQs={mainQs}
          assignments={data.assignments.filter((x) => x.student_id === detail && x.assessment_id === a.id)}
          retests={data.retests}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

function StudentDetail({ student, sub, assessment, mainQs, assignments, retests, onClose }) {
  const stats = computeStats(mainQs, sub.results, assessment.min_items)
  return (
    <Modal wide title={`${student.name} · ${assessment.title}`} onClose={onClose}>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Pill>
          {sub.score}/{sub.total}점
        </Pill>
        <Pill tone="green">정답률 {Math.round(sub.rate)}%</Pill>
      </div>

      <h4 className="mb-2 text-sm font-extrabold text-slate-700">영역별 성취도 · 배정 과제</h4>
      <div className="mb-5 space-y-2">
        {Object.entries(stats).map(([area, st]) => {
          const asg = assignments.find((x) => x.area === area)
          const rt = latestRetest(retests, sub.student_id, assessment.id, area)
          return (
            <div key={area} className="rounded-xl border border-sky-100 p-3">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-700">
                  {area} <span className="font-normal text-slate-400">({st.earned}/{st.total}점)</span>
                </span>
                {st.pending ? <Pill tone="gray">판정 보류 (문항 {st.count}개)</Pill> : asg ? <LevelBadge level={asg.level} /> : <Pill tone="gray">과제 없음</Pill>}
              </div>
              <ProgressBar value={st.rate} tone="sky" />
              <div className="mt-1 text-xs text-slate-500">정답률 {st.rate}%</div>
              {asg && <div className="mt-1 text-xs text-slate-500">배정 이유: {asg.reason}</div>}
              {asg && <div className="mt-1 text-xs text-slate-500">과제 상태: {asg.status === 'submitted' ? `제출 완료 (${asg.score ?? '-'}점)` : '미제출'}</div>}
              {rt && (
                <div className="mt-1 text-xs font-bold text-leaf-600">
                  재평가 {st.rate}% → {Math.round(rt.rate)}% ({Math.round(rt.rate) - st.rate >= 0 ? '+' : ''}
                  {Math.round(rt.rate) - st.rate}%p)
                </div>
              )}
            </div>
          )
        })}
      </div>

      <h4 className="mb-2 text-sm font-extrabold text-slate-700">문항별 응답</h4>
      <ol className="space-y-2">
        {mainQs.map((q, i) => {
          const right = sub.results?.[q.id]
          return (
            <li key={q.id} className={`rounded-xl border p-3 text-sm ${right ? 'border-leaf-100 bg-leaf-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
              <div className="font-semibold text-slate-700">
                {i + 1}. {q.content}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                학생 답: <b>{sub.answers?.[q.id] || '(무응답)'}</b> {right ? '✓ 정답' : `✗ 오답 · 정답: ${q.answer.split('|')[0]}`}
              </div>
            </li>
          )
        })}
      </ol>
    </Modal>
  )
}
