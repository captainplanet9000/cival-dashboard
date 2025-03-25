"use client"

import { TradingWebDashboard } from '@/components/web3/trading-web-dashboard'
import { Web3KnowledgeProvider } from '@/components/web3/web3-knowledge-connector'

export default function Web3DashboardPage() {
  return (
    <Web3KnowledgeProvider>
      <div className="container mx-auto pb-16">
        <TradingWebDashboard />
      </div>
    </Web3KnowledgeProvider>
  )
}
