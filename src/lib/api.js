import { supabase } from './supabase'
import { gradeSubmission, planAssignments, computeStats, mainQuestions } from './logic'

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

/* ===================== 교사 ===================== */
export const listClasses = async (uid) =>
  ok(await supabase.from('classes').select('*').eq('teacher_id', uid).order('created_at'))

export const createClass = async (name, uid) =>
  ok(await supabase.from('classes').insert({ name, teacher_id: uid }).select().single())

export const deleteClass = async (id) => ok(await supabase.from('classes').delete().eq('id', id))

export const addStudent = async (classId, email) =>
  ok(await supabase.rpc('add_student_by_email', { cid: classId, student_email: email }))

export const removeStudent = async (classId, studentId) =>
  ok(await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId))

export async function loadClassData(classId) {
  const [mem, asm, sub, asg, rt] = await Promise.all([
    supabase.from('class_members').select('student_id, profiles(id,name,email)').eq('class_id', classId),
    supabase.from('assessments').select('*').eq('class_id', classId).order('created_at'),
    supabase.from('submissions').select('*').eq('class_id', classId),
    supabase.from('assignments').select('*').eq('class_id', classId).order('created_at'),
    supabase.from('retests').select('*').eq('class_id', classId).order('created_at'),
  ])
  const assessments = ok(asm)
  let questions = []
  if (assessments.length) {
    questions = ok(
      await supabase
        .from('questions')
        .select('*')
        .in('assessment_id', assessments.map((a) => a.id))
        .order('position'),
    )
  }
  return {
    students: ok(mem)
      .map((m) => m.profiles)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    assessments: assessments.map((a) => ({ ...a, questions: questions.filter((q) => q.assessment_id === a.id) })),
    submissions: ok(sub),
    assignments: ok(asg),
    retests: ok(rt),
  }
}

export async function saveAssessment(classId, a, questions, removedIds = []) {
  const base = {
    class_id: classId,
    title: a.title,
    grade: a.grade,
    unit: a.unit,
    time_limit: Number(a.time_limit) || 20,
    status: a.status || 'draft',
  }
  let id = a.id
  if (id) {
    ok(await supabase.from('assessments').update(base).eq('id', id))
  } else {
    id = ok(await supabase.from('assessments').insert(base).select().single()).id
  }
  if (removedIds.length) ok(await supabase.from('questions').delete().in('id', removedIds))

  const counter = { main: 0, retest: 0 }
  for (const q of questions) {
    const purpose = q.purpose || 'main'
    counter[purpose] += 1
    const row = {
      assessment_id: id,
      purpose,
      position: purpose === 'retest' ? 100 + counter[purpose] : counter[purpose],
      content: q.content,
      qtype: q.qtype,
      options: q.qtype === 'mc' ? q.options : null,
      answer: q.answer,
      points: Number(q.points) || 10,
      area: q.area,
      difficulty: q.difficulty || '중',
      explanation: q.explanation || '',
    }
    if (q.id) ok(await supabase.from('questions').update(row).eq('id', q.id))
    else ok(await supabase.from('questions').insert(row))
  }
  return id
}

export const setAssessmentStatus = async (id, status) =>
  ok(await supabase.from('assessments').update({ status }).eq('id', id))

export const deleteAssessment = async (id) => ok(await supabase.from('assessments').delete().eq('id', id))

export const saveThresholds = async (id, t) =>
  ok(
    await supabase
      .from('assessments')
      .update({ low_cut: t.low_cut, high_cut: t.high_cut, min_items: t.min_items, due_days: t.due_days })
      .eq('id', id),
  )

