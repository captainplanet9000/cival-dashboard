'use client';

import React, { useState } from 'react';
import { Network } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CollaborativeIntelligenceCenter } from '@/components/collaboration/CollaborativeIntelligenceCenter';
import { useAuth } from '@/hooks';

export default function CollaborationDashboard() {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col gap-8 pb-10">
      <Alert className="bg-blue-50 dark:bg-blue-950/30">
        <Network className="h-4 w-4" />
        <AlertTitle>Collaborative Mode Active</AlertTitle>
        <AlertDescription>
          You are connected with 5 other team members. All actions and insights are shared in real-time.
        </AlertDescription>
      </Alert>
      
      <CollaborativeIntelligenceCenter userId={user?.id} />
    </div>
  );
} 