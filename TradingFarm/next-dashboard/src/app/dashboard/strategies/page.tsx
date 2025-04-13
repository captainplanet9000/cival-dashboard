"use client"

import { StrategyManagement } from '@/components/strategy/StrategyManagement'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trading Strategies | Trading Farm Dashboard',
  description: 'Create, manage, and deploy trading strategies with the Trading Farm platform',
}

export default function StrategiesPage() {
  return (
    <div className="p-6">
      <StrategyManagement />
    </div>
  )
}
