"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Lock, 
  Users, 
  Plus, 
  DollarSign, 
  ArrowRight, 
  LucideIcon 
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Define proper TypeScript interfaces
interface Vault {
  id: string;
  name: string;
  description: string;
  created_at: string;
  owner_id: string;
  balance?: number;
  members?: number;
  status?: 'active' | 'locked' | 'pending';
  security_level?: string;
}

export default function VaultsPage() {
  const { toast } = useToast();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create vault dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVault, setNewVault] = useState({
    name: "",
    description: ""
  });

  // Fetch vaults on component mount
  useEffect(() => {
    const fetchVaults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/vaults");
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error ${response.status}: Failed to fetch vaults`);
        }
        
        const data = await response.json();
        setVaults(data.vaults || []);
      } catch (err) {
        console.error("Failed to fetch vaults:", err);
        setError(err instanceof Error ? err.message : "Failed to load vaults");
        toast({
          variant: "destructive",
          title: "Error loading vaults",
          description: err instanceof Error ? err.message : "Please try again later"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchVaults();
  }, [toast]);

  // Handle create vault form submission
  const handleCreateVault = async () => {
    if (!newVault.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Vault name is required"
      });
      return;
    }
    
    try {
      setCreating(true);
      
      const response = await fetch("/api/vaults", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newVault)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: Failed to create vault`);
      }
      
      const data = await response.json();
      
      // Add new vault to state
      setVaults(currentVaults => [...currentVaults, data.vault]);
      
      // Reset form and close dialog
      setNewVault({ name: "", description: "" });
      setCreateDialogOpen(false);
      
      toast({
        title: "Vault Created",
        description: `${data.vault.name} has been successfully created`
      });
    } catch (err) {
      console.error("Failed to create vault:", err);
      toast({
        variant: "destructive",
        title: "Error creating vault",
        description: err instanceof Error ? err.message : "Please try again later"
      });
    } finally {
      setCreating(false);
    }
  };

  // Get status badge variant
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return { variant: "outline" as const, className: "bg-green-100 text-green-800", icon: Shield };
      case 'locked':
        return { variant: "destructive" as const, icon: Lock };
      case 'pending':
        return { variant: "outline" as const, className: "bg-yellow-100 text-yellow-800", icon: Lock };
      default:
        return { variant: "outline" as const, icon: Shield };
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).format(date);
    } catch (err) {
      return dateString.slice(0, 10);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaults</h1>
          <p className="text-muted-foreground">
            Manage your secure trading vaults and multi-signature wallets
          </p>
        </div>
        <Button 
          className="mt-4 sm:mt-0" 
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Vault
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading vaults...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <div className="text-red-500 mb-4">
              <Shield className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Error Loading Vaults</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : vaults.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <div className="text-muted-foreground mb-4">
              <Lock className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Vaults Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first vault to start managing secure funds
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Vault
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vaults.map((vault) => {
            const StatusIcon = getStatusBadge(vault.status).icon;
            return (
              <Card key={vault.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{vault.name}</CardTitle>
                    {vault.status && (
                      <Badge 
                        variant={getStatusBadge(vault.status).variant}
                        className={getStatusBadge(vault.status).className}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {vault.status.charAt(0).toUpperCase() + vault.status.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{vault.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm pb-2 flex-grow">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(vault.created_at)}</span>
                  </div>
                  {vault.balance !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-medium">${vault.balance.toLocaleString()}</span>
                    </div>
                  )}
                  {vault.members !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Members</span>
                      <span className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        {vault.members}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2">
                  <Link 
                    href={`/dashboard/vaults/${vault.id}`} 
                    className="w-full"
                  >
                    <Button 
                      variant="outline" 
                      className="w-full"
                    >
                      Manage Vault
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Vault Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Vault</DialogTitle>
            <DialogDescription>
              Create a secure vault to manage your funds and trading capital.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="vault-name" className="text-sm font-medium">
                Vault Name
              </label>
              <Input
                id="vault-name"
                placeholder="e.g., Main Trading Vault"
                value={newVault.name}
                onChange={(e) => setNewVault({ ...newVault, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="vault-description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Input
                id="vault-description"
                placeholder="e.g., For BTC/ETH trading on Binance"
                value={newVault.description}
                onChange={(e) => setNewVault({ ...newVault, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateVault}
              disabled={creating || !newVault.name.trim()}
            >
              {creating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                "Create Vault"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
