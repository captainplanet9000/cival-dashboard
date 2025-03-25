'use client';

import React, { useEffect, useState } from 'react';

export default function DiagPage() {
  const [status, setStatus] = useState('Loading');
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };
  
  useEffect(() => {
    try {
      addLog('Page mounted');
      setStatus('Ready');
      
      // Get window info
      addLog(`Window Size: ${window.innerWidth}x${window.innerHeight}`);
      addLog(`User Agent: ${navigator.userAgent}`);
      
      // Capture any global errors
      const errorHandler = (e: ErrorEvent) => {
        addLog(`ERROR: ${e.message} at ${e.filename}:${e.lineno}`);
        e.preventDefault();
      };
      
      window.addEventListener('error', errorHandler);
      return () => window.removeEventListener('error', errorHandler);
    } catch (error) {
      addLog(`Init Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('Error');
    }
  }, []);
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Trading Farm Dashboard Diagnostic
      </h1>
      
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px',
        borderRadius: '6px',
        backgroundColor: status === 'Ready' ? '#dcfce7' : '#fee2e2'
      }}>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          backgroundColor: status === 'Ready' ? '#22c55e' : '#ef4444',
          marginRight: '8px'
        }}></div>
        <span>Status: {status}</span>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => addLog('Button clicked')}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Test Button
        </button>
      </div>
      
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          Diagnostic Logs
        </h2>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '12px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          {logs.length > 0 ? (
            logs.map((entry, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {entry}
              </div>
            ))
          ) : (
            <div style={{ color: '#6b7280' }}>No logs yet...</div>
          )}
        </div>
      </div>
      
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          Troubleshooting Steps
        </h2>
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            Check if this page loads but the main dashboard doesn't
          </li>
          <li style={{ marginBottom: '8px' }}>
            Look at server console for compilation errors
          </li>
          <li style={{ marginBottom: '8px' }}>
            Inspect the error logs captured above
          </li>
          <li style={{ marginBottom: '8px' }}>
            Try navigating to <a href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline' }}>dashboard</a> after viewing errors
          </li>
        </ul>
      </div>
    </div>
  );
}
