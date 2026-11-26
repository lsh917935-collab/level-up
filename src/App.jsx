import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import TeacherLayout from './pages/teacher/TeacherLayout'
import TeacherDashboard from './pages/teacher/Dashboard'
import Classes from './pages/teacher/Classes'
import Assessments from './pages/teacher/Assessments'
import AssessmentEditor from './pages/teacher/AssessmentEditor'
import Results from './pages/teacher/Results'
import TeacherAssignments from './pages/teacher/Assignments'
import StudentLayout from './pages/student/StudentLayout'
import StudentDashboard from './pages/student/Dashboard'
import TakeAssessment from './pages/student/TakeAssessment'
import StudentResults from './pages/student/Results'
import StudentAssignments from './pages/student/Assignments'
import DoAssignment from './pages/student/DoAssignment'
import Retest from './pages/student/Retest'

function Guard({ role, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Spinner text="계정 정보를 확인하는 중..." />
  if (profile.role !== role) return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
  return children
}

function Home() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Spinner text="계정 정보를 확인하는 중..." />
  return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/teacher"
          element={
            <Guard role="teacher">
              <TeacherLayout />
            </Guard>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<Classes />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="assessments/:id" element={<AssessmentEditor />} />
          <Route path="results" element={<Results />} />
          <Route path="assignments" element={<TeacherAssignments />} />
        </Route>

        <Route
          path="/student"
          element={
            <Guard role="student">
              <StudentLayout />
            </Guard>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="assessments/:id" element={<TakeAssessment />} />
          <Route path="results/:id?" element={<StudentResults />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="assignments/:id" element={<DoAssignment />} />
          <Route path="retest/:id" element={<Retest />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
