import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { BrowsePage } from '@/pages/BrowsePage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { LoginPage } from '@/pages/LoginPage'
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
      { path: '/nearby', element: <ComingSoonPage title="Nearby helpers" /> },
      { path: '/requests', element: <RequestsPage /> },
      { path: '/credits', element: <ComingSoonPage title="Credits" /> },
      { path: '/my-skills', element: <ComingSoonPage title="My skills" /> },
      { path: '/profile', element: <ComingSoonPage title="Profile" /> },
      { path: '/notifications', element: <ComingSoonPage title="Notifications" /> },
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
