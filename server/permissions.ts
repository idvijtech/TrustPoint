import { AdminRole, AdminPermissions } from "@shared/schema";

/**
 * Generate default permissions based on admin role
 */
export function getDefaultPermissionsByRole(role: string): AdminPermissions {
  switch (role) {
    case AdminRole.SUPER_ADMIN:
      return {
        // User management
        manageAdmins: true,
        manageUsers: true,
        
        // Device management
        manageDevices: true,
        viewDeviceLogs: true,
        
        // Events and media
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        
        // Access control
        manageGroups: true,
        managePermissions: true,
        
        // System settings
        manageSettings: true,
        viewAuditLogs: true,
        manageApiKeys: true,
      };
      
    case AdminRole.ADMIN:
      return {
        // User management
        manageAdmins: true, // Can manage non-super admins
        manageUsers: true,
        
        // Device management
        manageDevices: true,
        viewDeviceLogs: true,
        
        // Events and media
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        
        // Access control
        manageGroups: true,
        managePermissions: true,
        
        // System settings
        manageSettings: true,
        viewAuditLogs: true,
        manageApiKeys: true,
      };
      
    case AdminRole.MANAGER:
      return {
        // User management
        manageAdmins: false,
        manageUsers: true,
        
        // Device management
        manageDevices: false,
        viewDeviceLogs: true,
        
        // Events and media
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        
        // Access control
        manageGroups: true,
        managePermissions: true,
        
        // System settings
        manageSettings: false,
        viewAuditLogs: true,
        manageApiKeys: false,
      };
      
    case AdminRole.EDITOR:
      return {
        // User management
        manageAdmins: false,
        manageUsers: false,
        
        // Device management
        manageDevices: false,
        viewDeviceLogs: false,
        
        // Events and media
        createEvents: true,
        editEvents: true,
        deleteEvents: false,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        
        // Access control
        manageGroups: false,
        managePermissions: false,
        
        // System settings
        manageSettings: false,
        viewAuditLogs: false,
        manageApiKeys: false,
      };
      
    case AdminRole.VIEWER:
    default:
      return {
        // User management
        manageAdmins: false,
        manageUsers: false,
        
        // Device management
        manageDevices: false,
        viewDeviceLogs: false,
        
        // Events and media
        createEvents: false,
        editEvents: false,
        deleteEvents: false,
        uploadMedia: false,
        editMedia: false,
        deleteMedia: false,
        
        // Access control
        manageGroups: false,
        managePermissions: false,
        
        // System settings
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
  return !!userPermissions[permission];
}

/**
 * Check if a user can manage another user
 * Super admins can manage everyone
 * Admins can manage everyone except super admins
 * Others can't manage any admin
 */
export function canManageUser(managerRole: string, targetRole: string): boolean {
  if (managerRole === AdminRole.SUPER_ADMIN) {
    return true;
  }
  
  if (managerRole === AdminRole.ADMIN) {
    return targetRole !== AdminRole.SUPER_ADMIN;
  }
  
  return false;
}