'use client';

import React, { useEffect, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  InfoIcon 
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StrategyValidationProps {
  nodes: Node[];
  edges: Edge[];
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  nodeId?: string;
}

const StrategyValidation: React.FC<StrategyValidationProps> = ({ nodes, edges }) => {
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    validateStrategy();
  }, [nodes, edges]);

  const validateStrategy = () => {
    const issues: ValidationIssue[] = [];
    
    // Check if there are any nodes
    if (nodes.length === 0) {
      issues.push({
        type: 'error',
        message: 'Empty strategy',
        details: 'Add at least one entry and one exit node to create a valid strategy'
      });
    }
    
    // Check for presence of entry and exit nodes
    const entryNodes = nodes.filter(node => node.type === 'entry');
    const exitNodes = nodes.filter(node => node.type === 'exit');
    
    if (entryNodes.length === 0) {
      issues.push({
        type: 'error',
        message: 'Missing entry node',
        details: 'Add an entry node to define when to enter a position'
      });
    }
    
    if (exitNodes.length === 0) {
      issues.push({
        type: 'error',
        message: 'Missing exit node',
        details: 'Add an exit node to define when to exit a position'
      });
    }
    
    // Check for disconnected nodes
    nodes.forEach(node => {
      const isConnected = edges.some(edge => 
        edge.source === node.id || edge.target === node.id
      );
      
      if (!isConnected && nodes.length > 1) {
        issues.push({
          type: 'warning',
          message: `Disconnected node: ${node.data.label}`,
          details: 'Connect this node to other nodes in your strategy',
          nodeId: node.id
        });
      }
    });
    
    // Check for circular references
    // This is a simplified check - a more robust implementation would use a graph algorithm
    if (edges.length > 0) {
      const visited = new Set<string>();
      const visiting = new Set<string>();
      
      const hasCycle = (nodeId: string): boolean => {
        if (visited.has(nodeId)) return false;
        if (visiting.has(nodeId)) return true;
        
        visiting.add(nodeId);
        
        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          if (hasCycle(edge.target)) return true;
        }
        
        visiting.delete(nodeId);
        visited.add(nodeId);
        return false;
      };
      
      // Start DFS from each node
      for (const node of nodes) {
        if (hasCycle(node.id)) {
          issues.push({
            type: 'error',
            message: 'Circular reference detected',
            details: 'Your strategy contains a circular reference, which can cause infinite loops'
          });
          break;
        }
      }
    }
    
    // Check for incomplete configuration
    nodes.forEach(node => {
      if (node.type === 'indicator' && (!node.data.indicator && !node.data.parameters?.indicator)) {
        issues.push({
          type: 'warning',
          message: `Incomplete indicator: ${node.data.label}`,
          details: 'Select an indicator type in the properties panel',
          nodeId: node.id
        });
      }
      
      if (node.type === 'filter' && (!node.data.filter && !node.data.parameters?.filter)) {
        issues.push({
          type: 'warning',
          message: `Incomplete filter: ${node.data.label}`,
          details: 'Select a filter type in the properties panel',
          nodeId: node.id
        });
      }
    });
    
    // Check for signal path
    const hasPathFromEntryToExit = () => {
      if (entryNodes.length === 0 || exitNodes.length === 0 || edges.length === 0) {
        return false;
      }
      
      // For simplicity, check if there's at least one entry and one exit that are connected in the graph
      const reachableFromEntry = new Set<string>();
      
      // Helper function to find all nodes reachable from start
      const findReachable = (startId: string) => {
        reachableFromEntry.add(startId);
        
        const outgoingEdges = edges.filter(edge => edge.source === startId);
        for (const edge of outgoingEdges) {
          if (!reachableFromEntry.has(edge.target)) {
            findReachable(edge.target);
          }
        }
      };
      
      // Start from each entry node
      for (const entryNode of entryNodes) {
        findReachable(entryNode.id);
      }
      
      // Check if any exit node is reachable
      return exitNodes.some(exitNode => reachableFromEntry.has(exitNode.id));
    };
    
    if (!hasPathFromEntryToExit() && entryNodes.length > 0 && exitNodes.length > 0) {
      issues.push({
        type: 'error',
        message: 'No path from entry to exit',
        details: 'Create a connection path from entry node to exit node'
      });
    }
    
    // Additional warnings
    if (entryNodes.length > 1) {
      issues.push({
        type: 'info',
        message: 'Multiple entry nodes',
        details: 'Your strategy has multiple entry points, ensure this is intentional'
      });
    }
    
    // Set validation issues
    setValidationIssues(issues);
    
    // Strategy is valid if there are no errors
    setIsValid(!issues.some(issue => issue.type === 'error'));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Strategy Validation</CardTitle>
          <CardDescription>
            Check your strategy for errors and warnings before saving or backtesting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              isValid ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {isValid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-medium">
                {isValid ? 'Strategy is valid' : 'Strategy has validation issues'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isValid 
                  ? 'Your strategy passed all critical validation checks' 
                  : 'Please fix the errors below before saving or backtesting'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {validationIssues.length > 0 && (
        <div className="space-y-4">
          {validationIssues.map((issue, index) => (
            <Alert 
              key={index} 
              variant={issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'warning' : 'default'}
            >
              {issue.type === 'error' && <XCircle className="h-4 w-4" />}
              {issue.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
              {issue.type === 'info' && <InfoIcon className="h-4 w-4" />}
              <AlertTitle>
                {issue.message}
                {issue.nodeId && ` (Node ID: ${issue.nodeId})`}
              </AlertTitle>
              {issue.details && (
                <AlertDescription>
                  {issue.details}
                </AlertDescription>
              )}
            </Alert>
          ))}
        </div>
      )}

      {validationIssues.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center text-center p-4">
              <div>
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-xl font-medium">All Checks Passed</p>
                <p className="text-muted-foreground">
                  Your strategy is valid and ready for backtesting and deployment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StrategyValidation;
