import React from 'react';
import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import { ResourceManager } from '@/components/farm/environment/resource-manager';
import { CollaborationWorkspace } from '@/components/farm/environment/collaboration-workspace';
import { EnvironmentTemplates } from '@/components/farm/environment/environment-templates';
import { BybitTestUtility } from '@/components/testing/bybit-test-utility';
import { TradeVisualization } from '@/components/dashboard/trade-visualization';

export const metadata: Metadata = {
  title: 'Agent Trading Environment | Trading Farm',
  description: 'Comprehensive agent trading environment with resources, collaboration, and visualizations',
};

export default function AgentTradingPage() {
  const farmId = "1"; // This would be dynamic in a real application
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink>Agent Trading</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <h1 className="text-3xl font-bold tracking-tight">Agent Trading Environment</h1>
        <p className="text-muted-foreground">
          Manage trading resources, collaborate with agents, and monitor performance
        </p>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold tracking-tight">Trading Performance</h2>
          <TradeVisualization farmId={farmId} />
          
          <h2 className="text-xl font-semibold tracking-tight mt-8">API Testing</h2>
          <BybitTestUtility />
        </TabsContent>
        
        <TabsContent value="resources" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold tracking-tight">Environment Resources</h2>
          <p className="text-muted-foreground mb-4">
            Manage API connections, data feeds, and database resources for your trading agents
          </p>
          <ResourceManager farmId={farmId} />
        </TabsContent>
        
        <TabsContent value="collaboration" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold tracking-tight">Agent Collaboration</h2>
          <p className="text-muted-foreground mb-4">
            Enable communication and knowledge sharing between human traders and AI agents
          </p>
          <div className="h-[800px]">
            <CollaborationWorkspace farmId={farmId} />
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold tracking-tight">Environment Templates</h2>
          <p className="text-muted-foreground mb-4">
            Use predefined templates to quickly set up trading environments for various strategies
          </p>
          <EnvironmentTemplates farmId={farmId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
