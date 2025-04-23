/**
 * Market Dashboard Page
 * 
 * Provides a comprehensive view of market data and trading opportunities,
 * part of the Phase 1 Live Trading implementation.
 */

import { Metadata } from 'next';
import { DashboardShell } from '@/components/shell';
import { DashboardHeader } from '@/components/header';
import { createServerClient } from '@/utils/supabase/server';
import { MarketDashboardClient } from './client-components';

export const metadata: Metadata = {
  title: 'Market Dashboard',
  description: 'Real-time market data and analysis for trading decisions',
};

export default async function MarketDashboardPage() {
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
        heading="Market Dashboard"
        text="Real-time market analysis and trading opportunities"
      />
      
      <MarketDashboardClient userId={activeUser.id} />
    </DashboardShell>
  );
}
