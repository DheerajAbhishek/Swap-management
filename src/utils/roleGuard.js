// Role-based access guard utilities

import { USER_ROLES } from './constants';

/**
 * Check if user has required role
 * @param {Object} user - User object with role property
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean}
 */
export function hasRole(user, requiredRoles) {
  if (!user || !user.role) return false;

  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }

  return user.role === requiredRoles;
}

/**
 * Check if user is Admin
 * @param {Object} user
 * @returns {boolean}
 */
export function isAdmin(user) {
  return hasRole(user, USER_ROLES.ADMIN);
}

/**
 * Check if user is Kitchen
 * @param {Object} user
 * @returns {boolean}
 */
export function isKitchen(user) {
  return hasRole(user, USER_ROLES.KITCHEN);
}

/**
 * Check if user is Franchise
 * @param {Object} user
 * @returns {boolean}
 */
export function isFranchise(user) {
  return hasRole(user, USER_ROLES.FRANCHISE);
}

/**
 * Check if user is Franchise Staff
 * @param {Object} user
 * @returns {boolean}
 */
export function isFranchiseStaff(user) {
  return hasRole(user, USER_ROLES.FRANCHISE_STAFF);
}

/**
 * Check if user is Kitchen Staff
 * @param {Object} user
 * @returns {boolean}
 */
export function isKitchenStaff(user) {
  return hasRole(user, USER_ROLES.KITCHEN_STAFF);
}

/**
 * Get dashboard path for user role
 * @param {Object} user
 * @returns {string}
 */
export function getDashboardPath(user) {
  if (!user || !user.role) return '/login';

  switch (user.role) {
    case USER_ROLES.ADMIN:
      return '/admin';
    case USER_ROLES.KITCHEN:
      return '/kitchen';
    case USER_ROLES.FRANCHISE:
      return '/franchise';
    case USER_ROLES.AUDITOR:
      return '/auditor';
    case USER_ROLES.FRANCHISE_STAFF:
      return '/franchise-staff';
    case USER_ROLES.KITCHEN_STAFF:
      return '/kitchen-staff';
    default:
      return '/login';
  }
}

/**
 * Get navigation items for user role
 * @param {Object} user
 * @returns {Array}
 */
export function getNavItems(user) {
  if (!user || !user.role) return [];

  switch (user.role) {
    case USER_ROLES.ADMIN:
      return [
        { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
        { path: '/admin/items', label: 'Manage Items', icon: 'inventory' },
        { path: '/admin/orders', label: 'All Orders', icon: 'orders' },
        { path: '/admin/vendors', label: 'Vendor Management', icon: 'vendors' },
        { path: '/admin/franchises', label: 'Franchise Management', icon: 'store' },
        { path: '/admin/staff', label: 'All Staff', icon: 'users' },
        { path: '/admin/attendance', label: 'Staff Attendance', icon: 'calendar' },
        { path: '/admin/auditors', label: 'Audit Management', icon: 'clipboard' },
        { path: '/admin/audits', label: 'View Audits', icon: 'audit' },
        { path: '/admin/daily-reports', label: 'Daily Reports', icon: 'report' },
        { path: '/admin/discrepancies', label: 'Discrepancies', icon: 'alert' },
        { path: '/admin/complaints', label: 'Complaints', icon: 'message' }
      ];
    case USER_ROLES.KITCHEN:
      return [
        { path: '/kitchen', label: 'Dashboard', icon: 'dashboard' },
        { path: '/kitchen/orders', label: 'Incoming Orders', icon: 'orders' },
        { path: '/kitchen/staff', label: 'Manage Staff', icon: 'users' },
        { path: '/kitchen/discrepancies', label: 'View Discrepancies', icon: 'alert' },
        { path: '/kitchen/complaints', label: 'Complaints', icon: 'message' }
      ];
    case USER_ROLES.FRANCHISE:
      return [
        { path: '/franchise', label: 'Dashboard', icon: 'dashboard' },
        { path: '/franchise/create-order', label: 'Create Order', icon: 'plus' },
        { path: '/franchise/daily-entry', label: 'Daily Entry', icon: 'edit' },
        { path: '/franchise/daily-reports', label: 'My Reports', icon: 'report' },
        { path: '/franchise/orders', label: 'Order History', icon: 'history' },
        { path: '/franchise/staff', label: 'Manage Staff', icon: 'users' },
        { path: '/franchise/staff-attendance', label: 'Staff Attendance', icon: 'calendar' },
        { path: '/franchise/complaints', label: 'My Complaints', icon: 'message' }
      ];
    case USER_ROLES.AUDITOR:
      return [
        { path: '/auditor', label: 'Dashboard', icon: 'dashboard' },
        { path: '/auditor/conduct-audit', label: 'Conduct Audit', icon: 'clipboard' },
        { path: '/auditor/history', label: 'Audit History', icon: 'history' }
      ];
    case USER_ROLES.FRANCHISE_STAFF:
      return [
        { path: '/franchise-staff', label: 'Dashboard', icon: 'dashboard' },
        { path: '/franchise-staff/attendance', label: 'My Attendance', icon: 'calendar' },
        { path: '/franchise-staff/create-order', label: 'Create Order', icon: 'plus' },
        { path: '/franchise-staff/orders', label: 'Order History', icon: 'history' }
      ];
    case USER_ROLES.KITCHEN_STAFF:
      return [
        { path: '/kitchen-staff', label: 'Dashboard', icon: 'dashboard' },
        { path: '/kitchen-staff/orders', label: 'Incoming Orders', icon: 'orders' }
      ];
    default:
      return [];
  }
}
