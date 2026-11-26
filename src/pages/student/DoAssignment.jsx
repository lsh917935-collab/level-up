import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Send, Target, RefreshCw, Lightbulb } from 'lucide-react'
import { useStudent } from './StudentLayout'
import { fetchQuestions, submitAssignmentWork } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, LevelBadge, Pill, Spinner, inputCls } from '../../components/ui'
import { goalOf, resolveItems } from '../../lib/taskBank'
import { isCorrect as check } from '../../lib/logic'


export default function DoAssignment() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, reload } = useStudent()
  const asg = data?.assignments.find((x) => x.id === id)
  const [qs, setQs] = useState(null)
  const [ans, setAns] = useState({})
  const [shown, setShown] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!asg) return
    fetchQuestions(asg.assessment_id).then(setQs).catch(() => setQs([]))
  }, [asg?.assessment_id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Spinner />
  if (!asg)
    return (
      <Card className="p-6">
        <Empty text="과제를 찾을 수 없습니다.">
          <Btn onClick={() => nav('/student/assignments')}>내 과제로</Btn>
        </Empty>
      </Card>
    )
  if (!qs) return <Spinner />

  const items = resolveItems(asg, qs)
  const done = asg.status === 'submitted'
  const myAns = done ? asg.answers || {} : ans
  const allAnswered = items.every((_, i) => String(myAns[i] ?? '').trim() !== '')
  const hasRetest = qs.some((q) => q.purpose === 'retest' && q.area === asg.area)

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const correct = items.filter((it, i) => check(it, ans[i])).length
      await submitAssignmentWork(asg.id, ans, Math.round((correct * 100) / items.length))
      await reload()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  return (
    <div>
      <Link to="/student/assignments" className="mb-3 inline-block text-sm font-bold text-sky-600 hover:underline">
        ← 내 과제
      </Link>
      <Card className="mb-4 p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <LevelBadge level={asg.level} />
          <Pill>{asg.area}</Pill>
          {done && <Pill tone="green">제출 완료{asg.score != null ? ` · ${asg.score}점` : ''}</Pill>}
        </div>
        <h1 className="mb-3 text-xl font-extrabold text-slate-800">{asg.title}</h1>
        <div className="mb-2 flex gap-2 rounded-xl bg-leaf-50 p-3 text-sm text-leaf-700">
          <Target size={18} className="mt-0.5 shrink-0" />
          <div>
            <b>학습 목표</b> · {goalOf(asg)}
          </div>
        </div>
        <div className="flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-slate-600">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-sky-500" />
          <div>
            <b>이 과제가 배정된 이유</b> · {asg.reason}
          </div>
        </div>
      </Card>

      <ErrorBox message={err} />

      <ol className="space-y-3">
        {items.map((it, i) => {
          const reveal = done || shown[i]
          const right = reveal && check(it, myAns[i])
          return (
            <Card key={i} className="p-5">
              <div className="mb-2 text-xs font-bold text-sky-600">문제 {i + 1}</div>
              <p className="mb-3 font-bold leading-relaxed text-slate-800">{it.q}</p>
              {it.type === 'mc' ? (
                <div className="space-y-2">
                  {(it.options || []).map((o) => (
                    <button
                      key={o}
                      type="button"
                      disabled={done}
                      onClick={() => setAns({ ...ans, [i]: o })}
                      className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold ${myAns[i] === o ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-sky-100 text-slate-700 hover:border-sky-300'} disabled:cursor-default`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : it.type === 'fix' ? (
                <textarea className={inputCls} rows={2} disabled={done} value={myAns[i] || ''} onChange={(e) => setAns({ ...ans, [i]: e.target.value })} placeholder="바르게 고친 문장을 쓰세요" />
              ) : (
                <input className={inputCls} disabled={done} value={myAns[i] || ''} onChange={(e) => setAns({ ...ans, [i]: e.target.value })} placeholder="정답을 입력하세요" autoComplete="off" autoCapitalize="off" />
              )}

              {!done && (
                <Btn size="sm" variant="ghost" className="mt-3" disabled={String(ans[i] ?? '').trim() === ''} onClick={() => setShown({ ...shown, [i]: true })}>
                  정답 확인
                </Btn>
              )}

              {reveal && (
                <div className={`mt-3 rounded-xl p-3 text-sm ${right ? 'bg-leaf-50 text-leaf-700' : 'bg-orange-50 text-orange-700'}`}>
                  <div className="flex items-center gap-1.5 font-extrabold">
                    {right ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {right ? '정답이에요!' : '아쉬워요, 다시 확인해 보세요.'}
                  </div>
                  {!right && (
                    <div className="mt-1 text-xs">
                      정답: <b>{String(it.answer).split('|')[0]}</b>
                    </div>
                  )}
                  {it.exp && <div className="mt-1 text-xs text-slate-600">해설: {it.exp}</div>}
                </div>
              )}
            </Card>
          )
        })}
      </ol>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {!done && (
          <Btn variant="green" disabled={busy || !allAnswered} onClick={submit}>
            <Send size={16} /> {busy ? '제출 중...' : '과제 제출'}
          </Btn>
        )}
        {!done && !allAnswered && <span className="w-full text-right text-xs text-slate-400">모든 문제에 답하면 제출할 수 있어요.</span>}
        {done && asg.level === '보충' &&
          (hasRetest ? (
            <Btn onClick={() => nav(`/student/retest/${asg.id}`)}>
              <RefreshCw size={16} /> {data.retests.some((r) => r.assignment_id === asg.id) ? '재평가 다시 응시' : '이 영역 재평가 응시'}
            </Btn>
          ) : (
            <span className="text-xs text-slate-400">이 영역의 재평가 문항이 아직 없습니다.</span>
          ))}
      </div>
    </div>
  )
}
