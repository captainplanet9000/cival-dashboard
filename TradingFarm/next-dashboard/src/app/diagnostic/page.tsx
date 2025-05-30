'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Simple status tracker
type ComponentStatus = 'pending' | 'loading' | 'success' | 'error';

// Track initialization steps to pinpoint failures
const DiagnosticPage = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [componentStatus, setComponentStatus] = useState<{[key: string]: ComponentStatus}>({
    basic: 'pending',
    imports: 'pending',
    ui: 'pending',
    providers: 'pending'
  });

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const updateStatus = (component: string, status: ComponentStatus) => {
    setComponentStatus(prev => ({ ...prev, [component]: status }));
    addLog(`Component "${component}" status: ${status}`);
  };

  useEffect(() => {
    // Check basic React rendering
    try {
      updateStatus('basic', 'loading');
      updateStatus('basic', 'success');
      addLog('Basic React rendering successful');
    } catch (error) {
      updateStatus('basic', 'error');
      addLog(`Basic React Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Basic React Error:', error);
    }

    // Check UI components
    try {
      updateStatus('ui', 'loading');
      // This will fail if Card component has issues
      updateStatus('ui', 'success'); 
      addLog('UI components loaded successfully');
    } catch (error) {
      updateStatus('ui', 'error');
      addLog(`UI Component Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('UI Component Error:', error);
    }

    // Collect browser information
    addLog(`User Agent: ${navigator.userAgent}`);
    addLog(`Window Size: ${window.innerWidth}x${window.innerHeight}`);
    
    if (typeof window !== 'undefined') {
      // Capture global errors
      const handleGlobalError = (event: ErrorEvent) => {
        addLog(`Global Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
        event.preventDefault();
      };
      
      window.addEventListener('error', handleGlobalError);
      return () => window.removeEventListener('error', handleGlobalError);
    }
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Diagnostic Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Component Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(componentStatus).map(([component, status]) => (
              <div key={component} className="flex items-center justify-between border p-3 rounded">
                <span className="font-medium">{component}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  status === 'success' ? 'bg-green-100 text-green-800' : 
                  status === 'error' ? 'bg-red-100 text-red-800' :
                  status === 'loading' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            ) : (
              <div className="text-gray-500">No logs yet...</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticPage;
