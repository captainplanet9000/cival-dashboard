'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleDebugPage() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);
    console.log("Simple diagnostic page loaded successfully");
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#3b82f6', marginBottom: '20px' }}>Simple Diagnostic Page</h1>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          padding: '15px', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px',
          backgroundColor: '#f8fafc'
        }}>
          <p><strong>Client-side rendering:</strong> {initialized ? '✅ Working' : '❌ Not working'}</p>
          <p><strong>Next.js routing:</strong> ✅ Working (page loaded)</p>
          <p><strong>JavaScript execution:</strong> ✅ Working</p>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '10px',
      }}>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Home
        </button>
        
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
