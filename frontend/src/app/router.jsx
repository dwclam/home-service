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
import { ProviderProfilePage } from '../pages/provider/ProviderProfilePage'
import { ProviderServicesPage } from '../pages/provider/ProviderServicesPage'
import { ProviderAvailabilityPage } from '../pages/provider/ProviderAvailabilityPage'
import { ProviderBookingsPage } from '../pages/provider/ProviderBookingsPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminProviderApplicationsPage } from '../pages/admin/AdminProviderApplicationsPage'
import { AdminBookingsPage } from '../pages/admin/AdminBookingsPage'
import { AdminBookingDetailPage } from '../pages/admin/AdminBookingDetailPage'
import { CreateBookingPage } from '../pages/booking/CreateBookingPage'
import { BookingDetailPage } from '../pages/booking/BookingDetailPage'
import { CustomerBookingsPage } from '../pages/customer/CustomerBookingsPage'
import { CustomerComplaintsPage } from '../pages/customer/CustomerComplaintsPage'
import { CustomerComplaintDetailPage } from '../pages/customer/CustomerComplaintDetailPage'
import { ServiceSearchPage } from '../pages/catalog/ServiceSearchPage'
import { ServiceDetailPage } from '../pages/catalog/ServiceDetailPage'
import { ProviderPublicProfilePage } from '../pages/catalog/ProviderPublicProfilePage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { PublicRoute } from '../routes/PublicRoute'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { ProviderRoute } from '../routes/ProviderRoute'
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
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
            <CreateBookingPage />
          </ProtectedRoute>
        ),
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
      {
        path: 'customer/bookings/:bookingId',
        element: (
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
            <BookingDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/complaints',
        element: (
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
            <CustomerComplaintsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/complaints/:complaintId',
        element: (
          <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
            <CustomerComplaintDetailPage />
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
      {
        path: 'bookings',
        element: <ProviderBookingsPage />,
      },
      {
        path: 'services',
        element: <ProviderServicesPage />,
      },
      {
        path: 'availability',
        element: <ProviderAvailabilityPage />,
      },
      {
        path: 'profile',
        element: <ProviderProfilePage />,
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
        element: <Navigate to="/admin/bookings" replace />,
      },
      {
        path: 'bookings',
        element: <AdminBookingsPage />,
      },
      {
        path: 'bookings/:bookingId',
        element: <AdminBookingDetailPage />,
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
