'use client';

import { useState, useEffect } from 'react';

// Component to test if basic React is working
export default function TroubleshootPage() {
  const [phase, setPhase] = useState<number>(0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  const addError = (key: string, error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setErrors(prev => ({ ...prev, [key]: errorMessage }));
    addLog(`Error in ${key}: ${errorMessage}`);
  };

  // Phase 0: Basic React
  useEffect(() => {
    addLog('Basic React check passed - Component mounted');
    
    try {
      // Move to phase 1 after confirming basic React works
      setTimeout(() => setPhase(1), 500);
    } catch (error) {
      addError('phase0', error);
    }
  }, []);

  // Phase 1: Testing imports one by one
  useEffect(() => {
    if (phase !== 1) return;
    
    const testImports = async () => {
      addLog('Testing basic module imports...');
      
      // Test #1: Basic utility import
      try {
        addLog('Testing clsx import...');
        const { clsx } = await import('clsx');
        if (typeof clsx === 'function') {
          addLog('✅ clsx import successful');
        }
      } catch (error) {
        addError('clsx', error);
      }
      
      // Test #2: Component utility imports
      try {
        addLog('Testing utils import path...');
        // This will help determine if our paths are correct
        const module = await import('@/components/ui/utils');
        if (typeof module.cn === 'function') {
          addLog('✅ @/components/ui/utils import successful');
        }
      } catch (error) {
        addError('utils', error);
        addLog('⚠️ This suggests path aliases might be misconfigured');
      }
      
      // Test specific UI component imports
      try {
        addLog('Testing Button component import...');
        await import('@/components/ui/button');
        addLog('✅ Button import successful');
      } catch (error) {
        addError('button', error);
      }
      
      try {
        addLog('Testing Card component import...');
        await import('@/components/ui/card');
        addLog('✅ Card import successful');
      } catch (error) {
        addError('card', error);
      }
      
      // Test #3: Providers
      try {
        addLog('Testing web3-provider import...');
        await import('@/providers/web3-provider');
        addLog('✅ web3-provider import successful');
      } catch (error) {
        addError('web3-provider', error);
      }
      
      // Move to next phase
      setPhase(2);
    };
    
    testImports();
  }, [phase]);

  // Phase 2: Check tsconfig paths and Next.js config
  useEffect(() => {
    if (phase !== 2) return;
    
    addLog('Checking for potential config issues...');
    
    // Add user agent info for browser compatibility checks
    addLog(`Browser: ${navigator.userAgent}`);
    
    // Add some helpful advice
    if (Object.keys(errors).length > 0) {
      addLog('\n--- Troubleshooting Suggestions ---');
      if (errors.utils) {
        addLog('1. Check tsconfig.json path aliases (@/ might be misconfigured)');
        addLog('2. Make sure the components/ui/utils.ts file exists');
      }
      if (errors.button || errors.card) {
        addLog('3. Component dependencies might have import path issues');
      }
      if (errors.web3provider) {
        addLog('4. Provider dependencies might be missing or have path issues');
      }
    } else {
      addLog('All imports tested successfully. The issue might be in components not tested here.');
    }
    
  }, [phase, errors]);

  return (
    <div style={{ 
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: 'bold', 
        marginBottom: '16px' 
      }}>
        Dashboard Troubleshooter
      </h1>
      
      <div style={{ 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        backgroundColor: '#f3f4f6'
      }}>
        <strong>Current Phase:</strong> {
          phase === 0 ? 'Basic React Test' :
          phase === 1 ? 'Import Testing' :
          phase === 2 ? 'Config Analysis' :
          'Complete'
        }
      </div>
      
      {Object.keys(errors).length > 0 && (
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '8px' 
          }}>
            Errors Detected
          </h2>
          <ul style={{ paddingLeft: '20px' }}>
            {Object.entries(errors).map(([key, message]) => (
              <li key={key} style={{ marginBottom: '4px' }}>
                <strong>{key}:</strong> {message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ 
        padding: '16px', 
        borderRadius: '8px', 
        border: '1px solid #d1d5db',
        marginBottom: '16px'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '8px' 
        }}>
          Diagnostic Logs
        </h2>
        <div style={{ 
          maxHeight: '400px', 
          overflow: 'auto',
          padding: '12px',
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '14px',
          whiteSpace: 'pre-wrap'
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ 
        padding: '16px', 
        borderRadius: '8px', 
        border: '1px solid #d1d5db' 
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '8px' 
        }}>
          Next Steps
        </h2>
        <p style={{ marginBottom: '12px' }}>
          After identifying issues above, try these steps:
        </p>
        <ol style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            Fix any import path issues detected in the errors section
          </li>
          <li style={{ marginBottom: '8px' }}>
            Check tsconfig.json for proper path aliases configuration
          </li>
          <li style={{ marginBottom: '8px' }}>
            Verify the utils.ts file exists at the expected location
          </li>
          <li style={{ marginBottom: '8px' }}>
            Check for circular dependencies in your component imports
          </li>
        </ol>
      </div>
    </div>
  );
}
