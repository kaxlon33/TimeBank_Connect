import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminShell } from '@/features/admin/AdminShell'
import { AppLayout } from './layouts/AppLayout'
import { RedirectIfSignedIn, RequireAuth } from './RequireAuth'
import { AdminMembersPage } from '@/pages/admin/AdminMembersPage'
import { AdminModerationPage } from '@/pages/admin/AdminModerationPage'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { BrowsePage } from '@/pages/BrowsePage'
import { CreditsPage } from '@/pages/CreditsPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { HoursPage } from '@/pages/HoursPage'
import { LoginPage } from '@/pages/LoginPage'
import { MySkillsPage } from '@/pages/MySkillsPage'
import { NearbyPage } from '@/pages/NearbyPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { RequestsPage } from '@/pages/RequestsPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SkillDetailPage } from '@/pages/SkillDetailPage'

export const router = createBrowserRouter([
  { path: '/login', element: <RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn> },
  { path: '/register', element: <RedirectIfSignedIn><RegisterPage /></RedirectIfSignedIn> },
  { path: '/forgot-password', element: <RedirectIfSignedIn><ForgotPasswordPage /></RedirectIfSignedIn> },
  { path: '/reset-password', element: <RedirectIfSignedIn><ResetPasswordPage /></RedirectIfSignedIn> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <BrowsePage /> },
      { path: '/skills/:id', element: <SkillDetailPage /> },
      { path: '/nearby', element: <NearbyPage /> },
      { path: '/requests', element: <RequestsPage /> },
      { path: '/credits', element: <CreditsPage /> },
      { path: '/my-skills', element: <MySkillsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/hours', element: <HoursPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
    ],
  },
  {
    element: (
      <RequireAuth role="admin">
        <AdminShell />
      </RequireAuth>
    ),
    children: [
      { path: '/admin', element: <AdminOverviewPage /> },
      { path: '/admin/members', element: <AdminMembersPage /> },
      { path: '/admin/moderation', element: <AdminModerationPage /> },
      { path: '/admin/settings', element: <AdminSettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
})
