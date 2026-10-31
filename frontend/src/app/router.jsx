import { createBrowserRouter, Navigate } from 'react-router-dom'

import { PublicLayout } from '../layouts/PublicLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { HomePage } from '../pages/public/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { VerifyOtpPage } from '../pages/auth/VerifyOtpPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { CreateBookingPage } from '../pages/customer/CreateBookingPage'
import { CustomerBookingsPage } from '../pages/customer/CustomerBookingsPage'
import { ProviderProfilePage } from '../pages/provider/ProviderProfilePage'
import { ProviderServicesPage } from '../pages/provider/ProviderServicesPage'
import { ProviderAvailabilityPage } from '../pages/provider/ProviderAvailabilityPage'
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage'
import { PublicRoute } from '../routes/PublicRoute'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { ROLES } from '../constants/roles'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'customer/bookings',
        element: (
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
            <CustomerBookingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/bookings/new',
        element: (
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
            <CreateBookingPage />
          </ProtectedRoute>
        ),
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
    path: '/provider',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.PROVIDER]}>
        <DashboardLayout role={ROLES.PROVIDER} />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/provider/profile" replace />,
      },
      {
        path: 'profile',
        element: <ProviderProfilePage />,
      },
      {
        path: 'services',
        element: <ProviderServicesPage />,
      },
      {
        path: 'availability',
        element: <ProviderAvailabilityPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
        <DashboardLayout role={ROLES.ADMIN} />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminOverviewPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
