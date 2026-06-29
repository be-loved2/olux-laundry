/**
 * Centralized role-based access control.
 *
 * Every protected route/server-action should call `hasPermission` rather than
 * comparing `role` strings directly, so the permission matrix stays in one
 * place as new roles/permissions are added.
 */

export type Permission =
  | 'orders.view'
  | 'orders.edit'
  | 'orders.delete'
  | 'orders.assignRider'
  | 'customers.view'
  | 'customers.suspend'
  | 'customers.delete'
  | 'services.manage'
  | 'pricing.manage'
  | 'staff.manage'
  | 'reports.view'
  | 'reports.export'
  | 'reviews.moderate'
  | 'settings.manage'
  | 'payments.refund';

export type AppRole =
  'SUPER_ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'LAUNDRY_STAFF' | 'DELIVERY_RIDER' | 'CUSTOMER';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPER_ADMIN: [
    'orders.view',
    'orders.edit',
    'orders.delete',
    'orders.assignRider',
    'customers.view',
    'customers.suspend',
    'customers.delete',
    'services.manage',
    'pricing.manage',
    'staff.manage',
    'reports.view',
    'reports.export',
    'reviews.moderate',
    'settings.manage',
    'payments.refund',
  ],
  MANAGER: [
    'orders.view',
    'orders.edit',
    'orders.assignRider',
    'customers.view',
    'customers.suspend',
    'services.manage',
    'pricing.manage',
    'reports.view',
    'reports.export',
    'reviews.moderate',
    'payments.refund',
  ],
  RECEPTIONIST: ['orders.view', 'orders.edit', 'orders.assignRider', 'customers.view'],
  LAUNDRY_STAFF: ['orders.view', 'orders.edit'],
  DELIVERY_RIDER: ['orders.view'],
  CUSTOMER: [],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as AppRole];
  return permissions ? permissions.includes(permission) : false;
}

export function isStaffRole(role: string): boolean {
  return role !== 'CUSTOMER';
}
