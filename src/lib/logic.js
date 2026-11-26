// 채점 · 영역별 분석 · 맞춤 과제 배정 핵심 로직 (순수 함수 모음)

export const LEVELS = ['보충', '기본', '심화']
export const DEFAULT_AREAS = ['일반동사 과거형', '불규칙 동사', '의문문 구성', '부정문 구성']

export const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return ymd(d)
}
export const fmtDate = (s) => (s ? String(s).slice(0, 10) : '-')
export const todayStr = () => ymd(new Date())

/* ---------- 채점 ---------- */
export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.!?]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

// item.answer 는 여러 정답을 | 로 구분
export function isCorrect(item, userAnswer) {
  if (userAnswer == null || String(userAnswer).trim() === '') return false
  const accepted = String(item.answer).split('|').map(norm)
  return accepted.includes(norm(userAnswer))
}

export function computeStats(questions, results, minItems = 2) {
  const stats = {}
  for (const q of questions) {
    const s = (stats[q.area] ||= { earned: 0, total: 0, count: 0 })
    s.total += q.points
    s.count += 1
    if (results?.[q.id]) s.earned += q.points
  }
  for (const s of Object.values(stats)) {
    s.rate = s.total ? Math.round((s.earned * 100) / s.total) : 0
    s.pending = s.count < minItems // 문항 수 부족: 성취도 확정 보류
  }
  return stats
}

export function gradeSubmission(questions, answers, minItems = 2) {
  const results = {}
  for (const q of questions) results[q.id] = isCorrect(q, answers[q.id])
  const area_stats = computeStats(questions, results, minItems)
  const total = questions.reduce((a, q) => a + q.points, 0)
  const score = questions.reduce((a, q) => a + (results[q.id] ? q.points : 0), 0)
  return { results, area_stats, score, total, rate: total ? Math.round((score * 100) / total) : 0 }
}

/* ---------- 맞춤 과제 배정 ---------- */
export function levelFor(rate, low, high) {
  if (rate < low) return '보충'
  if (rate >= high) return '심화'
  return '기본'
}

export function reasonText(area, st, level, low, high) {
  const base = `${area} 영역 정답률 ${st.rate}%(${st.earned}/${st.total}점)`
  if (level === '보충') return `${base}로 기준(${low}% 미만)에 해당하여 기초를 다지는 보충학습이 배정되었습니다.`
  if (level === '심화') return `${base}로 기준(${high}% 이상)을 충족하여 응용·확장 문제 중심의 심화학습이 배정되었습니다.`
  return `${base}로 ${low}~${high - 1}% 구간에 해당하여 기본학습이 배정되었습니다.`
}

// 영역별로 과제 1개씩 생성. 문항 수가 부족한 영역(pending)은 배정하지 않는다.
export function planAssignments({ areaStats, low, high, dueDays, skipAreas = [] }) {
  const due_date = addDays(dueDays ?? 7)
  return Object.entries(areaStats)
    .filter(([area, st]) => !st.pending && !skipAreas.includes(area))
    .map(([area, st]) => {
      const level = levelFor(st.rate, low, high)
      return {
        area,
        level,
        rate: st.rate,
        reason: reasonText(area, st, level, low, high),
        title: `[${area}] ${level}학습`,
        goal: '',
        due_date,
      }
    })
}

/* ---------- 교사용 분석 ---------- */
export function questionRates(questions, submissions) {
  return questions.map((q) => {
    const n = submissions.length
    const c = submissions.filter((s) => s.results?.[q.id]).length
    return { ...q, correct: c, n, rate: n ? Math.round((c * 100) / n) : 0 }
  })
}

export function classAreaRates(questions, submissions, minItems = 2) {
  const map = {}
  for (const q of questions) {
    const m = (map[q.area] ||= { area: q.area, count: 0, earned: 0, total: 0 })
    m.count += 1
    for (const s of submissions) {
      m.total += q.points
      if (s.results?.[q.id]) m.earned += q.points
    }
  }
  return Object.values(map).map((m) => ({
    ...m,
    rate: m.total ? Math.round((m.earned * 100) / m.total) : 0,
    pending: m.count < minItems,
  }))
}

export const weakAreasOf = (stats, low) =>
  Object.entries(stats)
    .filter(([, s]) => !s.pending && s.rate < low)
    .map(([a]) => a)

export function latestRetest(retests, studentId, assessmentId, area) {
  const list = retests.filter(
    (r) => r.student_id === studentId && r.assessment_id === assessmentId && r.area === area,
  )
  return list.length ? list[list.length - 1] : null
}

export const mainQuestions = (a) => (a?.questions || []).filter((q) => q.purpose === 'main')
export const retestQuestions = (a) => (a?.questions || []).filter((q) => q.purpose === 'retest')
