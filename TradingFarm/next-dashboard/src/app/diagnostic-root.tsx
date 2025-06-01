'use client';

import React, { useState } from 'react';

// This is a minimal diagnostic page with no imports
// to track down what's causing the blank screen
export default function DiagnosticRoot() {
  const [log, setLog] = useState<string[]>(['Page initialized']);
  
  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
    console.log(message);
  };
  
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
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => addLog('Basic interaction works')}
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
          Test Interaction
        </button>
      </div>
      
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          Log Output
        </h2>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '12px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          {log.map((entry, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          Next Steps
        </h2>
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            If this page loads but the dashboard doesn't, the issue is likely with component imports
          </li>
          <li style={{ marginBottom: '8px' }}>
            Check browser console for specific error messages
          </li>
          <li style={{ marginBottom: '8px' }}>
            Verify that all required dependencies are installed correctly
          </li>
        </ul>
      </div>
    </div>
  );
}