// 교사가 수정한(manual) 과제와 이미 제출된 과제는 보존하고, 나머지 자동 배정 과제를 새 기준으로 다시 만든다.
export async function regenerateAssignments(assessment, submissions, assignments) {
  const mine = assignments.filter((a) => a.assessment_id === assessment.id)
  const toDelete = mine.filter((a) => !a.manual && a.status !== 'submitted').map((a) => a.id)
  if (toDelete.length) ok(await supabase.from('assignments').delete().in('id', toDelete))
  const kept = mine.filter((a) => !toDelete.includes(a.id))
  const mainQs = mainQuestions(assessment)
  const rows = []
  for (const s of submissions.filter((x) => x.assessment_id === assessment.id)) {
    const stats = computeStats(mainQs, s.results, assessment.min_items)
    const skip = kept.filter((a) => a.student_id === s.student_id).map((a) => a.area)
    planAssignments({
      areaStats: stats,
      low: assessment.low_cut,
      high: assessment.high_cut,
      dueDays: assessment.due_days,
      skipAreas: skip,
    }).forEach((p) =>
      rows.push({ ...p, class_id: assessment.class_id, assessment_id: assessment.id, student_id: s.student_id }),
    )
  }
  if (rows.length) ok(await supabase.from('assignments').insert(rows))
  return rows.length
}

export const insertAssignment = async (row) => ok(await supabase.from('assignments').insert(row))
export const updateAssignment = async (id, patch) => ok(await supabase.from('assignments').update(patch).eq('id', id))
export const deleteAssignment = async (id) => ok(await supabase.from('assignments').delete().eq('id', id))

/* ===================== 학생 ===================== */
export async function loadStudentData(uid) {
  const [mem, sub, asg, rt] = await Promise.all([
    supabase.from('class_members').select('class_id, classes(id,name)').eq('student_id', uid),
    supabase.from('submissions').select('*').eq('student_id', uid),
    supabase.from('assignments').select('*').eq('student_id', uid).order('created_at'),
    supabase.from('retests').select('*').eq('student_id', uid).order('created_at'),
  ])
  const classes = ok(mem).map((m) => m.classes).filter(Boolean)
  const assessments = classes.length
    ? ok(
        await supabase
          .from('assessments')
          .select('*')
          .in('class_id', classes.map((c) => c.id))
          .order('created_at'),
      )
    : []
  return { classes, assessments, submissions: ok(sub), assignments: ok(asg), retests: ok(rt) }
}

export const fetchQuestions = async (assessmentId) =>
  ok(await supabase.from('questions').select('*').eq('assessment_id', assessmentId).order('position'))

async function insertPlans(user, assessment, areaStats) {
  const plans = planAssignments({
    areaStats,
    low: assessment.low_cut,
    high: assessment.high_cut,
    dueDays: assessment.due_days,
  })
  if (plans.length) {
    ok(
      await supabase
        .from('assignments')
        .insert(plans.map((p) => ({ ...p, class_id: assessment.class_id, assessment_id: assessment.id, student_id: user.id }))),
    )
  }
}

export async function submitAssessment(user, assessment, questions, answers) {
  const main = questions.filter((q) => q.purpose === 'main')
  const g = gradeSubmission(main, answers, assessment.min_items)
  const sub = ok(
    await supabase
      .from('submissions')
      .insert({ class_id: assessment.class_id, assessment_id: assessment.id, student_id: user.id, answers, ...g })
      .select()
      .single(),
  )
  await insertPlans(user, assessment, g.area_stats)
  return sub
}

// 제출은 되었지만 과제 생성이 실패한 경우를 복구
export async function ensureAssignments(user, assessment, submission) {
  await insertPlans(user, assessment, submission.area_stats)
}

export const submitAssignmentWork = async (id, answers, score) =>
  ok(
    await supabase
      .from('assignments')
      .update({ status: 'submitted', answers, score, submitted_at: new Date().toISOString() })
      .eq('id', id),
  )

export async function submitRetest(user, asg, questions, answers) {
  const g = gradeSubmission(questions, answers, 1)
  const correct = questions.filter((q) => g.results[q.id]).length
  return ok(
    await supabase
      .from('retests')
      .insert({
        assignment_id: asg.id,
        class_id: asg.class_id,
        assessment_id: asg.assessment_id,
        student_id: user.id,
        area: asg.area,
        answers,
        correct,
        total: questions.length,
        rate: g.rate,
      })
      .select()
      .single(),
  )
}
