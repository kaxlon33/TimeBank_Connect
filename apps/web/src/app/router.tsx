import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { BrowsePage } from '@/pages/BrowsePage'
import { CreditsPage } from '@/pages/CreditsPage'
import { HoursPage } from '@/pages/HoursPage'
import { LoginPage } from '@/pages/LoginPage'
import { MySkillsPage } from '@/pages/MySkillsPage'
import { NearbyPage } from '@/pages/NearbyPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { RequestsPage } from '@/pages/RequestsPage'
import { SkillDetailPage } from '@/pages/SkillDetailPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <AppLayout />,
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
