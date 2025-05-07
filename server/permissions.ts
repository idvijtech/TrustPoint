import { AdminRole } from "../shared/schema";

/**
 * Type defining all available admin permissions
 */
export interface AdminPermissions {
  // User management
  manageAdmins: boolean;
  manageUsers: boolean;
  
  // Device management
  manageDevices: boolean;
  viewDeviceLogs: boolean;
  
  // Events and media
  createEvents: boolean;
  editEvents: boolean;
  deleteEvents: boolean;
  uploadMedia: boolean;
  editMedia: boolean;
  deleteMedia: boolean;
  
  // Access control
  manageGroups: boolean;
  managePermissions: boolean;
  
  // System settings
  manageSettings: boolean;
  viewAuditLogs: boolean;
  manageApiKeys: boolean;
}

// Define role hierarchy
const ROLE_HIERARCHY = {
  [AdminRole.SUPER_ADMIN]: 5,
  [AdminRole.ADMIN]: 4,
  [AdminRole.MANAGER]: 3,
  [AdminRole.EDITOR]: 2,
  [AdminRole.VIEWER]: 1,
};

/**
 * Generate default permissions based on admin role
 */
export function getDefaultPermissionsByRole(role: string): AdminPermissions {
  switch (role) {
    case AdminRole.SUPER_ADMIN:
      return {
        manageAdmins: true,
        manageUsers: true,
        manageDevices: true,
        viewDeviceLogs: true,
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        manageGroups: true,
        managePermissions: true,
        manageSettings: true,
        viewAuditLogs: true,
        manageApiKeys: true,
      };
    case AdminRole.ADMIN:
      return {
        manageAdmins: true,
        manageUsers: true,
        manageDevices: true,
        viewDeviceLogs: true,
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        manageGroups: true,
        managePermissions: true,
        manageSettings: true,
        viewAuditLogs: true,
        manageApiKeys: true,
      };
    case AdminRole.MANAGER:
      return {
        manageAdmins: false,
        manageUsers: true,
        manageDevices: false,
        viewDeviceLogs: true,
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        manageGroups: true,
        managePermissions: true,
        manageSettings: false,
        viewAuditLogs: true,
        manageApiKeys: false,
      };
    case AdminRole.EDITOR:
      return {
        manageAdmins: false,
        manageUsers: false,
        manageDevices: false,
        viewDeviceLogs: true,
        createEvents: true,
        editEvents: true,
        deleteEvents: false,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: false,
        manageGroups: false,
        managePermissions: false,
        manageSettings: false,
        viewAuditLogs: false,
        manageApiKeys: false,
      };
    case AdminRole.VIEWER:
    default:
      return {
        manageAdmins: false,
        manageUsers: false,
        manageDevices: false,
        viewDeviceLogs: false,
        createEvents: false,
        editEvents: false,
        deleteEvents: false,
        uploadMedia: false,
        editMedia: false,
        deleteMedia: false,
        manageGroups: false,
        managePermissions: false,
        manageSettings: false,
        viewAuditLogs: false,
        manageApiKeys: false,
      };
  }
}

/**
 * Check if the user has the required permission
 */
export function hasPermission(userPermissions: AdminPermissions | null | undefined, permission: keyof AdminPermissions): boolean {
  if (!userPermissions) return false;
  return userPermissions[permission] === true;
}

/**
 * Check if a user can manage another user
 * Super admins can manage everyone
 * Admins can manage everyone except super admins
 * Others can't manage any admin
 */
export function canManageUser(managerRole: string, targetRole: string): boolean {
  const managerRoleLevel = ROLE_HIERARCHY[managerRole as AdminRole] || 0;
  const targetRoleLevel = ROLE_HIERARCHY[targetRole as AdminRole] || 0;
  
  // Super admin can manage everyone
  if (managerRole === AdminRole.SUPER_ADMIN) return true;
  
  // Admin can manage everyone except super admin
  if (managerRole === AdminRole.ADMIN && targetRole !== AdminRole.SUPER_ADMIN) return true;
  
  // Others can only manage users with lower role levels
  return managerRoleLevel > targetRoleLevel;
}