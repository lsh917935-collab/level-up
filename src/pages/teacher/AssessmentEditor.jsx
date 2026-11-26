import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Save, Send, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useTeacher } from './TeacherLayout'
import { saveAssessment } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, Field, Modal, NeedClass, PageHeader, Pill, Spinner, inputCls } from '../../components/ui'
import { DEFAULT_AREAS } from '../../lib/logic'

const TYPE_LABEL = { mc: '객관식', short: '단답형', fix: '문장 오류 수정형' }
let keySeq = 0
const newKey = () => `new-${++keySeq}`

const blankQ = (purpose = 'main') => ({
  _key: newKey(),
  purpose,
  qtype: 'mc',
  content: '',
  options: ['', '', '', ''],
  correct: 0,
  answer: '',
  points: 10,
  area: '',
  difficulty: '중',
  explanation: '',
})

const toDraft = (q) => {
  const options = q.qtype === 'mc' ? [...(q.options || []), '', '', '', ''].slice(0, Math.max(4, (q.options || []).length)) : ['', '', '', '']
  const correct = q.qtype === 'mc' ? Math.max(0, options.indexOf(q.answer)) : 0
  return { ...q, _key: q.id || newKey(), options, correct, answer: q.qtype === 'mc' ? '' : q.answer }
}

