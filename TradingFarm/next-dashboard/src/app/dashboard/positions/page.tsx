'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  CrossChainPosition, 
  CrossChainPositionComponent,
  RiskLevel,
  RebalanceFrequency
} from '@/types/cross-chain-position.types';

// Mock chains for the demo
const supportedChains = [
  { id: 'ethereum', name: 'Ethereum', icon: '🔷' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔶' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'polygon', name: 'Polygon', icon: '🟣' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '🔺' },
  { id: 'solana', name: 'Solana', icon: '🟩' },
];

export default function PositionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<CrossChainPosition[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({
    name: '',
    description: '',
    riskLevel: '1' as any,
    rebalanceFrequency: 'weekly' as RebalanceFrequency,
  });

  // Fetch positions on component mount
  useEffect(() => {
    fetchPositions();
  }, []);

  async function fetchPositions() {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('cross_chain_positions')
        .select('*, cross_chain_position_components(*)');
      
      if (error) {
        throw error;
      }
      
      // Transform data to match our types
      const transformedPositions = data.map((position) => {
        const components = position.cross_chain_position_components.map((comp: any) => ({
          id: comp.id,
          positionId: comp.position_id,
          chainId: comp.chain_id,
          protocolId: comp.protocol_id,
          assetAddress: comp.asset_address,
          assetSymbol: comp.asset_symbol,
          assetDecimals: comp.asset_decimals,
          currentAmount: comp.current_amount,
          currentValueUsd: comp.current_value_usd,
          targetAllocationPercent: comp.target_allocation_percent,
          strategyType: comp.strategy_type,
          strategyParams: comp.strategy_params,
          lastUpdatedAt: comp.last_updated_at,
          performanceData: comp.performance_data,
          status: comp.status,
          metadata: comp.metadata,
          createdAt: comp.created_at,
          updatedAt: comp.updated_at
        }));
        
        return {
          id: position.id,
          vaultId: position.vault_id,
          name: position.name,
          description: position.description,
          isActive: position.is_active,
          totalValueUsd: position.total_value_usd,
          riskLevel: position.risk_level,
          rebalanceFrequency: position.rebalance_frequency,
          lastRebalancedAt: position.last_rebalanced_at,
          nextRebalanceAt: position.next_rebalance_at,
          autoRebalance: position.auto_rebalance,
          targetAllocations: position.target_allocations,
          performanceMetrics: position.performance_metrics,
          maxSlippagePercent: position.max_slippage_percent,
          maxGasUsd: position.max_gas_usd,
          metadata: position.metadata,
          createdAt: position.created_at,
          updatedAt: position.updated_at,
          components
        };
      });
      
      setPositions(transformedPositions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: 'Error Fetching Positions',
        description: 'There was a problem fetching your positions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePosition() {
    try {
      if (!newPosition.name) {
        toast({
          title: 'Validation Error',
          description: 'Position name is required',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      
      // Get user's vaults to attach the position to
      const supabase = createBrowserClient();
      const { data: vaults } = await supabase
        .from('vaults')
        .select('id')
        .limit(1);
      
      if (!vaults || vaults.length === 0) {
        toast({
          title: 'No Vaults Found',
          description: 'Please create a vault first before creating a position',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Create default target allocations (equal for each supported chain)
      const defaultAllocation = 100 / supportedChains.length;
      const targetAllocations = supportedChains.reduce((acc, chain) => {
        acc[chain.id] = defaultAllocation;
        return acc;
      }, {} as Record<string, number>);
      
      // Create the position
      const { data: position, error } = await supabase
        .from('cross_chain_positions')
        .insert({
          vault_id: vaults[0].id,
          name: newPosition.name,
          description: newPosition.description,
          risk_level: parseInt(newPosition.riskLevel),
          rebalance_frequency: newPosition.rebalanceFrequency,
          auto_rebalance: false,
          target_allocations: targetAllocations,
          max_slippage_percent: 0.5,
          max_gas_usd: 100,
          metadata: {}
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Reset form and close dialog
      setNewPosition({
        name: '',
        description: '',
        riskLevel: '1',
        rebalanceFrequency: 'weekly',
      });
      setCreateDialogOpen(false);
      
      // Refresh positions
      fetchPositions();
      
      toast({
        title: 'Position Created',
        description: 'Your cross-chain position has been created successfully.',
      });
    } catch (error) {
      console.error('Error creating position:', error);
      toast({
        title: 'Error Creating Position',
        description: 'There was a problem creating your position. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatPercent(percent: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(percent / 100);
  }

  function getRiskLevelBadge(level: RiskLevel) {
    if (level === 1) {
      return <Badge className="bg-green-500">Low Risk</Badge>;
    } else if (level === 2) {
      return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-red-500">High Risk</Badge>;
    }
  }

  function getChainIcon(chainId: string) {
    const chain = supportedChains.find(c => c.id === chainId);
    return chain ? `${chain.icon} ${chain.name}` : chainId;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cross-Chain Positions</h1>
          <p className="text-muted-foreground mt-1">
            Manage your multi-chain investments and allocations
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Position</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Cross-Chain Position</DialogTitle>
              <DialogDescription>
                Create a new position to manage assets across multiple chains
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Position Name</Label>
                <Input 
                  id="name" 
                  value={newPosition.name}
                  onChange={(e) => setNewPosition({...newPosition, name: e.target.value})}
                  placeholder="My Cross-Chain Portfolio"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  value={newPosition.description}
                  onChange={(e) => setNewPosition({...newPosition, description: e.target.value})}
                  placeholder="Description of your investment strategy"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="risk-level">Risk Level</Label>
                  <Select 
                    value={newPosition.riskLevel}
                    onValueChange={(value) => setNewPosition({...newPosition, riskLevel: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low Risk</SelectItem>
                      <SelectItem value="2">Medium Risk</SelectItem>
                      <SelectItem value="3">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rebalance-frequency">Rebalance Frequency</Label>
                  <Select 
                    value={newPosition.rebalanceFrequency}
                    onValueChange={(value) => setNewPosition({...newPosition, rebalanceFrequency: value as RebalanceFrequency})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreatePosition} disabled={loading}>
                {loading ? 'Creating...' : 'Create Position'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium mb-2">No Positions Found</h3>
            <p className="text-muted-foreground text-center mb-6">
              You don't have any cross-chain positions yet. Create your first position to get started.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create Your First Position
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {positions.map((position) => (
            <Card key={position.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{position.name}</CardTitle>
                  {getRiskLevelBadge(position.riskLevel)}
                </div>
                <CardDescription>
                  {position.description || `Rebalance: ${position.rebalanceFrequency}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-3xl font-bold">
                    {formatCurrency(position.totalValueUsd)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Value Across {Object.keys(position.targetAllocations).length} Chains
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Chain Allocations:</p>
                  {Object.entries(position.targetAllocations)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([chainId, allocation]) => (
                      <div key={chainId} className="flex justify-between items-center">
                        <span className="text-sm">{getChainIcon(chainId)}</span>
                        <span className="text-sm font-medium">{formatPercent(allocation)}</span>
                      </div>
                    ))}
                  
                  {Object.keys(position.targetAllocations).length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{Object.keys(position.targetAllocations).length - 3} more chains
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/positions/${position.id}`)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
