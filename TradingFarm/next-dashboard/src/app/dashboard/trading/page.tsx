import React from 'react';
import { TradingDashboard } from '@/components/trading/TradingDashboard';
import { DashboardShell } from '@/components/shell';
import { DashboardHeader } from '@/components/header';
import { createServerClient } from '@/utils/supabase/server';

export const metadata = {
  title: 'Trading Dashboard',
  description: 'Manage your trading operations and view performance',
};

export default async function TradingPage() {
  const supabase = await createServerClient();
  
  // Get user data
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user's active farm
  const { data: userFarms } = await supabase
    .from('farm_users')
    .select('farm_id')
    .eq('user_id', user?.id)
    .limit(1);
  
  const farmId = userFarms && userFarms.length > 0 ? userFarms[0].farm_id : '';
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Trading Dashboard"
        text="Execute trades, monitor positions, and track performance"
      />
      
      {farmId ? (
        <TradingDashboard 
          farmId={farmId} 
          defaultExchange="coinbase"
          defaultSymbol="BTC/USD"
          isPaperTrading={true}
        />
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Active Farm</h3>
            <p className="text-muted-foreground">
              You need to create or join a farm to access the trading dashboard.
            </p>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
