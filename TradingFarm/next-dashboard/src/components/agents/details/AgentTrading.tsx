'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Agent } from '@/hooks/use-agents';
import { useAgentStrategies } from '@/hooks/use-agent-strategies'; // Import the new hook
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface AgentTradingProps {
  agent: Agent;
}

export const AgentTrading: React.FC<AgentTradingProps> = ({ agent }) => {
  const { 
    strategies, 
    isLoading, 
    error, 
    refetch 
  } = useAgentStrategies(agent.id);

  const renderLoading = () => (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-md" />
      ))}
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Strategies</AlertTitle>
      <AlertDescription>
        {error || "Could not load trading strategies for this agent."}
      </AlertDescription>
    </Alert>
  );

  const renderStrategiesTable = () => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Strategy Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Config</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {strategies.map((strat) => (
            <TableRow key={strat.id}>
              <TableCell className="font-medium">
                {strat.strategies?.name || 'Unknown Name'}
                {strat.strategies?.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {strat.strategies.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="capitalize">
                {strat.strategies?.strategy_type || 'N/A'}
              </TableCell>
              <TableCell>
                <Badge variant={strat.is_active ? 'default' : 'outline'} 
                       className={strat.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-300'}>
                  {strat.is_active ? 
                    <CheckCircle className="h-3 w-3 mr-1" /> : 
                    <XCircle className="h-3 w-3 mr-1" />
                  }
                  {strat.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                  {JSON.stringify(strat.config, null, 2) || 'No config'}
                </pre>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Strategies</CardTitle>
        <CardDescription>
          Active and inactive trading strategies assigned to this agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && renderLoading()}
        {error && renderError()}
        {!isLoading && !error && strategies.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No trading strategies assigned to this agent.
          </p>
        )}
        {!isLoading && !error && strategies.length > 0 && renderStrategiesTable()}
      </CardContent>
    </Card>
  );
}; 