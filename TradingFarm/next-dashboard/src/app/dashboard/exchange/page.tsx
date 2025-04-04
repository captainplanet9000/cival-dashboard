import React from 'react';
import { Metadata } from 'next';
import { DashboardShell } from '@/components/shell';
import { DashboardHeader } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExchangeCredentialsForm from '@/components/exchange/exchange-credentials-form';
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeClientWrapper, ExchangeDashboardClientWrapper } from './client-components';

export const metadata: Metadata = {
  title: 'Exchange Management',
  description: 'Connect and manage your trading exchanges',
};

export default async function ExchangePage() {
  const supabase = createServerClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // For testing: Create a mock user if not authenticated
  const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com',
  };
  
  // Use the actual user if logged in, otherwise use the mock user for testing
  const activeUser = user || mockUser;
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Exchange Management"
        text="Connect and manage your trading exchanges"
      />
      
      <Tabs defaultValue="exchanges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exchanges">Your Exchanges</TabsTrigger>
          <TabsTrigger value="add">Add Exchange</TabsTrigger>
          <TabsTrigger value="dashboard">Exchange Dashboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="exchanges" className="space-y-4">
          <ExchangeClientWrapper userId={activeUser.id} />
        </TabsContent>
        
        <TabsContent value="add" className="space-y-4">
          <ExchangeCredentialsForm 
            userId={activeUser.id}
            onCredentialsSaved={() => {}} 
          />
        </TabsContent>
        
        <TabsContent value="dashboard" className="space-y-4">
          <ExchangeDashboardClientWrapper />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
