export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  PROVIDER: 'PROVIDER',
  ADMIN: 'ADMIN',
}

export const ROLE_LABELS = {
  [ROLES.CUSTOMER]: 'Khách hàng',
  [ROLES.PROVIDER]: 'Nhà cung cấp',
  [ROLES.ADMIN]: 'Quản trị viên',
}

export const ROLE_DEFAULT_ROUTES = {
  [ROLES.CUSTOMER]: '/',
  [ROLES.PROVIDER]: '/provider/profile',
  [ROLES.ADMIN]: '/admin',
}

export default ROLES
