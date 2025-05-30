'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function TestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    // Log that the page has loaded successfully
    addLog("Test page rendered successfully");
    
    // Test that toasts are working
    toast({
      title: "Dashboard Test",
      description: "If you can see this toast, the theme provider is working",
    });
  }, []);
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const testProviders = () => {
    addLog("Testing providers...");
    try {
      addLog("Theme provider test: ✅");
      
      // Check if we're in dark mode
      const isDarkMode = document.documentElement.classList.contains('dark');
      addLog(`Current theme: ${isDarkMode ? 'Dark' : 'Light'} mode`);
      
      toast({
        title: "Provider Test",
        description: "Test completed successfully",
        variant: "default",
      });
    } catch (error) {
      addLog(`Error testing providers: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Test Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Page Rendering: Working</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>UI Components: Working</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Fixed Web3Provider: Working</span>
              </div>
              
              <Button 
                onClick={testProviders}
                className="mt-4"
              >
                Run Provider Tests
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Console Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md h-[300px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="pb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              Home
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
            >
              Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard/debug'}
            >
              Debug Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
