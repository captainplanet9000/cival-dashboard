'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'TradingFarm/next-dashboard/src/components/ui/dialog';
import { Button } from 'TradingFarm/next-dashboard/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'TradingFarm/next-dashboard/src/components/ui/table';
import { Checkbox } from 'TradingFarm/next-dashboard/src/components/ui/checkbox';
import { Badge } from 'TradingFarm/next-dashboard/src/components/ui/badge';
import { Input } from 'TradingFarm/next-dashboard/src/components/ui/input';
import { Search } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  status: 'available' | 'assigned' | 'offline';
  type: string;
  performance: number;
}

interface Farm {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  agentCount: number;
  strategyCount: number;
  performance: number;
}

interface AssignAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farm: Farm | null;
}

const mockAgents: Agent[] = [
  {
    id: 1,
    name: 'Agent Alpha',
    status: 'available',
    type: 'Momentum',
    performance: 15.2
  },
  {
    id: 2,
    name: 'Agent Beta',
    status: 'assigned',
    type: 'Mean Reversion',
    performance: 8.7
  },
  {
    id: 3,
    name: 'Agent Gamma',
    status: 'available',
    type: 'Trend Following',
    performance: 12.1
  },
  {
    id: 4,
    name: 'Agent Delta',
    status: 'offline',
    type: 'Arbitrage',
    performance: -2.3
  }
];

export function AssignAgentDialog({ open, onOpenChange, farm }: AssignAgentDialogProps) {
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAgents = mockAgents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAgent = (agentId: number) => {
    setSelectedAgents(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      }
      return [...prev, agentId];
    });
  };

  const handleAssignAgents = async () => {
    if (!farm) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Implement agent assignment API call
      console.log('Assigning agents:', selectedAgents, 'to farm:', farm.id);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onOpenChange(false);
      setSelectedAgents([]);
    } catch (error) {
      console.error('Error assigning agents:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'assigned':
        return 'bg-blue-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Assign Agents to Farm</DialogTitle>
          <DialogDescription>
            {farm ? `Select agents to assign to ${farm.name}` : 'Select a farm first'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Agent Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={() => handleSelectAgent(agent.id)}
                      disabled={agent.status === 'offline' || agent.status === 'assigned'}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{agent.type}</TableCell>
                  <TableCell className="text-right">
                    <span className={agent.performance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {agent.performance}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignAgents}
            disabled={isSubmitting || selectedAgents.length === 0 || !farm}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Selected Agents'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 