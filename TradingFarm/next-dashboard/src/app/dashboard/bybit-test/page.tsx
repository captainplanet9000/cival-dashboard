'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExchangeCredentialsForm from '@/components/exchange/exchange-credentials-form';
import ExchangeList from '@/components/exchange/exchange-list';
import ExchangeDashboard from '@/components/exchange/exchange-dashboard';

export default function BybitTestPage() {
  const TEST_USER_ID = 'test-user-id-123';
  const [selectedExchangeId, setSelectedExchangeId] = useState<string | null>(null);
  
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="grid gap-1">
              <h1 className="font-heading text-3xl font-bold md:text-4xl">
                Bybit Exchange Test
              </h1>
              <p className="text-muted-foreground">
                Test interface for Bybit exchange integration
              </p>
            </div>
          </div>
          
          <Tabs defaultValue="add" className="space-y-4">
            <TabsList>
              <TabsTrigger value="add">Add Exchange</TabsTrigger>
              <TabsTrigger value="exchanges">Your Exchanges</TabsTrigger>
              <TabsTrigger value="dashboard">Exchange Dashboard</TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4">
              <ExchangeCredentialsForm 
                userId={TEST_USER_ID}
                onCredentialsSaved={() => {
                  // Switch to exchanges tab after saving
                  const exchangesTab = document.querySelector('[data-state="inactive"][value="exchanges"]') as HTMLButtonElement;
                  if (exchangesTab) {
                    exchangesTab.click();
                  }
                }} 
              />
            </TabsContent>
            
            <TabsContent value="exchanges" className="space-y-4">
              <ExchangeList 
                userId={TEST_USER_ID} 
                onSelectExchange={(id) => {
                  setSelectedExchangeId(id);
                  // Switch to dashboard tab
                  const dashboardTab = document.querySelector('[data-state="inactive"][value="dashboard"]') as HTMLButtonElement;
                  if (dashboardTab) {
                    dashboardTab.click();
                  }
                }} 
              />
            </TabsContent>
            
            <TabsContent value="dashboard" className="space-y-4">
              <ExchangeDashboard 
                exchangeId={selectedExchangeId} 
                onExchangeChange={setSelectedExchangeId} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
