'use client';

import React from 'react';
import { type StaticCrewDefinition, type StaticAgentDefinition, type StaticTaskDefinition } from '@/lib/types/crew';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, ArrowRight, Link as LinkIcon, Zap, Settings2 } from 'lucide-react'; // Icons

interface CrewDefinitionDisplayProps {
  crew: StaticCrewDefinition;
}

export function CrewDefinitionDisplay({ crew }: CrewDefinitionDisplayProps) {
  
  // Helper to find agent role by ID for better readability in tasks
  const getAgentRoleById = (agentId: string): string => {
    const agent = crew.agents.find(a => a.id === agentId);
    return agent ? agent.role : agentId; // Fallback to ID if not found
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary/10 dark:bg-primary/20">
          <div className="flex items-center space-x-3">
            <Zap className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">{crew.name}</CardTitle>
              {crew.description && <CardDescription className="text-base text-muted-foreground mt-1">{crew.description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {crew.process && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Process Type</h4>
              <Badge variant={crew.process === 'sequential' ? 'default' : 'secondary'} className="mt-1 text-sm">
                <Settings2 className="h-4 w-4 mr-1.5" />
                {crew.process.charAt(0).toUpperCase() + crew.process.slice(1)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="mr-2 h-6 w-6 text-accent-foreground" /> Agents ({crew.agents.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crew.agents.map((agent) => (
            <Card key={agent.id} className="flex flex-col h-full">
              <CardHeader className="pb-3 bg-muted/30 dark:bg-muted/20">
                <CardTitle className="text-lg">{agent.role}</CardTitle>
                <CardDescription>ID: <span className="font-mono text-xs">{agent.id}</span></CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 pt-4">
                <p className="text-sm"><strong className="font-medium text-muted-foreground">Goal:</strong> {agent.goal}</p>
                {agent.backstory && <p className="text-sm"><strong className="font-medium text-muted-foreground">Backstory:</strong> {agent.backstory}</p>}
                {agent.llmIdentifier && (
                  <p className="text-sm">
                    <strong className="font-medium text-muted-foreground">LLM:</strong> 
                    <Badge variant="outline" className="ml-1.5 text-xs">{agent.llmIdentifier}</Badge>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Briefcase className="mr-2 h-6 w-6 text-accent-foreground" /> Tasks ({crew.tasks.length})
        </h2>
        <div className="space-y-6">
          {crew.tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30 dark:bg-muted/20">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                 <CardDescription>ID: <span className="font-mono text-xs">{task.id}</span></CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm"><strong className="font-medium text-muted-foreground">Description:</strong> {task.description}</p>
                <p className="text-sm">
                  <strong className="font-medium text-muted-foreground">Assigned Agent:</strong> 
                  <Badge variant="secondary" className="ml-1.5 text-xs">{getAgentRoleById(task.assignedAgentId)} ({task.assignedAgentId})</Badge>
                </p>
                {task.dependencies && task.dependencies.length > 0 && (
                  <div>
                    <strong className="text-sm font-medium text-muted-foreground">Dependencies:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {task.dependencies.map(depId => (
                        <Badge key={depId} variant="outline" className="text-xs flex items-center">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {depId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {task.expectedOutput && <p className="text-sm"><strong className="font-medium text-muted-foreground">Expected Output:</strong> {task.expectedOutput}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
