import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CoursePage } from './pages/CoursePage';
import { Home } from './pages/Home';
import { LearnCoursePage } from './pages/LearnCoursePage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { ProfilePage } from './pages/ProfilePage';

export const router = createBrowserRouter([{ path: '/', Component: Layout, children: [
  { index: true, Component: Home },
  { path: 'courses', Component: CatalogPage },
  { path: 'courses/:slug', Component: CoursePage },
  { path: 'login', Component: AuthPage },
  { Component: RequireAuth, children: [
    { path: 'checkout/:slug', Component: CheckoutPage },
    { path: 'my-courses', Component: MyCoursesPage },
    { path: 'learn/:courseId', Component: LearnCoursePage },
    { path: 'profile', Component: ProfilePage },
  ] },
  { Component: () => <RequireAuth role="admin" />, children: [{ path: 'admin', Component: AdminPage }] },
  { path: '*', element: <Navigate to="/" replace /> },
] }]);
