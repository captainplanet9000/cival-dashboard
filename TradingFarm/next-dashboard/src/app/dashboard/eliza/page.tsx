'use client';

import { AgentCommands } from '@/components/eliza/AgentCommands';
import { KnowledgeBase } from '@/components/eliza/KnowledgeBase';
import { AgentCoordination } from '@/components/eliza/AgentCoordination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ElizaOSPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ElizaOS Integration</h1>
          <p className="text-muted-foreground">
            Manage agent commands, knowledge base, and multi-agent coordination
          </p>
        </div>

        <Tabs defaultValue="commands" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="coordination">Agent Coordination</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="commands" className="mt-4">
            <AgentCommands />
          </TabsContent>
          
          <TabsContent value="knowledge" className="mt-4">
            <KnowledgeBase />
          </TabsContent>
          
          <TabsContent value="coordination" className="mt-4">
            <AgentCoordination />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS Settings</CardTitle>
                <CardDescription>
                  Configure ElizaOS integration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Settings configuration will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
