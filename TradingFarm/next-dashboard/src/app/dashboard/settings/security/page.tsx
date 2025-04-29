import * as React from 'react';
import { Metadata } from 'next';
import { Shield, Key, RefreshCw, Lock, List, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';

export const metadata: Metadata = {
  title: 'Security Settings',
  description: 'Manage security settings for your Trading Farm account',
};

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage security settings, API keys, and access controls for your account
        </p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="ip-access">IP Access</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Security
              </CardTitle>
              <CardDescription>
                Configure general security settings for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="two-factor">Two-factor authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require a verification code when logging in
                    </p>
                  </div>
                  <Switch id="two-factor" />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Security notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for important security events
                    </p>
                  </div>
                  <Switch id="notifications" defaultChecked />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after a period of inactivity
                  </p>
                  <Select defaultValue="60">
                    <SelectTrigger id="session-timeout" className="w-full">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>
                Recent security-related activities on your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-md border">
                <div className="p-4">
                  <SecurityActivityLog />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Export Security Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api-keys" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to the Trading Farm platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button>
                  <Key className="mr-2 h-4 w-4" />
                  Create New API Key
                </Button>
              </div>
              
              <div className="rounded-md border">
                <div className="p-4">
                  <ApiKeysList />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ip-access" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                IP Access Control
              </CardTitle>
              <CardDescription>
                Restrict access to your account to specific IP addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ip-restriction">Enable IP restrictions</Label>
                    <p className="text-sm text-muted-foreground">
                      Only allow access from whitelisted IP addresses
                    </p>
                  </div>
                  <Switch id="ip-restriction" />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Allowed IP Addresses</Label>
                  <p className="text-sm text-muted-foreground">
                    Add IP addresses that are allowed to access your account (use * for wildcards, e.g., 192.168.1.*)
                  </p>
                  
                  <div className="flex space-x-2">
                    <Input placeholder="Enter IP address" />
                    <Button>Add</Button>
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <div className="p-4">
                    <IpAllowList />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="credentials" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Credential Rotation
              </CardTitle>
              <CardDescription>
                Configure automatic rotation of exchange API credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-rotation">Automatic credential rotation</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders to update your exchange API credentials
                    </p>
                  </div>
                  <Switch id="auto-rotation" />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="rotation-interval">Rotation interval</Label>
                  <p className="text-sm text-muted-foreground">
                    How often you want to be reminded to rotate credentials
                  </p>
                  <Select defaultValue="90">
                    <SelectTrigger id="rotation-interval" className="w-full">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiry-notify">Expiry notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications before credentials expire
                    </p>
                  </div>
                  <Switch id="expiry-notify" defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notification-days">Notification days</Label>
                  <p className="text-sm text-muted-foreground">
                    Days before expiry to send notification
                  </p>
                  <Select defaultValue="7">
                    <SelectTrigger id="notification-days" className="w-full">
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Credential Rotation History
              </CardTitle>
              <CardDescription>
                History of credential rotations for your exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-4">
                  <CredentialRotationHistory />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Placeholder components for tables
function SecurityActivityLog() {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Date</th>
          <th className="text-left p-2">Event</th>
          <th className="text-left p-2">IP Address</th>
          <th className="text-left p-2">Risk</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="p-2">2025-04-27 12:45</td>
          <td className="p-2">Login successful</td>
          <td className="p-2">192.168.1.100</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Low</span></td>
        </tr>
        <tr className="border-b">
          <td className="p-2">2025-04-26 18:30</td>
          <td className="p-2">Password changed</td>
          <td className="p-2">192.168.1.100</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">Medium</span></td>
        </tr>
        <tr className="border-b">
          <td className="p-2">2025-04-25 14:22</td>
          <td className="p-2">Failed login attempt</td>
          <td className="p-2">203.0.113.45</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">High</span></td>
        </tr>
        <tr className="border-b">
          <td className="p-2">2025-04-24 09:15</td>
          <td className="p-2">API key created</td>
          <td className="p-2">192.168.1.100</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">Medium</span></td>
        </tr>
      </tbody>
    </table>
  );
}

function ApiKeysList() {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Name</th>
          <th className="text-left p-2">Created</th>
          <th className="text-left p-2">Last Used</th>
          <th className="text-left p-2">Status</th>
          <th className="text-left p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="p-2">Trading Bot API</td>
          <td className="p-2">2025-04-20</td>
          <td className="p-2">2025-04-27</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span></td>
          <td className="p-2">
            <Button variant="ghost" size="sm">Revoke</Button>
          </td>
        </tr>
        <tr className="border-b">
          <td className="p-2">Mobile App</td>
          <td className="p-2">2025-04-15</td>
          <td className="p-2">2025-04-26</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span></td>
          <td className="p-2">
            <Button variant="ghost" size="sm">Revoke</Button>
          </td>
        </tr>
        <tr className="border-b">
          <td className="p-2">Data Export</td>
          <td className="p-2">2025-04-10</td>
          <td className="p-2">2025-04-10</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Revoked</span></td>
          <td className="p-2">
            <Button variant="ghost" size="sm" disabled>Revoked</Button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function IpAllowList() {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">IP Address</th>
          <th className="text-left p-2">Description</th>
          <th className="text-left p-2">Added</th>
          <th className="text-left p-2">Status</th>
          <th className="text-left p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="p-2">192.168.1.*</td>
          <td className="p-2">Home network</td>
          <td className="p-2">2025-04-20</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span></td>
          <td className="p-2">
            <Button variant="ghost" size="sm">Remove</Button>
          </td>
        </tr>
        <tr className="border-b">
          <td className="p-2">203.0.113.42</td>
          <td className="p-2">Office</td>
          <td className="p-2">2025-04-15</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span></td>
          <td className="p-2">
            <Button variant="ghost" size="sm">Remove</Button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function CredentialRotationHistory() {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Exchange</th>
          <th className="text-left p-2">Date</th>
          <th className="text-left p-2">Reason</th>
          <th className="text-left p-2">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="p-2">Coinbase</td>
          <td className="p-2">2025-04-15</td>
          <td className="p-2">User initiated</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Success</span></td>
        </tr>
        <tr className="border-b">
          <td className="p-2">Bybit</td>
          <td className="p-2">2025-03-20</td>
          <td className="p-2">Auto rotation</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Success</span></td>
        </tr>
        <tr className="border-b">
          <td className="p-2">Binance</td>
          <td className="p-2">2025-03-15</td>
          <td className="p-2">User initiated</td>
          <td className="p-2"><span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Failed</span></td>
        </tr>
      </tbody>
    </table>
  );
}
