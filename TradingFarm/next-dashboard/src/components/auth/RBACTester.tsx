'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole, ResourceType, Action, hasPermission, updateUserRole, getCurrentUserProfile } from '@/utils/auth/rbac';
import { ShieldCheck, ShieldX, Users, Database, Settings, BarChart, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

/**
 * A component to test and demonstrate the RBAC system functionality
 */
export default function RBACTester() {
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.VIEWER);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Resource types to test against
  const resources = [
    { type: ResourceType.FARM, icon: <Database className="h-4 w-4 mr-2" />, label: 'Farm Management' },
    { type: ResourceType.AGENT, icon: <ShieldCheck className="h-4 w-4 mr-2" />, label: 'Agent Configuration' },
    { type: ResourceType.ORDER, icon: <FileText className="h-4 w-4 mr-2" />, label: 'Order Management' },
    { type: ResourceType.ANALYTICS, icon: <BarChart className="h-4 w-4 mr-2" />, label: 'Analytics Dashboard' },
    { type: ResourceType.USERS, icon: <Users className="h-4 w-4 mr-2" />, label: 'User Management' },
    { type: ResourceType.SETTINGS, icon: <Settings className="h-4 w-4 mr-2" />, label: 'System Settings' },
  ];

  // Actions to test
  const actions = [
    { action: Action.READ, label: 'View' },
    { action: Action.CREATE, label: 'Create' },
    { action: Action.UPDATE, label: 'Edit' },
    { action: Action.DELETE, label: 'Delete' },
    { action: Action.EXECUTE, label: 'Execute' },
    { action: Action.MANAGE, label: 'Manage' },
  ];

  // Fetch current user profile
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
      if (profile?.role) {
        setCurrentRole(profile.role);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Change user role
  const changeRole = async (newRole: UserRole) => {
    setLoading(true);
    try {
      if (userProfile) {
        const result = await updateUserRole(userProfile.id, newRole);
        if (result.success) {
          setCurrentRole(newRole);
          toast({
            title: 'Role Updated',
            description: `User role has been updated to ${newRole}`,
          });
          // Refresh profile
          fetchUserProfile();
        } else {
          throw new Error(result.error);
        }
      } else {
        // Just update the simulated role without user profile
        setCurrentRole(newRole);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize component
  React.useEffect(() => {
    fetchUserProfile();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="h-5 w-5 mr-2 text-primary" />
          RBAC Testing & Demonstration
        </CardTitle>
        <CardDescription>
          Test and visualize role-based permissions in the Trading Farm platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="permissions">
          <TabsList className="mb-4">
            <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
            <TabsTrigger value="roleManager">Role Manager</TabsTrigger>
          </TabsList>

          {/* Permission Matrix Tab */}
          <TabsContent value="permissions">
            <div className="mb-4 flex items-center space-x-4">
              <div className="text-sm font-medium">Testing as role:</div>
              <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as UserRole)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {userProfile && (
                <div className="ml-auto text-sm">
                  Logged in as: <Badge variant="outline">{userProfile.email}</Badge>
                  <Badge className="ml-2 bg-primary/20">{userProfile.role}</Badge>
                </div>
              )}
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Resource</TableHead>
                    {actions.map((action) => (
                      <TableHead key={action.action}>{action.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.type}>
                      <TableCell className="font-medium flex items-center">
                        {resource.icon}
                        {resource.label}
                      </TableCell>
                      {actions.map((action) => (
                        <TableCell key={`${resource.type}-${action.action}`}>
                          {hasPermission(currentRole, resource.type, action.action) ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              Allowed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-500 border-red-300">
                              Denied
                            </Badge>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Role Manager Tab */}
          <TabsContent value="roleManager">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(UserRole).map((role) => (
                  <Card key={role} className={`overflow-hidden ${currentRole === role ? 'border-primary' : ''}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg capitalize">{role}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm text-muted-foreground space-y-1">
                        {role === UserRole.ADMIN && (
                          <p>Full access to all platform features and administrative functions</p>
                        )}
                        {role === UserRole.TRADER && (
                          <p>Can manage trading operations, agents, and strategies</p>
                        )}
                        {role === UserRole.ANALYST && (
                          <p>Read-only access plus analytics management and reporting</p>
                        )}
                        {role === UserRole.VIEWER && (
                          <p>Read-only access to dashboards, limited interaction</p>
                        )}
                        {role === UserRole.UNASSIGNED && (
                          <p>No access to platform features, pending assignment</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button 
                        variant={currentRole === role ? "default" : "outline"} 
                        size="sm" 
                        className="w-full"
                        disabled={loading || currentRole === role}
                        onClick={() => changeRole(role)}
                      >
                        {currentRole === role ? 'Current Role' : 'Switch to This Role'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              {userProfile && (
                <div className="mt-8 p-4 bg-muted rounded-md">
                  <h3 className="text-sm font-semibold mb-2">Current User Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <p className="font-mono text-xs">{userProfile.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{userProfile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <Badge>{userProfile.role}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p>{new Date(userProfile.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={fetchUserProfile}
                  disabled={loading}
                >
                  Refresh Profile
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
