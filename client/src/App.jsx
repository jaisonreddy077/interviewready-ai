import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AppShell from './components/AppShell.jsx';
import Jobs from './pages/Jobs.jsx';
import NewJob from './pages/NewJob.jsx';
import JobDetail from './pages/JobDetail.jsx';
import QuestionBank from './pages/QuestionBank.jsx';
import InterviewStart from './pages/InterviewStart.jsx';
import InterviewRoom from './pages/InterviewRoom.jsx';
import InterviewHistory from './pages/InterviewHistory.jsx';
const Readiness = lazy(() => import('./pages/Readiness.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<Suspense fallback={<p className="text-sm text-[#819083]">Loading dashboard…</p>}><Dashboard /></Suspense>} />
      <Route path="jobs" element={<Jobs />} />
      <Route path="jobs/new" element={<NewJob />} />
      <Route path="jobs/:id" element={<JobDetail />} />
      <Route path="jobs/:id/questions" element={<QuestionBank />} />
      <Route path="jobs/:id/interview" element={<InterviewStart />} />
      <Route path="jobs/:id/readiness" element={<Suspense fallback={<p className="text-sm text-[#819083]">Loading readiness…</p>}><Readiness /></Suspense>} />
      <Route path="jobs/:id/roadmap" element={<Suspense fallback={<p className="text-sm text-[#819083]">Loading roadmap…</p>}><Roadmap /></Suspense>} />
      <Route path="interviews" element={<InterviewHistory />} />
      <Route path="interviews/:sessionId" element={<InterviewRoom />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
