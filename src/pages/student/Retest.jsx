import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Send, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useStudent } from './StudentLayout'
import { fetchQuestions, submitRetest } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, LevelBadge, Pill, ProgressBar, Spinner, inputCls } from '../../components/ui'

export default function Retest() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, user, reload } = useStudent()
  const asg = data?.assignments.find((x) => x.id === id)
  const [qs, setQs] = useState(null)
  const [ans, setAns] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!asg) return
    fetchQuestions(asg.assessment_id)
      .then((l) => setQs(l.filter((q) => q.purpose === 'retest' && q.area === asg.area)))
      .catch((e) => setErr(e.message))
  }, [asg?.assessment_id, asg?.area]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Spinner />
  if (!asg || asg.level !== '보충' || asg.status !== 'submitted')
    return (
      <Card className="p-6">
        <Empty text="보충 과제를 제출한 뒤에 재평가를 볼 수 있어요.">
          <Btn onClick={() => nav('/student/assignments')}>내 과제로</Btn>
        </Empty>
      </Card>
    )
  if (!qs) return err ? <ErrorBox message={err} /> : <Spinner />
  if (qs.length === 0)
    return (
      <Card className="p-6">
        <Empty text="이 영역의 재평가 문항이 아직 없습니다." />
      </Card>
    )

  const before = Math.round(asg.rate ?? 0)
  const answered = qs.every((q) => String(ans[q.id] ?? '').trim() !== '')

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const row = await submitRetest(user, asg, qs, ans)
      setResult(row)
      await reload()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  if (result) {
    const after = Math.round(result.rate)
    const diff = after - before
    const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold text-slate-800">재평가 결과</h1>
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <Pill>{asg.area}</Pill> <LevelBadge level={asg.level} />
          </div>
          <div className="my-5 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500">처음 평가</div>
              <div className="text-3xl font-extrabold text-orange-500">{before}%</div>
              <ProgressBar value={before} tone="sky" />
            </div>
            <div>
              <div className="text-xs text-slate-500">재평가</div>
              <div className="text-3xl font-extrabold text-leaf-600">{after}%</div>
              <ProgressBar value={after} />
            </div>
          </div>
          <div className={`flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-extrabold ${diff > 0 ? 'bg-leaf-50 text-leaf-700' : diff < 0 ? 'bg-orange-50 text-orange-700' : 'bg-sky-50 text-sky-700'}`}>
            <Icon size={18} /> {diff > 0 ? `${diff}%p 올랐어요! 정말 잘했어요 🎉` : diff < 0 ? `${Math.abs(diff)}%p 내려갔어요. 해설을 다시 보고 도전해 봐요.` : '처음과 같아요. 한 번 더 도전해 볼까요?'}
          </div>
          <div className="mt-2 text-center text-xs text-slate-500">
            {result.total}문항 중 {result.correct}문항 정답
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Btn
              variant="ghost"
              onClick={() => {
                setResult(null)
                setAns({})
              }}
            >
              다시 응시
            </Btn>
            <Link to={`/student/results/${asg.assessment_id}`} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
              내 결과 보기
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Link to={`/student/assignments/${asg.id}`} className="mb-3 inline-block text-sm font-bold text-sky-600 hover:underline">
        ← 과제로 돌아가기
      </Link>
      <h1 className="text-2xl font-extrabold text-slate-800">{asg.area} 재평가</h1>
      <p className="mb-4 text-sm text-slate-500">보충학습 후 얼마나 성장했는지 확인해 봐요. 처음 평가 정답률: {before}%</p>
      <ErrorBox message={err} />
      <ol className="space-y-3">
        {qs.map((q, i) => (
          <Card key={q.id} className="p-5">
            <div className="mb-2 text-xs font-bold text-sky-600">문제 {i + 1}</div>
            <p className="mb-3 font-bold text-slate-800">{q.content}</p>
            {q.qtype === 'mc' ? (
              <div className="space-y-2">
                {(q.options || []).map((o) => (
                  <button key={o} type="button" onClick={() => setAns({ ...ans, [q.id]: o })} className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold ${ans[q.id] === o ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-sky-100 text-slate-700 hover:border-sky-300'}`}>
                    {o}
                  </button>
                ))}
              </div>
            ) : q.qtype === 'fix' ? (
              <textarea className={inputCls} rows={2} value={ans[q.id] || ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} />
            ) : (
              <input className={inputCls} value={ans[q.id] || ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} autoComplete="off" autoCapitalize="off" />
            )}
          </Card>
        ))}
      </ol>
      <div className="mt-5 flex justify-end">
        <Btn variant="green" disabled={busy || !answered} onClick={submit}>
          <Send size={16} /> {busy ? '채점 중...' : '재평가 제출'}
        </Btn>
      </div>
    </div>
  )
}
