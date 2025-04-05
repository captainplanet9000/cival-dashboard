'use client';

import { useState, useEffect } from 'react';
import { ArrowDownUp, RefreshCw, ChevronLeft, Check, X, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface';
import { 
  LegacyWallet, 
  MigrationReport, 
  createWalletMigrationService 
} from '@/utils/migration/wallet-migration';
import { formatCurrency } from '@/lib/utils';

export default function VaultMigrationPage() {
  const [legacyWallets, setLegacyWallets] = useState<LegacyWallet[]>([]);
  const [migratedWallets, setMigratedWallets] = useState<LegacyWallet[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const migrationService = createWalletMigrationService();
  const supabase = createBrowserClient();
  
  // Fetch user data and legacy wallets
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Get user's primary farm
          const { data: farms } = await supabase
            .from('farms')
            .select('id, name')
            .eq('user_id', user.id);
          
          if (farms && farms.length > 0) {
            setFarmId(farms[0].id);
          }
          
          // Fetch legacy wallets and migration status
          const wallets = await migrationService.getLegacyWallets();
          const { toMigrate, alreadyMigrated } = await migrationService.generateMigrationPreview(wallets);
          
          setLegacyWallets(toMigrate);
          setMigratedWallets(alreadyMigrated);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load wallet data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  const refreshData = async () => {
    setLoading(true);
    try {
      const wallets = await migrationService.getLegacyWallets();
      const { toMigrate, alreadyMigrated } = await migrationService.generateMigrationPreview(wallets);
      
      setLegacyWallets(toMigrate);
      setMigratedWallets(alreadyMigrated);
      
      toast({
        title: 'Refreshed',
        description: 'Wallet data has been refreshed',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh wallet data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleWallet = (walletId: string) => {
    setSelectedWallets((current) => {
      if (current.includes(walletId)) {
        return current.filter(id => id !== walletId);
      } else {
        return [...current, walletId];
      }
    });
  };
  
  const handleSelectAll = () => {
    if (selectedWallets.length === legacyWallets.length) {
      setSelectedWallets([]);
    } else {
      setSelectedWallets(legacyWallets.map(wallet => wallet.id));
    }
  };
  
  const handleMigrateWallets = async () => {
    if (selectedWallets.length === 0) return;
    
    setMigrationInProgress(true);
    
    try {
      // Get wallets to migrate
      const walletsToMigrate = legacyWallets.filter(wallet => 
        selectedWallets.includes(wallet.id)
      );
      
      // Perform migration
      const report = await migrationService.migrateWallets(walletsToMigrate);
      setMigrationReport(report);
      
      // Show report dialog
      setShowReportDialog(true);
      
      // Refresh data after migration
      refreshData();
      
      // Reset selection
      setSelectedWallets([]);
      
    } catch (error) {
      console.error('Error during migration:', error);
      toast({
        title: 'Migration Failed',
        description: 'An error occurred during the migration process',
        variant: 'destructive',
      });
    } finally {
      setMigrationInProgress(false);
      setShowConfirmDialog(false);
    }
  };
  
  const getMigrationProgress = (): number => {
    const total = legacyWallets.length + migratedWallets.length;
    return total === 0 ? 0 : (migratedWallets.length / total) * 100;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/banking/vault">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Wallet Migration</h1>
          </div>
          <p className="text-muted-foreground">
            Migrate your legacy wallets to the new vault system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowConfirmDialog(true)}
            disabled={selectedWallets.length === 0 || loading || migrationInProgress}
          >
            <ArrowDownUp className="mr-2 h-4 w-4" />
            Migrate Selected
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
        {/* Migration Section - Takes up 5/7 of the width on medium screens and up */}
        <div className="md:col-span-5 space-y-6">
          {/* Migration Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Migration Status</CardTitle>
              <CardDescription>
                Progress of your wallet migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {migratedWallets.length} of {legacyWallets.length + migratedWallets.length} wallets migrated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {legacyWallets.length} wallets pending migration
                  </p>
                </div>
                <div>
                  <Badge variant="outline">
                    {getMigrationProgress().toFixed(0)}% Complete
                  </Badge>
                </div>
              </div>
              <Progress value={getMigrationProgress()} className="h-2" />
            </CardContent>
          </Card>
          
          {/* Legacy Wallets Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium">Legacy Wallets</CardTitle>
                  <CardDescription>
                    Select wallets to migrate to the vault system
                  </CardDescription>
                </div>
                {legacyWallets.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedWallets.length === legacyWallets.length 
                      ? 'Deselect All' 
                      : 'Select All'
                    }
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : legacyWallets.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>All wallets migrated</AlertTitle>
                  <AlertDescription>
                    All of your wallets have been successfully migrated to the vault system.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legacyWallets.map((wallet) => (
                        <TableRow key={wallet.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox 
                              checked={selectedWallets.includes(wallet.id)}
                              onCheckedChange={() => handleToggleWallet(wallet.id)}
                              disabled={loading || migrationInProgress}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {wallet.name}
                            {wallet.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {wallet.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {wallet.wallet_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(wallet.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={wallet.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}
                            >
                              {wallet.status?.toUpperCase() || 'ACTIVE'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Already Migrated Wallets */}
          {migratedWallets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Migrated Wallets</CardTitle>
                <CardDescription>
                  Wallets that have already been migrated to the vault system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {migratedWallets.map((wallet) => (
                        <TableRow key={wallet.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Check className="h-4 w-4 text-green-500" />
                          </TableCell>
                          <TableCell className="font-medium">
                            {wallet.name}
                            {wallet.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {wallet.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {wallet.wallet_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(wallet.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className="bg-blue-100"
                            >
                              MIGRATED
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Assistant Section - Takes up 2/7 of the width on medium screens and up */}
        <div className="md:col-span-2">
          <ElizaChatInterface
            initialContext={{
              module: 'banking-vault',
              userId: userId || '',
              farmId: farmId || '',
              view: 'migration',
              walletCount: legacyWallets.length,
              migratedCount: migratedWallets.length
            }}
            showTitle={true}
            title="Migration Assistant"
          />
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Migration</DialogTitle>
            <DialogDescription>
              You are about to migrate {selectedWallets.length} wallet(s) to the new vault system.
              This process cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                During migration, the selected wallets will be converted to vault accounts.
                All balances will be transferred to the new accounts.
              </AlertDescription>
            </Alert>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Selected Wallets:</h3>
              <ul className="text-sm space-y-1">
                {legacyWallets
                  .filter(wallet => selectedWallets.includes(wallet.id))
                  .map(wallet => (
                    <li key={wallet.id} className="flex justify-between">
                      <span>{wallet.name}</span>
                      <span className="font-mono">{formatCurrency(wallet.balance)}</span>
                    </li>
                  ))
                }
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={migrationInProgress}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMigrateWallets}
              disabled={migrationInProgress}
            >
              {migrationInProgress ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : 'Confirm Migration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Migration Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Migration Report</DialogTitle>
            <DialogDescription>
              Summary of the wallet migration process
            </DialogDescription>
          </DialogHeader>
          
          {migrationReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm font-medium text-center">Migrated</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="text-2xl font-bold text-center text-green-600">
                      {migrationReport.migratedCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm font-medium text-center">Failed</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="text-2xl font-bold text-center text-red-600">
                      {migrationReport.failedCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm font-medium text-center">Skipped</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="text-2xl font-bold text-center text-amber-600">
                      {migrationReport.skippedCount}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Details */}
              {migrationReport.migratedCount > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Successfully Migrated:</h3>
                  <ul className="text-sm space-y-1">
                    {migrationReport.details.migrated.map((result, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>{result.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {migrationReport.failedCount > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-red-600">Failed Migrations:</h3>
                  <ul className="text-sm space-y-1">
                    {migrationReport.details.failed.map((result, index) => (
                      <li key={index} className="flex items-start">
                        <X className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                        <div>
                          <span>{result.message}</span>
                          {result.errors && result.errors.length > 0 && (
                            <p className="text-xs text-red-500">{result.errors.join(', ')}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {migrationReport.skippedCount > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-amber-600">Skipped:</h3>
                  <ul className="text-sm space-y-1">
                    {migrationReport.details.skipped.map((result, index) => (
                      <li key={index} className="flex items-center">
                        <Info className="h-4 w-4 text-amber-500 mr-2" />
                        <span>{result.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowReportDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
