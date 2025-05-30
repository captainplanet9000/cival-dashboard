'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { MockDataProvider } from '@/providers/mock-data-provider';
import ElizaOSCommandConsole from '@/components/elizaos/CommandConsole';
import MetaMaskConnector from '@/components/wallets/MetaMaskConnector';
import GoalBasedTrading from '@/components/goals/GoalBasedTrading';
import { Navbar } from '@/app/dashboard/navbar';
import MobileNavigation from '@/components/mobile/MobileNavigation';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function TradingHubPage() {
  const [loading, setLoading] = useState({
    metamask: false,
    elizaos: false,
    goals: false
  });
  const [error, setError] = useState({
    metamask: false,
    elizaos: false,
    goals: false
  });

  // Simulate loading states for demonstration purposes
  const simulateLoading = (component: 'metamask' | 'elizaos' | 'goals') => {
    setLoading(prev => ({ ...prev, [component]: true }));
    setError(prev => ({ ...prev, [component]: false }));
    
    setTimeout(() => {
      setLoading(prev => ({ ...prev, [component]: false }));
    }, 2000);
  };

  // Simulate error states for demonstration purposes
  const simulateError = (component: 'metamask' | 'elizaos' | 'goals') => {
    setLoading(prev => ({ ...prev, [component]: true }));
    
    setTimeout(() => {
      setLoading(prev => ({ ...prev, [component]: false }));
      setError(prev => ({ ...prev, [component]: true }));
    }, 2000);
  };

  // Reset error state
  const resetError = (component: 'metamask' | 'elizaos' | 'goals') => {
    setError(prev => ({ ...prev, [component]: false }));
  };

  return (
    <MockDataProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <MobileNavigation />
        
        <div className="container mx-auto px-2 py-6">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs />
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Trading Farm Hub</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="dashboard" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="dashboard">Dashboard Overview</TabsTrigger>
                    <TabsTrigger value="wallet">MetaMask Integration</TabsTrigger>
                    <TabsTrigger value="goals">Goal-Based Trading</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dashboard" className="space-y-6">
                    <div className="mb-4">
                      <p className="text-muted-foreground">
                        Welcome to the Trading Farm Hub. This dashboard provides integrated tools to manage your trading activities
                        using our ElizaOS AI assistant, MetaMask wallet integration, and goal-based trading features.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex justify-between">
                            <span>MetaMask Wallet</span>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => simulateLoading('metamask')}
                              >
                                Test Loading
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => simulateError('metamask')}
                              >
                                Test Error
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loading.metamask ? (
                            <div className="space-y-3">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-24 w-full" />
                              <Skeleton className="h-12 w-full" />
                            </div>
                          ) : error.metamask ? (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>
                                Failed to connect to MetaMask. Please check your connection and try again.
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="mt-2" 
                                  onClick={() => resetError('metamask')}
                                >
                                  Try Again
                                </Button>
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="h-[200px] flex items-center justify-center">
                              <Button variant="default" onClick={() => window.location.href = '/trading-hub?tab=wallet'}>
                                Connect Wallet
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex justify-between">
                            <span>Goal-Based Trading</span>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => simulateLoading('goals')}
                              >
                                Test Loading
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => simulateError('goals')}
                              >
                                Test Error
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loading.goals ? (
                            <div className="space-y-3">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-24 w-full" />
                              <Skeleton className="h-12 w-full" />
                            </div>
                          ) : error.goals ? (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>
                                Failed to load goal data. Please try again later.
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="mt-2" 
                                  onClick={() => resetError('goals')}
                                >
                                  Try Again
                                </Button>
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="h-[200px] flex items-center justify-center">
                              <Button variant="default" onClick={() => window.location.href = '/trading-hub?tab=goals'}>
                                Manage Goals
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex justify-between">
                          <span>ElizaOS AI Assistant</span>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => simulateLoading('elizaos')}
                            >
                              Test Loading
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => simulateError('elizaos')}
                            >
                              Test Error
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loading.elizaos ? (
                          <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ) : error.elizaos ? (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                              Failed to connect to ElizaOS. Please check your connection and try again.
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="mt-2" 
                                onClick={() => resetError('elizaos')}
                              >
                                Try Again
                              </Button>
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <ElizaOSCommandConsole />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="wallet">
                    <MetaMaskConnector />
                  </TabsContent>
                  
                  <TabsContent value="goals">
                    <GoalBasedTrading />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MockDataProvider>
  );
}
