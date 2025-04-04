'use client';

import { useState } from 'react';
import ExchangeList from '@/components/exchange/exchange-list';
import ExchangeDashboard from '@/components/exchange/exchange-dashboard';

export function ExchangeClientWrapper({ userId }: { userId: string }) {
  const [selectedExchangeId, setSelectedExchangeId] = useState<string | null>(null);
  
  return (
    <ExchangeList 
      userId={userId} 
      onSelectExchange={(id) => {
        setSelectedExchangeId(id);
        // Switch to dashboard tab
        const dashboardTab = document.querySelector('[data-state="inactive"][value="dashboard"]') as HTMLButtonElement;
        if (dashboardTab) {
          dashboardTab.click();
        }
      }} 
    />
  );
}

export function ExchangeDashboardClientWrapper() {
  const [exchangeId, setExchangeId] = useState<string | null>(null);
  
  return <ExchangeDashboard exchangeId={exchangeId} onExchangeChange={setExchangeId} />;
}
