'use client';

import React from 'react';

// Bare minimal page with no dependencies on potentially problematic components
export default function SimplifiedDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Trading Farm Dashboard</h1>
      <p className="mb-8 text-gray-500">Simplified version for troubleshooting</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Simplified metric cards */}
        {['Active Trades', 'Performance', 'Risk Level', 'Portfolio Value'].map((title) => (
          <div key={title} className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-4">
            <div className="flex items-center space-x-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
                <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-xl font-bold">
                  {title === 'Active Trades' ? '24' :
                    title === 'Performance' ? '+12.4%' :
                    title === 'Risk Level' ? 'Medium' :
                    '$142,582'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Master Control Panel</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['System', 'Risk', 'Exchange', 'ElizaOS'].map((control) => (
                <div key={control} className="border rounded-md p-4 text-center">
                  <p className="font-medium">{control}</p>
                  <div className="mt-2 flex justify-center">
                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center px-1">
                      <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6 h-full">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {['Connect Wallet', 'Add Strategy', 'Create Farm', 'Set Goal'].map((action) => (
                <button 
                  key={action}
                  className="w-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 py-2 px-4 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Active Trades</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pair</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { pair: 'BTC/USD', type: 'Long', entry: '64,250', current: '65,120', pnl: '+1.35%' },
                { pair: 'ETH/USD', type: 'Long', entry: '3,120', current: '3,240', pnl: '+3.85%' },
                { pair: 'SOL/USD', type: 'Short', entry: '140.50', current: '136.25', pnl: '+3.02%' }
              ].map((trade, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 whitespace-nowrap">{trade.pair}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      trade.type === 'Long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">${trade.entry}</td>
                  <td className="px-4 py-3 whitespace-nowrap">${trade.current}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-green-600">{trade.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Goal Progress</h2>
          <div className="space-y-4">
            {[
              { goal: 'Monthly Income', target: '$5,000', current: '$3,750', percent: 75 },
              { goal: 'Portfolio Growth', target: '10%', current: '7.2%', percent: 72 }
            ].map((goal, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between">
                  <span>{goal.goal}</span>
                  <span>{goal.current} / {goal.target}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${goal.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { name: 'ElizaOS', status: 'Online', uptime: '5d 12h' },
              { name: 'Trading Engine', status: 'Online', uptime: '5d 12h' },
              { name: 'Data Feeds', status: 'Online', uptime: '5d 12h' },
              { name: 'Network', status: 'Online', uptime: '5d 12h' }
            ].map((system, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                <span>{system.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  <span className="text-sm text-gray-500">{system.status} ({system.uptime})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
