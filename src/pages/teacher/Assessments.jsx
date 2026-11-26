import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, EyeOff, Clock } from 'lucide-react'
import { useTeacher } from './TeacherLayout'
import { deleteAssessment, setAssessmentStatus } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, NeedClass, PageHeader, Pill, Spinner } from '../../components/ui'
import { mainQuestions } from '../../lib/logic'

export default function Assessments() {
  const { data, loading, classId, reload } = useTeacher()
  const nav = useNavigate()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!classId) return <NeedClass />
  if (loading || !data) return <Spinner />

  const act = async (fn) => {
    setBusy(true)
    setErr('')
    try {
      await fn()
      await reload(true)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  return (
    <div>
      <PageHeader
        title="형성평가"
        desc="문항을 직접 등록하고, 저장한 뒤 학생에게 공개합니다."
        actions={
          <Btn variant="green" onClick={() => nav('/teacher/assessments/new')}>
            <Plus size={16} /> 새 형성평가
          </Btn>
        }
      />
      <ErrorBox message={err} />
      {data.assessments.length === 0 ? (
        <Card className="p-6">
          <Empty text="등록된 형성평가가 없습니다." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.assessments.map((a) => {
            const main = mainQuestions(a)
            const submitted = data.submissions.filter((s) => s.assessment_id === a.id).length
            const areas = [...new Set(main.map((q) => q.area))]
            return (
              <Card key={a.id} className="flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-slate-800">{a.title}</h3>
                  {a.status === 'published' ? <Pill tone="green">공개 중</Pill> : <Pill tone="gray">임시 저장</Pill>}
                </div>
                <div className="mb-3 text-xs text-slate-500">
                  {a.grade} · {a.unit || '단원 미입력'} · <Clock size={12} className="inline" /> {a.time_limit}분
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {areas.map((x) => (
                    <Pill key={x}>{x}</Pill>
                  ))}
                </div>
                <div className="mb-4 text-sm text-slate-600">
                  본 평가 {main.length}문항 · 제출 {submitted}명
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link to={`/teacher/assessments/${a.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                    <Pencil size={14} /> 편집
                  </Link>
                  <Btn size="sm" variant={a.status === 'published' ? 'ghost' : 'green'} disabled={busy} onClick={() => act(() => setAssessmentStatus(a.id, a.status === 'published' ? 'draft' : 'published'))}>
                    {a.status === 'published' ? (
                      <>
                        <EyeOff size={14} /> 비공개로 전환
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> 학생에게 공개
                      </>
                    )}
                  </Btn>
                  <Btn
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm('평가와 학생 제출 결과, 배정된 과제가 모두 삭제됩니다. 삭제할까요?')) act(() => deleteAssessment(a.id))
                    }}
                  >
                    <Trash2 size={14} /> 삭제
                  </Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
