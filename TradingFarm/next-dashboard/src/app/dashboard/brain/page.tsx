'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, BookOpen, Library, Code, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BrainPage() {
  const [activeTab, setActiveTab] = useState('command');

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">The Brain</h1>
        <p className="text-muted-foreground">
          Your AI-powered command center for trading intelligence and strategy management
        </p>
      </div>

      <Tabs defaultValue="command" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="command" className="flex items-center">
            <Brain className="mr-2 h-4 w-4" />
            AI Command Center
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="strategies" className="flex items-center">
            <Library className="mr-2 h-4 w-4" />
            Strategy Library
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center">
            <Code className="mr-2 h-4 w-4" />
            Strategy Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="command" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Command Center</CardTitle>
              <CardDescription>
                Interact with ElizaOS AI to manage your trading operations and retrieve information
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/dashboard/brain/command">
                    <Zap className="mr-2 h-4 w-4" />
                    Go to Command Center
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Access your trading knowledge library and market intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/dashboard/brain/knowledge">
                    <Zap className="mr-2 h-4 w-4" />
                    Go to Knowledge Base
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Library</CardTitle>
              <CardDescription>
                Browse, manage, and deploy your trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/dashboard/brain/strategies">
                    <Zap className="mr-2 h-4 w-4" />
                    Go to Strategy Library
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Builder</CardTitle>
              <CardDescription>
                Create and customize trading strategies with our advanced builder
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/dashboard/brain/builder">
                    <Zap className="mr-2 h-4 w-4" />
                    Go to Strategy Builder
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
