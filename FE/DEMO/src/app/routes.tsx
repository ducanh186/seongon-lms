import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Courses } from './pages/Courses';
import { Combos } from './pages/Combos';
import { CourseDetail } from './pages/CourseDetail';
import { Internships } from './pages/Internships';
import { InternshipDetail } from './pages/InternshipDetail';
import { Jobs } from './pages/Jobs';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RecruiterDashboard } from './pages/RecruiterDashboard';
import { UserProfile } from './pages/UserProfile';
import { LearningStats } from './pages/LearningStats';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'courses', Component: Courses },
      { path: 'combos', Component: Combos },
      { path: 'courses/:id', Component: CourseDetail },
      { path: 'internships', Component: Internships },
      { path: 'internships/:id', Component: InternshipDetail },
      { path: 'jobs', Component: Jobs },
      { path: 'login', Component: Login },
      { path: 'dashboard', Component: StudentDashboard },
      { path: 'admin', Component: AdminDashboard },
      { path: 'recruiter', Component: RecruiterDashboard },
      { path: 'settings', Component: UserProfile },
      { path: 'learning-stats', Component: LearningStats },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);