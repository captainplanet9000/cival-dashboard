/**
 * WebSocket Connections Dashboard Page
 * 
 * This page displays the health and status of all WebSocket connections across exchanges.
 * It provides monitoring capabilities and management controls for connections.
 */

import React from 'react';
import { ConnectionHealthDashboard } from '@/components/websocket/ConnectionHealthDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * ConnectionsPage component
 * 
 * Displays the WebSocket connections dashboard page.
 */
export default function ConnectionsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Connection Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage WebSocket connections to exchanges
        </p>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <ConnectionHealthDashboard 
            refreshInterval={5000} 
            allowManagement={true} 
          />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>
                Configure global settings for WebSocket connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Connection settings will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
