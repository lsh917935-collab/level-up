import { Link } from 'react-router-dom'
import { Users, ClipboardCheck, Percent, LifeBuoy, FileWarning, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTeacher } from './TeacherLayout'
import { Card, NeedClass, PageHeader, RateBarChart, Spinner, StatCard, Pill, Empty } from '../../components/ui'
import { classAreaRates, computeStats, mainQuestions, weakAreasOf } from '../../lib/logic'

export default function TeacherDashboard() {
  const { data, loading, classId, cls } = useTeacher()
  if (!classId) return <NeedClass />
  if (loading || !data) return <Spinner />

  const { students, assessments, submissions, assignments } = data
  const published = assessments.filter((a) => a.status === 'published')
  const latest = published[published.length - 1]
  const pubIds = new Set(published.map((a) => a.id))
  const subs = submissions.filter((s) => pubIds.has(s.assessment_id))
  const avg = subs.length ? Math.round(subs.reduce((a, s) => a + Number(s.rate), 0) / subs.length) : null

  const remedial = new Set(assignments.filter((a) => a.level === '보충').map((a) => a.student_id))
  const pendingTasks = assignments.filter((a) => a.status === 'assigned').length

  const latestSubs = latest ? submissions.filter((s) => s.assessment_id === latest.id) : []
  const areaRates = latest ? classAreaRates(mainQuestions(latest), latestSubs, latest.min_items) : []
  const confirmed = areaRates.filter((a) => !a.pending)
  const weakest = confirmed.length && latestSubs.length ? [...confirmed].sort((a, b) => a.rate - b.rate)[0] : null

  const levelData = ['보충', '기본', '심화'].map((l) => ({ name: `${l}학습`, count: assignments.filter((a) => a.level === l).length }))

  const rows = students.map((st) => {
    const s = latestSubs.find((x) => x.student_id === st.id)
    const mine = assignments.filter((a) => a.student_id === st.id && (!latest || a.assessment_id === latest.id))
    const stats = s && latest ? computeStats(mainQuestions(latest), s.results, latest.min_items) : null
    return { st, s, weak: stats ? weakAreasOf(stats, latest.low_cut) : [], done: mine.filter((a) => a.status === 'submitted').length, total: mine.length }
  })

  return (
    <div>
      <PageHeader title="교사 대시보드" desc={`${cls?.name || ''} 학습 현황을 한눈에 확인하세요.${latest ? ` (기준 평가: ${latest.title})` : ''}`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="전체 학생 수" value={`${students.length}명`} />
        <StatCard icon={ClipboardCheck} label="진행 중인 형성평가" value={`${published.length}개`} sub={`전체 ${assessments.length}개 중 공개됨`} tone="green" />
        <StatCard icon={Percent} label="학급 평균 정답률" value={avg == null ? '-' : `${avg}%`} sub={`제출 ${subs.length}건`} />
        <StatCard icon={LifeBuoy} label="보충학습 대상 학생" value={`${remedial.size}명`} sub="보충 과제가 배정된 학생" tone="orange" />
        <StatCard icon={FileWarning} label="미제출 과제" value={`${pendingTasks}건`} sub={`전체 ${assignments.length}건 중`} tone="orange" />
        <StatCard icon={AlertCircle} label="학급 전체 취약 영역" value={weakest ? weakest.area : '-'} sub={weakest ? `정답률 ${weakest.rate}%` : '데이터 부족'} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-1 font-extrabold text-slate-800">영역별 학급 정답률</h2>
          <p className="mb-2 text-xs text-slate-400">주황: 보충 기준 미만 · 초록: 심화 기준 이상 · 회색: 문항 수 부족(판정 보류)</p>
          {areaRates.length && latestSubs.length ? (
            <RateBarChart data={areaRates.map((a) => ({ name: a.area, rate: a.rate, pending: a.pending }))} low={latest.low_cut} high={latest.high_cut} />
          ) : (
            <Empty text="공개된 평가의 제출 결과가 아직 없습니다." />
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-extrabold text-slate-800">배정된 과제 수준 분포</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={levelData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f1ff" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}건`, '과제']} />
                <Bar dataKey="count" fill="#4a8ff0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-extrabold text-slate-800">학생별 현황</h2>
          <Link to="/teacher/results" className="text-sm font-semibold text-sky-600 hover:underline">
            상세 분석 보기
          </Link>
        </div>
        {rows.length === 0 ? (
          <Empty text="학급에 학생이 없습니다. '학급·학생' 메뉴에서 추가하세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-sky-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-2.5">학생</th>
                  <th className="px-3 py-2.5">정답률</th>
                  <th className="px-3 py-2.5">취약 영역</th>
                  <th className="px-3 py-2.5">과제 진행</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ st, s, weak, done, total }) => (
                  <tr key={st.id} className="border-t border-sky-50">
                    <td className="px-5 py-3 font-semibold text-slate-700">{st.name}</td>
                    <td className="px-3 py-3">{s ? `${Math.round(s.rate)}%` : <Pill tone="gray">미응시</Pill>}</td>
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
                    <td className="px-3 py-3 text-slate-600">{total ? `${done}/${total} 완료` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
