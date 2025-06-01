/**
 * Role-Based Access Control (RBAC) for Trading Farm
 * 
 * This utility provides permission management and role-based access control
 * for different user types across the Trading Farm platform.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { logEvent } from '@/utils/logging';
import { handleSupabaseError } from '@/utils/error-handling';

// Define user roles
export enum UserRole {
  ADMIN = 'admin',
  TRADER = 'trader',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
  UNASSIGNED = 'unassigned'
}

// Define resource types for permission management
export enum ResourceType {
  FARM = 'farm',
  AGENT = 'agent',
  ORDER = 'order',
  STRATEGY = 'strategy',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings',
  USERS = 'users',
  BILLING = 'billing',
  REPORT = 'report'
}

// Define actions that can be performed on resources
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage'
}

// Define permission structure
interface Permission {
  role: UserRole;
  resource: ResourceType;
  actions: Action[];
}

// Define default permissions for each role
const DEFAULT_PERMISSIONS: Permission[] = [
  // Admin permissions
  {
    role: UserRole.ADMIN,
    resource: ResourceType.FARM,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.AGENT,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXECUTE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.ORDER,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXECUTE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.STRATEGY,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXECUTE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.ANALYTICS,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.SETTINGS,
    actions: [Action.READ, Action.UPDATE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.USERS,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.BILLING,
    actions: [Action.READ, Action.UPDATE, Action.MANAGE],
  },
  {
    role: UserRole.ADMIN,
    resource: ResourceType.REPORT,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
  },
  
  // Trader permissions
  {
    role: UserRole.TRADER,
    resource: ResourceType.FARM,
    actions: [Action.READ, Action.UPDATE],
  },
  {
    role: UserRole.TRADER,
    resource: ResourceType.AGENT,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.EXECUTE],
  },
  {
    role: UserRole.TRADER,
    resource: ResourceType.ORDER,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.EXECUTE],
  },
  {
    role: UserRole.TRADER,
    resource: ResourceType.STRATEGY,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.EXECUTE],
  },
  {
    role: UserRole.TRADER,
    resource: ResourceType.ANALYTICS,
    actions: [Action.READ],
  },
  {
    role: UserRole.TRADER,
    resource: ResourceType.SETTINGS,
    actions: [Action.READ, Action.UPDATE],
  },
  {
    role: UserRole.TRADER,
    resource: ResourceType.REPORT,
    actions: [Action.CREATE, Action.READ],
  },
  
  // Analyst permissions
  {
    role: UserRole.ANALYST,
    resource: ResourceType.FARM,
    actions: [Action.READ],
  },
  {
    role: UserRole.ANALYST,
    resource: ResourceType.AGENT,
    actions: [Action.READ],
  },
  {
    role: UserRole.ANALYST,
    resource: ResourceType.ORDER,
    actions: [Action.READ],
  },
  {
    role: UserRole.ANALYST,
    resource: ResourceType.STRATEGY,
    actions: [Action.READ, Action.UPDATE],
  },
  {
    role: UserRole.ANALYST,
    resource: ResourceType.ANALYTICS,
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
  },
  {
    role: UserRole.ANALYST,
    resource: ResourceType.REPORT,
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
  },
  
  // Viewer permissions
  {
    role: UserRole.VIEWER,
    resource: ResourceType.FARM,
    actions: [Action.READ],
  },
  {
    role: UserRole.VIEWER,
    resource: ResourceType.AGENT,
    actions: [Action.READ],
  },
  {
    role: UserRole.VIEWER,
    resource: ResourceType.ORDER,
    actions: [Action.READ],
  },
  {
    role: UserRole.VIEWER,
    resource: ResourceType.STRATEGY,
    actions: [Action.READ],
  },
  {
    role: UserRole.VIEWER,
    resource: ResourceType.ANALYTICS,
    actions: [Action.READ],
  },
  {
    role: UserRole.VIEWER,
    resource: ResourceType.REPORT,
    actions: [Action.READ],
  },
];

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(
  role: UserRole, 
  resource: ResourceType, 
  action: Action
): boolean {
  const permission = DEFAULT_PERMISSIONS.find(
    p => p.role === role && p.resource === resource
  );
  
  if (!permission) {
    return false;
  }
  
  return permission.actions.includes(action);
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return DEFAULT_PERMISSIONS.filter(p => p.role === role);
}

/**
 * Get all accessible resources for a role
 */
export function getAccessibleResources(role: UserRole): ResourceType[] {
  const permissions = getRolePermissions(role);
  return [...new Set(permissions.map(p => p.resource))];
}

/**
 * Types for user profile with role information
 */
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get current user profile with role information (client-side)
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createBrowserClient();
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return null;
    }
    
    // Get profile data with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (profileError || !profile) {
      return null;
    }
    
    return {
      id: profile.id,
      email: session.user.email || '',
      role: profile.role || UserRole.UNASSIGNED,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    
  } catch (error) {
    logEvent({
      category: 'auth',
      action: 'get_user_profile_error',
      label: 'Failed to get user profile',
      error
    });
    return null;
  }
}

/**
 * Server-side function to get user profile with role information
 */
export async function getUserProfileServer(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createServerClient();
    
    // Get profile data with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) {
      return null;
    }
    
    // Get user email from auth.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
      
    const email = userData?.email || '';
    
    return {
      id: profile.id,
      email,
      role: profile.role || UserRole.UNASSIGNED,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    
  } catch (error) {
    logEvent({
      category: 'auth',
      action: 'get_user_profile_server_error',
      label: 'Failed to get user profile on server',
      error
    });
    return null;
  }
}

/**
 * Check if user has permission to perform an action on a resource
 */
export async function userHasPermission(
  userId: string,
  resource: ResourceType,
  action: Action
): Promise<boolean> {
  try {
    const userProfile = await getUserProfileServer(userId);
    
    if (!userProfile) {
      return false;
    }
    
    return hasPermission(userProfile.role, resource, action);
    
  } catch (error) {
    logEvent({
      category: 'auth',
      action: 'check_permission_error',
      label: 'Failed to check user permission',
      error
    });
    return false;
  }
}

/**
 * Update user's role (admin function)
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserClient();
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { 
        success: false, 
        error: 'Not authenticated' 
      };
    }
    
    // Check if current user is admin
    const currentUser = await getCurrentUserProfile();
    
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return { 
        success: false, 
        error: 'Insufficient permissions to update user roles' 
      };
    }
    
    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);
      
    if (error) {
      throw error;
    }
    
    // Log role change
    logEvent({
      category: 'auth',
      action: 'update_user_role',
      label: `Updated user ${targetUserId} role to ${newRole}`,
      value: 1
    });
    
    return { success: true };
    
  } catch (error) {
    const errorMessage = handleSupabaseError(error, 'Failed to update user role');
    
    logEvent({
      category: 'auth',
      action: 'update_user_role_error',
      label: errorMessage,
      error
    });
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * React hook for RBAC
 */
export function useRBAC() {
  const checkPermission = async (
    resource: ResourceType,
    action: Action
  ): Promise<boolean> => {
    const userProfile = await getCurrentUserProfile();
    
    if (!userProfile) {
      return false;
    }
    
    return hasPermission(userProfile.role, resource, action);
  };
  
  return {
    checkPermission,
    hasPermission,
    getRolePermissions,
    getAccessibleResources,
    updateUserRole
  };
}
