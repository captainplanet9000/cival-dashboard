"use client";  

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { StrategyManagement } from '@/components/strategy/StrategyManagement';

export default function StrategiesPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <PageHeader 
        title="Strategies & Brain" 
        description="Define, manage, and link trading strategies with brain assets."
      />

      <div className="mt-8"> 
        <StrategyManagement />
      </div>
    </div>
  );
}
