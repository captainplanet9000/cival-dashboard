"use client";

import React from 'react';
import VaultDashboard from '@/components/vault/VaultDashboard';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, LockIcon } from 'lucide-react';

export default function VaultBankingPage() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LockIcon className="h-5 w-5 mr-2 text-primary" /> 
            Secure Vault Banking
          </CardTitle>
          <CardDescription>
            Authentication required to access vault banking features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">Authentication Required</p>
              <p className="text-sm text-muted-foreground">
                Please sign in to access your secure vault banking features and manage your trading funds.
              </p>
            </div>
          </div>
          <Button>Sign In</Button>
        </CardContent>
      </Card>
    );
  }
  
  // Get user ID from session
  const userId = session?.user?.id || session?.user?.email || '';
  
  return (
    <div className="space-y-6">
      <VaultDashboard userId={userId} />
    </div>
  );
} 