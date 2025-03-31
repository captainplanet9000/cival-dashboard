'use client';

import { useState } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Settings, Users, ChevronRight } from 'lucide-react';
import { AssignAgentDialog } from './AssignAgentDialog';

interface Farm {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  agentCount: number;
  strategyCount: number;
  performance: number;
}

const mockFarms: Farm[] = [
  {
    id: '1',
    name: 'Momentum Farm',
    status: 'active',
    agentCount: 5,
    strategyCount: 3,
    performance: 12.5
  },
  {
    id: '2',
    name: 'Mean Reversion Farm',
    status: 'paused',
    agentCount: 3,
    strategyCount: 2,
    performance: 8.2
  }
];

export function FarmList() {
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const getStatusColor = (status: Farm['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'stopped':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleAssignAgent = (farmId: string) => {
    const farm = mockFarms.find(f => f.id === farmId);
    setSelectedFarm(farm || null);
    setIsAssignDialogOpen(true);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Farm Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agents</TableHead>
            <TableHead>Strategies</TableHead>
            <TableHead className="text-right">Performance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockFarms.map((farm) => (
            <TableRow key={farm.id}>
              <TableCell className="font-medium">{farm.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={getStatusColor(farm.status)}>
                  {farm.status.charAt(0).toUpperCase() + farm.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{farm.agentCount}</TableCell>
              <TableCell>{farm.strategyCount}</TableCell>
              <TableCell className="text-right">{farm.performance}%</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" size="icon">
                    {farm.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleAssignAgent(farm.id)}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AssignAgentDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        farm={selectedFarm}
      />
    </div>
  );
} 