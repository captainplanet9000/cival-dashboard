'use client';

import React, { useState, useEffect } from 'react';

// Simple dashboard with no complex dependencies
export default function SimpleIndexPage() {
  const [phase, setPhase] = useState(1);
  const [logs, setLogs] = useState<string[]>(['Page initialized']);
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };
  
  // Basic initialization check
  useEffect(() => {
    addLog('Page mounted successfully - React is working');
  }, []);
  
  // Simple styled components to match the Trading Farm design system
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      {children}
    </div>
  );
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trading Farm Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Simplified version for troubleshooting</p>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-md mb-6">
        <h2 className="font-medium mb-2">Diagnostic Information</h2>
        <p>This is a simplified dashboard page to diagnose loading issues.</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Basic React Rendering: Working</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Simple Styling: Working</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Environment">
          <div className="space-y-2">
            <p>Browser: {navigator.userAgent}</p>
            <p>Window Size: {window.innerWidth}x{window.innerHeight}</p>
            <p>Build Time: {new Date().toISOString()}</p>
          </div>
        </Card>
        
        <Card title="Status Log">
          <div className="max-h-[200px] overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 rounded text-sm font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {['Active Trades', 'Performance', 'Risk Level', 'Portfolio'].map(metric => (
          <Card key={metric} title={metric}>
            <div className="text-2xl font-bold">
              {metric === 'Active Trades' ? '24' : 
               metric === 'Performance' ? '+12.4%' : 
               metric === 'Risk Level' ? 'Medium' : 
               '$142,582'}
            </div>
          </Card>
        ))}
      </div>
      
      <div className="mb-6">
        <Card title="Troubleshooting Steps">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Check React Component Tree</h4>
              <p className="text-gray-700 dark:text-gray-300">
                If this page loads but the main dashboard doesn't, the issue is likely in one of the higher-level components.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Verify Providers</h4>
              <p className="text-gray-700 dark:text-gray-300">
                The blank white screen suggests an error in one of the providers (Web3Provider, ThemeProvider, etc.).
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Next Steps</h4>
              <button 
                onClick={() => {
                  addLog('Testing navigation...');
                  window.location.href = '/simplified-dashboard';
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Try Simplified Dashboard
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
