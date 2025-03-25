"use client";

import React, { useState } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, MoreHorizontal, Bot, Settings, Trash2, Plus } from "lucide-react";
import { useFarmManagement } from './farm-management-provider';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FarmTable() {
  const { farmData, loading, error, activateFarm, pauseFarm, refreshFarms } = useFarmManagement();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Farms</CardTitle>
          <CardDescription>Loading farm data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Farms</CardTitle>
          <CardDescription>Error loading farm data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Farms</CardTitle>
          <CardDescription>Manage your trading farms</CardDescription>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-4 w-4" />
              Create Farm
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Farm</DialogTitle>
              <DialogDescription>
                Configure your new trading farm. It will be automatically connected to the message bus.
              </DialogDescription>
            </DialogHeader>
            <CreateFarmForm onSuccess={() => {
              setCreateDialogOpen(false);
              refreshFarms();
            }} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!farmData || farmData.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">No farms found</p>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Farm</Button>
          </div>
        ) : (
          <Table>
            <TableCaption>A list of your farms</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmData.map((farm) => (
                <TableRow key={farm.id}>
                  <TableCell className="font-medium">
                    {farm.name}
                  </TableCell>
                  <TableCell>
                    <FarmStatusBadge status={farm.status} />
                  </TableCell>
                  <TableCell>{farm.agents || 0}</TableCell>
                  <TableCell>
                    {farm.performance ? `${farm.performance}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {farm.status === 'active' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => pauseFarm(farm.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => activateFarm(farm.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Bot className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          {farmData?.length || 0} farms total
        </div>
        <Button variant="outline" size="sm" onClick={refreshFarms}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

function CreateFarmForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [bossmanModel, setBossmanModel] = useState('ElizaOS-Advanced');
  const [initialAllocation, setInitialAllocation] = useState('1000');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/farm-management/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          status: 'active',
          bossman: {
            model: bossmanModel,
            status: 'idle'
          },
          allocation: parseFloat(initialAllocation),
          riskProfile: riskLevel
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create farm');
      }
      
      toast({
        title: "Farm created successfully",
        description: `${name} is now ready for trading`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating farm:', error);
      toast({
        title: "Error creating farm",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Farm Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Trading Farm"
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="model">BossMan AI Model</Label>
        <Select
          value={bossmanModel}
          onValueChange={setBossmanModel}
          disabled={isSubmitting}
        >
          <SelectTrigger id="model">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ElizaOS-Basic">ElizaOS Basic</SelectItem>
            <SelectItem value="ElizaOS-Advanced">ElizaOS Advanced</SelectItem>
            <SelectItem value="ElizaOS-Expert">ElizaOS Expert</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The AI model that will manage this farm's trading decisions
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="allocation">Initial Allocation ($)</Label>
        <Input
          id="allocation"
          type="number"
          min="100"
          step="100"
          value={initialAllocation}
          onChange={(e) => setInitialAllocation(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="risk">Risk Level</Label>
        <Select
          value={riskLevel}
          onValueChange={setRiskLevel}
          disabled={isSubmitting}
        >
          <SelectTrigger id="risk">
            <SelectValue placeholder="Select risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Conservative</SelectItem>
            <SelectItem value="medium">Balanced</SelectItem>
            <SelectItem value="high">Aggressive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Farm"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Helper component for farm status badge
function FarmStatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Active</Badge>;
    case 'paused':
      return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Paused</Badge>;
    case 'error':
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Error</Badge>;
    case 'maintenance':
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Maintenance</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
