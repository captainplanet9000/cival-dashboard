import React from 'react';
import { Blocks, ChevronRight, Plus } from 'lucide-react';

export default function ConnectionsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Exchange Connections</h1>
        <p className="text-muted-foreground">
          Manage your exchange API connections and third-party service integrations.
        </p>
      </div>
      
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Connected Exchanges</h2>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Exchange
          </button>
        </div>
        
        <div className="divide-y">
          {/* Exchange Connection */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Bx</span>
              </div>
              <div>
                <h3 className="font-medium">Binance</h3>
                <p className="text-sm text-muted-foreground">Connected on Mar 15, 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400">
                Active
              </span>
              <button className="btn-ghost p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Exchange Connection */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <span className="font-semibold text-purple-600 dark:text-purple-400">Cb</span>
              </div>
              <div>
                <h3 className="font-medium">Coinbase</h3>
                <p className="text-sm text-muted-foreground">Connected on Feb 28, 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400">
                Active
              </span>
              <button className="btn-ghost p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Exchange Connection */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <span className="font-semibold text-red-600 dark:text-red-400">Kc</span>
              </div>
              <div>
                <h3 className="font-medium">Kraken</h3>
                <p className="text-sm text-muted-foreground">Connected on Apr 2, 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-400">
                Limited
              </span>
              <button className="btn-ghost p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Third-Party Services</h2>
          <button className="btn-ghost border flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Connect Service
          </button>
        </div>
        
        <div className="divide-y">
          {/* Service Connection */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">TA</span>
              </div>
              <div>
                <h3 className="font-medium">TradingView</h3>
                <p className="text-sm text-muted-foreground">Alerts and strategy integration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400">
                Connected
              </span>
              <button className="btn-ghost p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Service Connection */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <span className="font-semibold text-orange-600 dark:text-orange-400">CM</span>
              </div>
              <div>
                <h3 className="font-medium">CoinMarketCap</h3>
                <p className="text-sm text-muted-foreground">Market data and analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400">
                Connected
              </span>
              <button className="btn-ghost p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
