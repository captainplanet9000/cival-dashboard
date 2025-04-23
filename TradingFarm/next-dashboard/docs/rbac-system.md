# Role-Based Access Control (RBAC) System Documentation

## Overview

The Trading Farm Dashboard implements a comprehensive Role-Based Access Control (RBAC) system to manage user permissions and access to various resources throughout the application. This document outlines the architecture, implementation details, and usage guidelines for the RBAC system.

## Architecture

### Core Components

1. **User Roles**: Predefined roles with varying levels of access permissions:
   - Admin: Full system access
   - Trader: Can manage trading operations and strategies
   - Analyst: Read access plus analytics capabilities
   - Viewer: Read-only access to dashboards
   - Unassigned: No access (default for new users)

2. **Resources**: System entities that are protected by access control:
   - Farms: Trading farm entities
   - Agents: Trading agents and bots
   - Orders: Trading orders and transactions
   - Analytics: Reporting and analysis tools
   - Users: User management
   - Settings: System configuration

3. **Actions**: Operations that can be performed on resources:
   - Read: View information
   - Create: Create new instances
   - Update: Modify existing instances
   - Delete: Remove instances
   - Execute: Run operations (like starting agents)
   - Manage: Special administrative actions

4. **Permissions Matrix**: The combination of roles, resources, and actions that defines what each role can do with each resource.

## Implementation

### File Structure

- `/src/utils/auth/rbac.ts`: Core RBAC implementation
- `/src/components/auth/RBACTester.tsx`: Testing component for RBAC functionality
- `/src/utils/supabase/server.ts`: Server-side authentication utilities
- `/src/utils/supabase/client.ts`: Client-side authentication utilities
- `/src/hooks/use-auth.ts`: React hook for authentication and authorization

### Permission Model

Permissions are defined as a mapping between roles, resources, and actions. For example:

```typescript
{
  [UserRole.ADMIN]: {
    [ResourceType.FARM]: {
      actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.EXECUTE, Action.MANAGE],
      description: "Full control over farming operations"
    },
    // other resources...
  },
  // other roles...
}
```

### Database Schema

The RBAC system utilizes a `profiles` table in the database:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

## Usage

### Checking Permissions

To check if a user has permission to perform an action on a resource:

```typescript
import { hasPermission, UserRole, ResourceType, Action } from '@/utils/auth/rbac';

// Check if a trader can update a farm
const canUpdate = hasPermission(UserRole.TRADER, ResourceType.FARM, Action.UPDATE);
```

### Protecting UI Elements

In React components, use the `hasPermission` function to conditionally render UI elements:

```tsx
{hasPermission(userRole, ResourceType.AGENT, Action.CREATE) && (
  <Button onClick={createAgent}>Create Agent</Button>
)}
```

### Protecting Routes

Use the RBAC system with middleware to protect routes:

```typescript
// In middleware.ts
import { NextResponse } from 'next/server';
import { hasPermission, UserRole, ResourceType, Action } from '@/utils/auth/rbac';

export async function middleware(request) {
  const user = await getUser(request);
  
  // Protected route for agent management
  if (request.nextUrl.pathname.startsWith('/dashboard/agents')) {
    if (!hasPermission(user.role, ResourceType.AGENT, Action.READ)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return NextResponse.next();
}
```

### Updating User Roles

To update a user's role:

```typescript
import { updateUserRole, UserRole } from '@/utils/auth/rbac';

// Update user to trader role
const result = await updateUserRole(userId, UserRole.TRADER);
if (result.success) {
  // Role updated successfully
} else {
  // Handle error
  console.error(result.error);
}
```

## Integration with Components

### AgentList Component

The `AgentList` component uses RBAC to control what users can do with agents:

```tsx
// Inside AgentList component
const showEditControls = hasPermission(userRole, ResourceType.AGENT, Action.UPDATE);
const showDeleteControls = hasPermission(userRole, ResourceType.AGENT, Action.DELETE);

return (
  {/* Table of agents */}
  <TableCell>
    {showEditControls && (
      <Button onClick={() => editAgent(agent.id)}>Edit</Button>
    )}
    {showDeleteControls && (
      <Button variant="destructive" onClick={() => deleteAgent(agent.id)}>Delete</Button>
    )}
  </TableCell>
);
```

### AgentMonitoringWidget

The `AgentMonitoringWidget` allows different levels of interaction based on user role:

```tsx
// Inside AgentMonitoringWidget
const canExecuteAgents = hasPermission(userRole, ResourceType.AGENT, Action.EXECUTE);
const canViewDetailedMetrics = hasPermission(userRole, ResourceType.ANALYTICS, Action.READ);

// Display controls based on permissions
```

## Testing

To test the RBAC system, use the `RBACTester` component. This component provides a UI for:

1. Viewing the current user's role and permissions
2. Switching between different roles to test access
3. Viewing a matrix of all permissions across roles and resources
4. Testing access to specific actions on specific resources

## Best Practices

1. **Always Check Permissions**: Never assume a user has permission to access a resource or perform an action.

2. **Server-Side Validation**: While client-side checks improve UX, always implement server-side permission checks as well.

3. **Least Privilege Principle**: Assign users the minimum privileges they need to perform their tasks.

4. **Audit Changes**: Log all changes to user roles for security auditing.

5. **Role Hierarchy**: For complex permission models, implement a role hierarchy where higher roles inherit permissions from lower roles.

## Troubleshooting

### Common Issues

1. **Permission Denied Unexpectedly**: Check if the user's role is correctly set in the database.

2. **Permissions Not Updating**: Ensure the client has the latest user profile data by refreshing the session.

3. **Session Mismatch**: Verify that the client and server are using the same session data.

## Future Enhancements

1. **Custom Role Creation**: Allow administrators to create custom roles with specific permission sets.

2. **Attribute-Based Access Control (ABAC)**: Extend the RBAC system to include dynamic attributes like time, location, or other contextual factors.

3. **Permission Groups**: Implement permission groups for easier management of complex permission sets.

4. **Role Assignment Workflow**: Create a workflow for role requests and approvals.

---

## API Reference

### Core Functions

#### `hasPermission(role: UserRole, resource: ResourceType, action: Action): boolean`
Checks if a role has permission to perform an action on a resource.

#### `getCurrentUserProfile(): Promise<UserProfile | null>`
Gets the current authenticated user's profile including their role.

#### `updateUserRole(userId: string, newRole: UserRole): Promise<{ success: boolean, error?: string }>`
Updates a user's role in the database.

### Enums

#### `UserRole`
- `ADMIN`: Full system access
- `TRADER`: Trading operations management
- `ANALYST`: Analytics and reporting
- `VIEWER`: Read-only dashboard access
- `UNASSIGNED`: No access

#### `ResourceType`
- `FARM`: Farm management
- `AGENT`: Agent configuration
- `ORDER`: Order management
- `ANALYTICS`: Analytics dashboard
- `USERS`: User management
- `SETTINGS`: System settings

#### `Action`
- `READ`: View information
- `CREATE`: Create new instances
- `UPDATE`: Modify existing instances
- `DELETE`: Remove instances
- `EXECUTE`: Run operations
- `MANAGE`: Administrative actions