export default function AssessmentEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const { data, loading, classId, cls, reload } = useTeacher()

  const [form, setForm] = useState({ title: '', grade: '중3', unit: '', time_limit: 20, status: 'draft' })
  const [questions, setQuestions] = useState([])
  const [removed, setRemoved] = useState([])
  const [tab, setTab] = useState('main')
  const [draft, setDraft] = useState(null)
  const [draftErr, setDraftErr] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(isNew)

  useEffect(() => {
    if (isNew || !data || ready) return
    const a = data.assessments.find((x) => x.id === id)
    if (a) {
      setForm({ id: a.id, title: a.title, grade: a.grade, unit: a.unit, time_limit: a.time_limit, status: a.status })
      setQuestions(a.questions.map((q) => ({ ...q, _key: q.id })))
    }
    setReady(true)
  }, [data, id, isNew, ready])

  const minItems = !isNew ? data?.assessments.find((x) => x.id === id)?.min_items ?? 2 : 2
  const areaSuggestions = useMemo(() => [...new Set([...DEFAULT_AREAS, ...questions.map((q) => q.area).filter(Boolean)])], [questions])
  const areaCounts = useMemo(() => {
    const m = {}
    questions.filter((q) => q.purpose === 'main').forEach((q) => (m[q.area] = (m[q.area] || 0) + 1))
    return m
  }, [questions])

  if (!classId) return <NeedClass />
  if (loading || !data || !ready) return <Spinner />
  if (!isNew && !data.assessments.find((x) => x.id === id)) {
    return (
      <Card className="p-6">
        <Empty text="평가를 찾을 수 없습니다.">
          <Btn onClick={() => nav('/teacher/assessments')}>목록으로</Btn>
        </Empty>
      </Card>
    )
  }

  const shown = questions.filter((q) => q.purpose === tab)

  const saveDraft = () => {
    const d = draft
    if (!d.content.trim()) return setDraftErr('문제 내용을 입력해 주세요.')
    if (!d.area.trim()) return setDraftErr('평가 영역을 입력하거나 선택해 주세요.')
    if (!(Number(d.points) > 0)) return setDraftErr('배점은 1 이상이어야 합니다.')
    let q = { ...d, content: d.content.trim(), area: d.area.trim(), points: Number(d.points) }
    if (d.qtype === 'mc') {
      const opts = d.options.map((o) => o.trim())
      if (opts.filter(Boolean).length < 2) return setDraftErr('보기를 2개 이상 입력해 주세요.')
      if (!opts[d.correct]) return setDraftErr('정답으로 선택한 보기가 비어 있습니다.')
      q.options = opts.filter(Boolean)
      q.answer = opts[d.correct]
    } else {
      if (!d.answer.trim()) return setDraftErr('정답을 입력해 주세요. (정답이 여러 개면 | 로 구분)')
      q.answer = d.answer.trim()
      q.options = null
    }
    delete q.correct
    setQuestions((list) => (list.some((x) => x._key === q._key) ? list.map((x) => (x._key === q._key ? q : x)) : [...list, q]))
    setDraft(null)
    setDraftErr('')
  }

  const removeQ = (q) => {
    if (!window.confirm('이 문항을 삭제할까요?')) return
    if (q.id) setRemoved((r) => [...r, q.id])
    setQuestions((list) => list.filter((x) => x._key !== q._key))
  }

  const save = async (publish) => {
    setErr('')
    if (!form.title.trim()) return setErr('평가 제목을 입력해 주세요.')
    if (!questions.some((q) => q.purpose === 'main')) return setErr('본 평가 문항을 1개 이상 등록해 주세요.')
    setBusy(true)
    try {
      await saveAssessment(classId, { ...form, title: form.title.trim(), status: publish ? 'published' : form.status }, questions, removed)
      await reload(true)
      nav('/teacher/assessments')
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  const setD = (patch) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div>
      <PageHeader
        title={isNew ? '새 형성평가 만들기' : '형성평가 편집'}
        desc="기본 정보와 문항을 등록하세요. 문항마다 평가 영역을 지정하면 영역별 분석과 과제 배정에 사용됩니다."
        actions={
          <Btn variant="ghost" onClick={() => nav('/teacher/assessments')}>
            <ArrowLeft size={16} /> 목록
          </Btn>
        }
      />
      <ErrorBox message={err} />

      <Card className="mb-4 p-5">
        <h2 className="mb-3 font-extrabold text-slate-800">기본 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="평가 제목">
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 과거시제 형성평가" />
          </Field>
          <Field label="평가 단원">
            <input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="예: Lesson 3. 과거시제" />
          </Field>
          <Field label="대상 학년">
            <select className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              {['중1', '중2', '중3'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="대상 학급">
            <input className={`${inputCls} bg-sky-50`} value={cls?.name || ''} readOnly />
          </Field>
          <Field label="평가 시간(분)">
            <input className={inputCls} type="number" min="1" max="120" value={form.time_limit} onChange={(e) => setForm({ ...form, time_limit: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl bg-sky-50 p-1">
            {[
              ['main', `본 평가 (${questions.filter((q) => q.purpose === 'main').length})`],
              ['retest', `재평가 문항 (${questions.filter((q) => q.purpose === 'retest').length})`],
            ].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
                {label}
              </button>
            ))}
          </div>
          <Btn variant="green" onClick={() => setDraft(blankQ(tab))}>
            <Plus size={16} /> 문항 추가
          </Btn>
        </div>

        {tab === 'main' ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(areaCounts).map(([a, n]) => (
              <span key={a} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${n < minItems ? 'bg-orange-100 text-orange-700' : 'bg-leaf-100 text-leaf-700'}`}>
                {n < minItems && <AlertTriangle size={12} />}
                {a} {n}문항{n < minItems ? ` · ${minItems}문항 미만, 성취도 판정 보류` : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-xs text-slate-500">보충학습을 마친 학생이 해당 영역의 재평가에서 풀 문항입니다. 영역마다 1문항 이상 등록하세요.</p>
        )}

        {shown.length === 0 ? (
          <Empty text="등록된 문항이 없습니다. '문항 추가'를 눌러 시작하세요." />
        ) : (
          <ol className="space-y-3">
            {shown.map((q, i) => (
              <li key={q._key} className="rounded-xl border border-sky-100 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-extrabold text-sky-700">{i + 1}.</span>
                  <Pill>{TYPE_LABEL[q.qtype]}</Pill>
                  <Pill tone="green">{q.area}</Pill>
                  <Pill tone="gray">난이도 {q.difficulty}</Pill>
                  <Pill tone="gray">{q.points}점</Pill>
                </div>
                <p className="text-sm font-semibold text-slate-700">{q.content}</p>
                {q.qtype === 'mc' && (
                  <ul className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                    {q.options?.map((o) => (
                      <li key={o} className={o === q.answer ? 'font-bold text-leaf-600' : ''}>
                        {o === q.answer ? '✓ ' : '· '}
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
                {q.qtype !== 'mc' && <p className="mt-2 text-sm text-leaf-600">정답: {q.answer}</p>}
                {q.explanation && <p className="mt-1 text-xs text-slate-400">해설: {q.explanation}</p>}
                <div className="mt-3 flex gap-2">
                  <Btn size="sm" variant="ghost" onClick={() => setDraft(toDraft(q))}>
                    <Pencil size={13} /> 수정
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => removeQ(q)}>
                    <Trash2 size={13} /> 삭제
                  </Btn>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Btn variant="ghost" disabled={busy} onClick={() => save(false)}>
          <Save size={16} /> 저장
        </Btn>
        <Btn variant="green" disabled={busy} onClick={() => save(true)}>
          <Send size={16} /> 저장 후 학생에게 공개
        </Btn>
      </div>

      {draft && (
        <Modal
          wide
          title={`${draft.purpose === 'retest' ? '재평가 ' : ''}문항 ${questions.some((x) => x._key === draft._key) ? '수정' : '추가'}`}
          onClose={() => {
            setDraft(null)
            setDraftErr('')
          }}
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="구분">
                <select className={inputCls} value={draft.purpose} onChange={(e) => setD({ purpose: e.target.value })}>
                  <option value="main">본 평가</option>
                  <option value="retest">재평가 문항</option>
                </select>
              </Field>
              <Field label="문제 유형">
                <select className={inputCls} value={draft.qtype} onChange={(e) => setD({ qtype: e.target.value })}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="난이도">
                <select className={inputCls} value={draft.difficulty} onChange={(e) => setD({ difficulty: e.target.value })}>
                  {['하', '중', '상'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="문제 내용">
              <textarea className={inputCls} rows={2} value={draft.content} onChange={(e) => setD({ content: e.target.value })} placeholder={draft.qtype === 'fix' ? '예: 다음 문장을 바르게 고쳐 쓰세요: He watch TV last night.' : '예: We ____ soccer yesterday.'} />
            </Field>

            {draft.qtype === 'mc' ? (
              <Field label="보기 (정답 보기를 선택하세요)">
                <div className="space-y-2">
                  {draft.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={draft.correct === i} onChange={() => setD({ correct: i })} className="h-4 w-4 accent-leaf-500" aria-label={`보기 ${i + 1} 정답`} />
                      <input className={inputCls} value={o} onChange={(e) => setD({ options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`보기 ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </Field>
            ) : (
              <Field label="정답" hint="정답이 여러 개이면 | 로 구분하세요. (대소문자·마지막 마침표는 구분하지 않고 채점)">
                <input className={inputCls} value={draft.answer} onChange={(e) => setD({ answer: e.target.value })} placeholder={draft.qtype === 'fix' ? 'He watched TV last night.' : 'studied'} />
              </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="평가 영역" hint="목록에서 고르거나 직접 입력할 수 있습니다.">
                <input className={inputCls} list="area-list" value={draft.area} onChange={(e) => setD({ area: e.target.value })} placeholder="예: 불규칙 동사" />
                <datalist id="area-list">
                  {areaSuggestions.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </Field>
              <Field label="배점">
                <input className={inputCls} type="number" min="1" value={draft.points} onChange={(e) => setD({ points: e.target.value })} />
              </Field>
            </div>
            <Field label="정답 해설">
              <textarea className={inputCls} rows={2} value={draft.explanation} onChange={(e) => setD({ explanation: e.target.value })} />
            </Field>
            {draftErr && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{draftErr}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="ghost" onClick={() => setDraft(null)}>
                취소
              </Btn>
              <Btn onClick={saveDraft}>문항 저장</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
