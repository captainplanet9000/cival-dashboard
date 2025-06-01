'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/notifications/notification-provider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function NotificationsPage() {
  const { addNotification } = useNotifications();

  // Demo functions to create different types of notifications
  const createInfoNotification = () => {
    addNotification({
      type: 'info',
      title: 'Information',
      message: 'This is a general information notification.',
      data: { timestamp: new Date() }
    });
  };

  const createSuccessNotification = () => {
    addNotification({
      type: 'success',
      title: 'Success!',
      message: 'The operation was completed successfully.',
      data: { timestamp: new Date() }
    });
  };

  const createWarningNotification = () => {
    addNotification({
      type: 'warning',
      title: 'Warning',
      message: 'This operation might cause issues.',
      data: { timestamp: new Date() }
    });
  };

  const createErrorNotification = () => {
    addNotification({
      type: 'error',
      title: 'Error',
      message: 'An error occurred during the operation.',
      data: { timestamp: new Date() }
    });
  };

  const createFarmNotification = () => {
    addNotification({
      type: 'info',
      title: 'Farm Update',
      message: 'Farm #1293 has been updated with new strategy.',
      data: { farmId: '1293', url: '/dashboard/farms/1293' }
    });
  };

  const createAgentNotification = () => {
    addNotification({
      type: 'warning',
      title: 'Agent Warning',
      message: 'Agent #587 is experiencing high latency.',
      data: { agentId: '587', url: '/dashboard/agents/587' }
    });
  };

  const createTradeNotification = () => {
    addNotification({
      type: 'success',
      title: 'Trade Executed',
      message: 'Successfully executed trade #42891 for $25,000.',
      data: { tradeId: '42891', amount: 25000, url: '/dashboard/trades/42891' }
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Notification Center</h1>
        <div>
          <NotificationCenter />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Create different types of notifications to test the notification center.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={createInfoNotification} variant="outline">
              Info Notification
            </Button>
            <Button onClick={createSuccessNotification} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
              Success Notification
            </Button>
            <Button onClick={createWarningNotification} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
              Warning Notification
            </Button>
            <Button onClick={createErrorNotification} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              Error Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entity Notifications</CardTitle>
          <CardDescription>
            Create contextual notifications related to farms, agents, and trades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={createFarmNotification} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              Farm Update
            </Button>
            <Button onClick={createAgentNotification} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
              Agent Warning
            </Button>
            <Button onClick={createTradeNotification} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
              Trade Executed
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Guide</CardTitle>
          <CardDescription>
            How to implement the NotificationCenter component in your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">1. Import the necessary components</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm overflow-x-auto">
                {`import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/components/notifications/notification-provider';`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">2. Add notifications to your app</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm overflow-x-auto">
                {`const { addNotification } = useNotifications();

// Add a notification
addNotification({
  type: 'success', // 'info', 'success', 'warning', 'error'
  title: 'Operation Successful',
  message: 'Your changes have been saved.',
  data: { /* optional data for handling notification clicks */ }
});`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">3. Place the NotificationCenter in your layout</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm overflow-x-auto">
                {`// In your layout or header component
<header className="flex justify-between items-center">
  <h1>Dashboard</h1>
  <div className="flex items-center gap-4">
    <NotificationCenter />
    <UserMenu />
  </div>
</header>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 