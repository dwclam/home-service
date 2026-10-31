import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '../layouts/PublicLayout'
import { HomePage } from '../pages/public/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { VerifyOtpPage } from '../pages/auth/VerifyOtpPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { PublicRoute } from '../routes/PublicRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/verify-otp',
    element: (
      <PublicRoute>
        <VerifyOtpPage />
      </PublicRoute>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
