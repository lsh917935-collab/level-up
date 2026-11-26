import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Send, Pencil, AlertTriangle } from 'lucide-react'
import { useStudent } from './StudentLayout'
import { fetchQuestions, submitAssessment } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, Spinner, ProgressBar, inputCls } from '../../components/ui'

const TYPE_LABEL = { mc: '객관식', short: '단답형', fix: '문장 오류 수정' }
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function TakeAssessment() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, user, reload } = useStudent()
  const [qs, setQs] = useState(null)
  const [answers, setAnswers] = useState({})
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState('quiz')
  const [left, setLeft] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const answersRef = useRef({})
  const deadline = useRef(null)
  const sent = useRef(false)

  const a = data?.assessments.find((x) => x.id === id)
  const already = data?.submissions.some((s) => s.assessment_id === id)

  useEffect(() => {
    if (!a || already || qs) return
    fetchQuestions(id)
      .then((list) => {
        setQs(list.filter((q) => q.purpose === 'main'))
        deadline.current = Date.now() + a.time_limit * 60000
        setLeft(a.time_limit * 60)
      })
      .catch((e) => setErr(e.message))
  }, [a, already, qs, id])

  const doSubmit = async () => {
    if (sent.current) return
    sent.current = true
    setBusy(true)
    setErr('')
    try {
      await submitAssessment(user, a, qs, answersRef.current)
      await reload()
      nav(`/student/results/${id}`, { replace: true })
    } catch (e) {
      sent.current = false
      setBusy(false)
      setErr(e.message)
    }
  }
  const submitRef = useRef(doSubmit)
  submitRef.current = doSubmit

  useEffect(() => {
    if (!qs) return
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setLeft(s)
      if (s <= 0) {
        clearInterval(t)
        submitRef.current()
      }
    }, 1000)
    return () => clearInterval(t)
  }, [qs])

  if (!data) return <Spinner />
  if (!a)
    return (
      <Card className="p-6">
        <Empty text="응시할 수 있는 평가를 찾을 수 없습니다." />
      </Card>
    )
  if (already && !busy) return <Navigate to={`/student/results/${id}`} replace />
  if (!qs) return err ? <ErrorBox message={err} /> : <Spinner text="문제를 불러오는 중..." />
  if (qs.length === 0)
    return (
      <Card className="p-6">
        <Empty text="이 평가에는 아직 문항이 없습니다." />
      </Card>
    )

  const setAns = (qid, v) => {
    answersRef.current = { ...answersRef.current, [qid]: v }
    setAnswers(answersRef.current)
  }
  const answered = qs.filter((q) => String(answers[q.id] ?? '').trim() !== '').length
  const q = qs[idx]

  if (stage === 'review') {
    const unanswered = qs.length - answered
    return (
      <div>
        <h1 className="mb-1 text-2xl font-extrabold text-slate-800">제출 전 답안 확인</h1>
        <p className="mb-4 text-sm text-slate-500">
          남은 시간 <b className="text-sky-600">{mmss(left ?? 0)}</b> · 최종 제출하면 자동 채점되고 수정할 수 없습니다.
        </p>
        <ErrorBox message={err} />
        {unanswered > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <AlertTriangle size={16} /> 답하지 않은 문제가 {unanswered}개 있어요.
          </div>
        )}
        <Card className="mb-4 divide-y divide-sky-50">
          {qs.map((x, i) => {
            const v = String(answers[x.id] ?? '').trim()
            return (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-extrabold text-sky-700">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-600">{x.content}</div>
                  <div className={`text-sm font-bold ${v ? 'text-slate-800' : 'text-orange-500'}`}>{v || '미응답'}</div>
                </div>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIdx(i)
                    setStage('quiz')
                  }}
                >
                  <Pencil size={13} /> 수정
                </Btn>
              </div>
            )
          })}
        </Card>
        <div className="flex justify-between gap-2">
          <Btn variant="ghost" onClick={() => setStage('quiz')} disabled={busy}>
            <ChevronLeft size={16} /> 문제로 돌아가기
          </Btn>
          <Btn
            variant="green"
            disabled={busy}
            onClick={() => {
              if (unanswered > 0 && !window.confirm(`답하지 않은 문제가 ${unanswered}개 있습니다. 그래도 제출할까요?`)) return
              doSubmit()
            }}
          >
            <Send size={16} /> {busy ? '채점 중...' : '최종 제출'}
          </Btn>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">{a.title}</h1>
          <p className="text-xs text-slate-500">
            {idx + 1} / {qs.length}번 · 답한 문제 {answered}개
          </p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-extrabold ${left != null && left < 60 ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'}`}>
          <Clock size={16} /> {mmss(left ?? 0)}
        </div>
      </div>
      <ProgressBar value={((idx + 1) * 100) / qs.length} tone="sky" />
      <ErrorBox message={err} />

      <div className="my-4 flex flex-wrap gap-1.5">
        {qs.map((x, i) => {
          const has = String(answers[x.id] ?? '').trim() !== ''
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-9 w-9 rounded-lg text-sm font-bold ${i === idx ? 'bg-sky-600 text-white' : has ? 'bg-leaf-100 text-leaf-700' : 'bg-white text-slate-500 ring-1 ring-sky-200'}`}
              aria-label={`${i + 1}번 문제로 이동`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-2 text-xs font-bold text-leaf-600">
          {idx + 1}번 · {TYPE_LABEL[q.qtype]} · {q.points}점
        </div>
        <p className="mb-4 text-lg font-bold leading-relaxed text-slate-800">{q.content}</p>

        {q.qtype === 'mc' ? (
          <div className="space-y-2">
            {(q.options || []).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setAns(q.id, o)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${answers[q.id] === o ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-sky-100 bg-white text-slate-700 hover:border-sky-300'}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${answers[q.id] === o ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>
                  {answers[q.id] === o && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                {o}
              </button>
            ))}
          </div>
        ) : q.qtype === 'fix' ? (
          <textarea className={inputCls} rows={2} placeholder="바르게 고친 문장을 쓰세요" value={answers[q.id] || ''} onChange={(e) => setAns(q.id, e.target.value)} />
        ) : (
          <input className={inputCls} placeholder="정답을 입력하세요" value={answers[q.id] || ''} onChange={(e) => setAns(q.id, e.target.value)} autoComplete="off" autoCapitalize="off" />
        )}
      </Card>

      <div className="mt-4 flex justify-between gap-2">
        <Btn variant="ghost" onClick={() => setIdx((i) => i - 1)} disabled={idx === 0}>
          <ChevronLeft size={16} /> 이전
        </Btn>
        {idx < qs.length - 1 ? (
          <Btn onClick={() => setIdx((i) => i + 1)}>
            다음 <ChevronRight size={16} />
          </Btn>
        ) : (
          <Btn variant="green" onClick={() => setStage('review')}>
            제출 전 확인 <ChevronRight size={16} />
          </Btn>
        )}
      </div>
    </div>
  )
}
