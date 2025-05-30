"use client";

import { useState } from 'react';
import { useFarm } from '@/hooks/useFarm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus } from 'lucide-react';

export default function FarmsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmDescription, setNewFarmDescription] = useState('');
  const [newFarmGoal, setNewFarmGoal] = useState('');
  const [newFarmRiskLevel, setNewFarmRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const { farms, createFarm, deleteFarm, isLoading } = useFarm({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });

  const handleCreateFarm = async () => {
    const result = await createFarm({
      name: newFarmName,
      description: newFarmDescription,
      goal: newFarmGoal,
      riskLevel: newFarmRiskLevel,
      ownerId: 'current-user-id', // TODO: Get from auth context
    });

    if (result.success) {
      setIsCreateDialogOpen(false);
      setNewFarmName('');
      setNewFarmDescription('');
      setNewFarmGoal('');
      setNewFarmRiskLevel('medium');
    } else {
      console.error('Failed to create farm:', result.error);
    }
  };

  const handleDeleteFarm = async (farmId: string) => {
    const result = await deleteFarm(farmId);
    if (!result.success) {
      console.error('Failed to delete farm:', result.error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trading Farms</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Farm
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Trading Farm</DialogTitle>
              <DialogDescription>
                Set up a new trading farm to manage your assets and strategies.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Farm Name</Label>
                <Input
                  id="name"
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  placeholder="My Trading Farm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newFarmDescription}
                  onChange={(e) => setNewFarmDescription(e.target.value)}
                  placeholder="Description of your trading farm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goal">Goal</Label>
                <Input
                  id="goal"
                  value={newFarmGoal}
                  onChange={(e) => setNewFarmGoal(e.target.value)}
                  placeholder="Trading goal"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={newFarmRiskLevel}
                  onValueChange={(value: 'low' | 'medium' | 'high') => setNewFarmRiskLevel(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFarm}>Create Farm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farm Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>24h Change</TableHead>
              <TableHead>Active Agents</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farms.map((farm) => (
              <TableRow key={farm.id}>
                <TableCell className="font-medium">{farm.name}</TableCell>
                <TableCell>{farm.description}</TableCell>
                <TableCell>{formatDate(farm.created_at)}</TableCell>
                <TableCell>{formatCurrency(farm.total_value || 0)}</TableCell>
                <TableCell className={farm.value_change_24h > 0 ? 'text-green-600' : 'text-red-600'}>
                  {farm.value_change_24h > 0 ? '+' : ''}{farm.value_change_24h}%
                </TableCell>
                <TableCell>{farm.farm_agents?.length || 0}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteFarm(farm.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
} 