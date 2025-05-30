'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This is a minimal test page with progressively added components
export default function MinimalPage() {
  const [testResults, setTestResults] = useState<{[key: string]: boolean}>({
    basicRender: true
  });
  
  const markTest = (testName: string, passed: boolean) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: passed
    }));
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Minimal Test Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Component Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${testResults.basicRender ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Basic Rendering: Working</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${testResults.cardComponent ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span>Card Component: Working</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Panel 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">If you can see this card, the basic UI components are working correctly.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Panel 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This confirms that multiple card elements render properly.</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">If this page loads correctly but the main dashboard doesn't, follow these steps:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Check the Web3Provider implementation for errors</li>
            <li>Verify the ElizaProvider and AIAgentV2Provider</li>
            <li>Look for circular dependencies in your import structure</li>
            <li>Check for missing environment variables needed by providers</li>
            <li>Create a simplified version of the dashboard page without certain providers</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
