'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Brain, BookOpen, Library, Code, Zap, Upload, BrainCircuit, FileIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrainFileUpload } from '@/components/brain/BrainFileUpload';
import { BrainFilesTable } from '@/components/brain/BrainFilesTable';
import { ElizaOSConsole } from '@/components/brain/ElizaOSConsole';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';

export default function BrainPage() {
  const [activeTab, setActiveTab] = useState('knowledge');
  const supabase = createBrowserClient();
  
  // Fetch current user's farmId
  const { data: farmData } = useQuery({
    queryKey: ['userFarm'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      
      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      return farms?.[0] || null;
    }
  });

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">The Brain</h1>
        <p className="text-muted-foreground">
          Your AI-powered command center for trading intelligence and strategy management
        </p>
      </div>

      <Tabs defaultValue="knowledge" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="knowledge" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="elizaos" className="flex items-center">
            <BrainCircuit className="mr-2 h-4 w-4" />
            ElizaOS Integration
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Upload Brain Files
          </TabsTrigger>
          <TabsTrigger value="strategies" className="flex items-center">
            <Library className="mr-2 h-4 w-4" />
            Strategies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Brain Files & Knowledge Base</CardTitle>
                <CardDescription>
                  View and manage your brain files, which are used by ElizaOS for intelligent trading decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrainFilesTable farmId={farmData?.id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="elizaos" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <ElizaOSConsole farmId={farmData?.id} />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <BrainFileUpload farmId={farmData?.id} onSuccess={() => setActiveTab('knowledge')} />
          </div>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Management</CardTitle>
              <CardDescription>
                Browse, manage, and deploy your trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="text-center">
                  <p className="mb-4">Manage your existing strategies or create new ones</p>
                  <div className="flex gap-4">
                    <Button asChild>
                      <Link href="/dashboard/strategies">
                        <Library className="mr-2 h-4 w-4" />
                        View All Strategies
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/strategies?new=true">
                        <Code className="mr-2 h-4 w-4" />
                        Create New Strategy
                      </Link>
                    </Button>
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">You can connect strategies to specific agents:</p>
                  <Button variant="secondary" asChild>
                    <Link href="/dashboard/agents">
                      <Brain className="mr-2 h-4 w-4" />
                      Manage Agents
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
