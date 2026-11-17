import { createBrowserRouter, Navigate } from 'react-router-dom'

import { PublicLayout } from '../layouts/PublicLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { ProviderLayout } from '../layouts/ProviderLayout'
import { HomePage } from '../pages/public/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { VerifyOtpPage } from '../pages/auth/VerifyOtpPage'
import { ProviderApplyPage } from '../pages/provider/ProviderApplyPage'
import { ProviderVerifyOtpPage } from '../pages/provider/ProviderVerifyOtpPage'
import { ProviderLoginPage } from '../pages/provider/ProviderLoginPage'
import { ProviderDashboardPage } from '../pages/provider/ProviderDashboardPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminProviderApplicationsPage } from '../pages/admin/AdminProviderApplicationsPage'
import { CreateBookingPage } from '../pages/booking/CreateBookingPage'
import { BookingDetailPage } from '../pages/booking/BookingDetailPage'
import { ServiceSearchPage } from '../pages/catalog/ServiceSearchPage'
import { ServiceDetailPage } from '../pages/catalog/ServiceDetailPage'
import { ProviderPublicProfilePage } from '../pages/catalog/ProviderPublicProfilePage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { PublicRoute } from '../routes/PublicRoute'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { ProviderRoute } from '../routes/ProviderRoute'

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
        path: 'services',
        element: <ServiceSearchPage />,
      },
      {
        path: 'services/:serviceId',
        element: <ServiceDetailPage />,
      },
      {
        path: 'providers/:providerId',
        element: <ProviderPublicProfilePage />,
      },
      {
        path: 'booking/new',
        element: (
          <ProtectedRoute>
            <CreateBookingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/bookings/:bookingId',
        element: (
          <ProtectedRoute>
            <BookingDetailPage />
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
    path: '/provider/apply',
    element: <ProviderApplyPage />,
  },
  {
    path: '/provider/verify-otp',
    element: <ProviderVerifyOtpPage />,
  },
  {
    path: '/provider/login',
    element: <ProviderLoginPage />,
  },
  {
    path: '/provider',
    element: (
      <ProviderRoute>
        <ProviderLayout />
      </ProviderRoute>
    ),
    children: [
      {
        index: true,
        element: <ProviderDashboardPage />,
      },
    ],
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/categories" replace />,
      },
      {
        path: 'categories',
        element: <AdminCategoriesPage />,
      },
      {
        path: 'provider-applications',
        element: <AdminProviderApplicationsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
