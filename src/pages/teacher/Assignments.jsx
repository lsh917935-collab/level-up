import { Fragment, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useTeacher } from './TeacherLayout'
import { insertAssignment, regenerateAssignments, saveThresholds, updateAssignment, deleteAssignment } from '../../lib/api'
import { Btn, Card, Empty, ErrorBox, Field, LevelBadge, Modal, NeedClass, PageHeader, Pill, Spinner, inputCls } from '../../components/ui'
import { DEFAULT_AREAS, fmtDate, addDays } from '../../lib/logic'

const itemsToText = (items) => (items || []).map((i) => `${i.q} | ${String(i.answer).replace(/\|/g, '/')} | ${i.exp || ''}`).join('\n')
const textToItems = (t) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [q, ans = '', exp = ''] = l.split('|').map((x) => x.trim())
      return { type: 'short', q, answer: ans.replace(/\s*\/\s*/g, '|'), exp }
    })
    .filter((i) => i.q && i.answer)

export default function TeacherAssignments() {
  const { data, loading, classId, reload } = useTeacher()
  const [aid, setAid] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState(null)
  const [cuts, setCuts] = useState(null)
  const [open, setOpen] = useState({})

  const list = useMemo(() => (data ? data.assessments : []), [data])

  if (!classId) return <NeedClass />
  if (loading || !data) return <Spinner />
  if (list.length === 0)
    return (
      <div>
        <PageHeader title="맞춤 과제 관리" />
        <Card className="p-6">
          <Empty text="형성평가를 먼저 만들어 주세요." />
        </Card>
      </div>
    )

  const a = list.find((x) => x.id === aid) || list[list.length - 1]
  const c = cuts && cuts.id === a.id ? cuts : { id: a.id, low_cut: a.low_cut, high_cut: a.high_cut, min_items: a.min_items, due_days: a.due_days }
  const asgs = data.assignments.filter((x) => x.assessment_id === a.id)
  const areas = [...new Set([...DEFAULT_AREAS, ...a.questions.map((q) => q.area)])]

  const run = async (fn, ok) => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const r = await fn()
      await reload(true)
      if (ok) setMsg(typeof ok === 'function' ? ok(r) : ok)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const applyCuts = () => {
    const low = Number(c.low_cut)
    const high = Number(c.high_cut)
    if (!(low > 0 && high <= 100 && low < high)) return setErr('기준은 0 < 보충 기준 < 심화 기준 ≤ 100 이어야 합니다.')
    if (!window.confirm('새 기준으로 자동 배정 과제를 다시 만듭니다. (교사가 직접 수정·추가한 과제와 이미 제출된 과제는 유지됩니다.) 계속할까요?')) return
    run(
      async () => {
        const next = { ...a, low_cut: low, high_cut: high, min_items: Number(c.min_items) || 2, due_days: Number(c.due_days) || 7 }
        await saveThresholds(a.id, next)
        return regenerateAssignments(next, data.submissions, data.assignments)
      },
      (n) => `기준을 저장하고 과제 ${n}건을 새로 배정했습니다.`,
    )
  }

  const students = data.students
  const nameOf = (id) => students.find((s) => s.id === id)?.name || '(알 수 없음)'

  const openAdd = () => setEdit({ student_id: students[0]?.id || '', area: areas[0] || '', level: '기본', title: '', goal: '', due_date: addDays(a.due_days || 7), itemsText: '', origText: '', reason: '' })
  const openEdit = (x) => setEdit({ ...x, itemsText: itemsToText(x.items), origText: itemsToText(x.items) })

  const saveEdit = () => {
    if (!edit.student_id) return setErr('학생을 선택해 주세요.')
    if (!edit.area.trim()) return setErr('평가 영역을 입력해 주세요.')
    const items = edit.itemsText === edit.origText && edit.items ? edit.items : textToItems(edit.itemsText)
    const patch = {
      area: edit.area.trim(),
      level: edit.level,
      title: edit.title.trim() || `[${edit.area.trim()}] ${edit.level}학습`,
      goal: edit.goal || '',
      due_date: edit.due_date || null,
      items: items.length ? items : null,
      manual: true,
      reason: edit.reason || `교사가 직접 ${edit.id ? '수정' : '추가'}한 과제입니다.`,
    }
    const wasEdit = Boolean(edit.id)
    run(
      () => (wasEdit ? updateAssignment(edit.id, patch) : insertAssignment({ ...patch, class_id: a.class_id, assessment_id: a.id, student_id: edit.student_id })),
      wasEdit ? '과제를 수정했습니다.' : '과제를 추가했습니다.',
    ).then(() => setEdit(null))
  }

  return (
    <div>
      <PageHeader
        title="맞춤 과제 관리"
        desc="평가 영역별 정답률에 따라 자동 배정된 과제를 확인하고 수정합니다."
        actions={
          <>
            <select value={a.id} onChange={(e) => setAid(e.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-sky-700">
              {list.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
            <Btn variant="green" onClick={openAdd} disabled={students.length === 0}>
              <Plus size={16} /> 과제 추가
            </Btn>
          </>
        }
      />
      <ErrorBox message={err} />
      {msg && <div className="mb-4 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-700">{msg}</div>}

      <Card className="mb-4 p-5">
        <h2 className="mb-1 font-extrabold text-slate-800">배정 기준</h2>
        <p className="mb-3 text-xs text-slate-500">영역별 정답률이 보충 기준 미만이면 보충, 심화 기준 이상이면 심화, 그 사이는 기본학습입니다. 영역 문항 수가 최소 문항 수보다 적으면 판정을 보류합니다.</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="보충 기준(% 미만)">
            <input className={inputCls} type="number" value={c.low_cut} onChange={(e) => setCuts({ ...c, low_cut: e.target.value })} />
          </Field>
          <Field label="심화 기준(% 이상)">
            <input className={inputCls} type="number" value={c.high_cut} onChange={(e) => setCuts({ ...c, high_cut: e.target.value })} />
          </Field>
          <Field label="영역 최소 문항 수">
            <input className={inputCls} type="number" min="1" value={c.min_items} onChange={(e) => setCuts({ ...c, min_items: e.target.value })} />
          </Field>
          <Field label="제출 기한(일)">
            <input className={inputCls} type="number" min="1" value={c.due_days} onChange={(e) => setCuts({ ...c, due_days: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Btn className="w-full" onClick={applyCuts} disabled={busy}>
              <RefreshCw size={16} /> 저장 후 재배정
            </Btn>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 pb-3 font-extrabold text-slate-800">배정된 과제 ({asgs.length}건)</div>
        {asgs.length === 0 ? (
          <Empty text="배정된 과제가 없습니다. 학생이 평가를 제출하면 자동으로 생성됩니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-sky-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">학생</th>
                  <th className="px-3 py-2.5">영역</th>
                  <th className="px-3 py-2.5">정답률</th>
                  <th className="px-3 py-2.5">배정</th>
                  <th className="px-3 py-2.5">기한</th>
                  <th className="px-3 py-2.5">상태</th>
                  <th className="px-3 py-2.5">관리</th>
                </tr>
              </thead>
              <tbody>
                {[...asgs]
                  .sort((x, y) => nameOf(x.student_id).localeCompare(nameOf(y.student_id), 'ko'))
                  .map((x) => (
                    <Fragment key={x.id}>
                      <tr className="border-t border-sky-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{nameOf(x.student_id)}</td>
                        <td className="px-3 py-3">{x.area}</td>
                        <td className="px-3 py-3">{x.rate == null ? '-' : `${Math.round(x.rate)}%`}</td>
                        <td className="px-3 py-3">
                          <LevelBadge level={x.level} /> {x.manual && <Pill tone="gray">교사 수정</Pill>}
                        </td>
                        <td className="px-3 py-3">{fmtDate(x.due_date)}</td>
                        <td className="px-3 py-3">{x.status === 'submitted' ? <Pill tone="green">제출 완료{x.score != null ? ` (${x.score}점)` : ''}</Pill> : <Pill tone="orange">미제출</Pill>}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Btn size="sm" variant="ghost" onClick={() => setOpen({ ...open, [x.id]: !open[x.id] })}>
                              이유
                            </Btn>
                            <Btn size="sm" variant="ghost" onClick={() => openEdit(x)}>
                              <Pencil size={13} />
                            </Btn>
                            <Btn
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm('이 과제를 삭제할까요?')) run(() => deleteAssignment(x.id), '과제를 삭제했습니다.')
                              }}
                            >
                              <Trash2 size={13} />
                            </Btn>
                          </div>
                        </td>
                      </tr>
                      {open[x.id] && (
                        <tr key={`${x.id}-r`} className="bg-sky-50/60">
                          <td colSpan={7} className="px-4 py-2.5 text-xs text-slate-600">
                            <b>배정 이유:</b> {x.reason}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {edit && (
        <Modal wide title={edit.id ? '과제 수정' : '과제 추가'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="학생">
                <select className={inputCls} value={edit.student_id} disabled={Boolean(edit.id)} onChange={(e) => setEdit({ ...edit, student_id: e.target.value })}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="평가 영역">
                <input className={inputCls} list="asg-areas" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} />
                <datalist id="asg-areas">
                  {areas.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </Field>
              <Field label="과제 수준">
                <select className={inputCls} value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>
                  {['보충', '기본', '심화'].map((l) => (
                    <option key={l} value={l}>
                      {l}학습
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="제출 기한">
                <input className={inputCls} type="date" value={edit.due_date || ''} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} />
              </Field>
            </div>
            <Field label="과제 제목 (비우면 자동)">
              <input className={inputCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <Field label="학습 목표 (비우면 영역·수준별 기본 목표)">
              <input className={inputCls} value={edit.goal} onChange={(e) => setEdit({ ...edit, goal: e.target.value })} />
            </Field>
            <Field label="직접 만든 문제 (선택)" hint="한 줄에 한 문제: 문제 | 정답 | 해설  (정답이 여러 개면 / 로 구분). 비워 두면 기본 과제 은행의 문제가 제공됩니다.">
              <textarea className={inputCls} rows={5} value={edit.itemsText} onChange={(e) => setEdit({ ...edit, itemsText: e.target.value })} placeholder={'Write the past form of "run". | ran | run - ran - run'} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEdit(null)}>
                취소
              </Btn>
              <Btn onClick={saveEdit} disabled={busy}>
                <Save size={16} /> 저장
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
