"use client"

import { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  Shield, 
  LockKeyhole, 
  Timer, 
  AlertCircle, 
  BarChart, 
  ThermometerSnowflake,
  Flame,
  PiggyBank,
  DollarSign
} from 'lucide-react'
import { bankingService, VaultInfo } from '@/services/banking-service'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface VaultInfoPanelProps {
  userId?: string
}

export default function VaultInfoPanel({ userId = '1' }: VaultInfoPanelProps) {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchVaultInfo()
  }, [userId])

  const fetchVaultInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await bankingService.getVaultInfo(userId)
      
      if (fetchError) {
        setError(fetchError)
        toast({
          title: "Error loading vault info",
          description: fetchError,
          variant: "destructive",
        })
      } else if (data) {
        setVaultInfo(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vault information')
      toast({
        title: "Error",
        description: "Failed to load vault data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    toast({
      description: "Refreshing vault information...",
    })
    fetchVaultInfo()
  }

  // Get security level color
  const getSecurityLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'text-success'
      case 'medium':
        return 'text-warning'
      case 'low':
        return 'text-destructive'
      default:
        return 'text-primary'
    }
  }

  // Format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Vault Security</h2>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Vault Security</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md text-destructive text-center">
          <p className="font-medium">Failed to load vault information</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!vaultInfo) {
    return null
  }

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Vault Security
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your vault security settings and fund allocations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getSecurityLevelColor(vaultInfo.securityLevel)}>
            {vaultInfo.securityLevel} Security
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Vault Summary Card */}
        <Card className="col-span-full md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <PiggyBank className="mr-2 h-5 w-5" />
              Vault Summary
            </CardTitle>
            <CardDescription>
              Overall vault status and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between items-center">
                <span className="text-sm font-medium">Total Value</span>
                <span className="font-bold text-xl">${vaultInfo.totalValueUsd.toLocaleString()}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                <span className="text-sm text-muted-foreground">Security</span>
                <span className={`font-bold ${getSecurityLevelColor(vaultInfo.securityLevel)}`}>
                  {vaultInfo.securityLevel}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                <span className="text-sm text-muted-foreground">Multi-sig</span>
                <span className="font-bold">{vaultInfo.multisigEnabled ? `${vaultInfo.requiredSignatures} of 3` : 'Disabled'}</span>
              </div>
            </div>
            
            <div className="rounded-lg border p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <ThermometerSnowflake className="h-4 w-4 mr-1 text-blue-500" />
                  <span className="text-sm font-medium">Cold Storage</span>
                </div>
                <span className="text-sm font-bold">{vaultInfo.coldStorage.percentage}%</span>
              </div>
              <Progress value={vaultInfo.coldStorage.percentage} className="h-2 mb-1" />
              <p className="text-xs text-muted-foreground">
                Last audit: {formatDate(vaultInfo.coldStorage.lastAudit)}
              </p>
            </div>
            
            <div className="rounded-lg border p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Flame className="h-4 w-4 mr-1 text-orange-500" />
                  <span className="text-sm font-medium">Hot Wallet</span>
                </div>
                <span className="text-sm font-bold">{vaultInfo.hotWallet.percentage}%</span>
              </div>
              <Progress value={vaultInfo.hotWallet.percentage} className="h-2 mb-1" />
              <p className="text-xs text-muted-foreground">
                Rebalance threshold: ${vaultInfo.hotWallet.rebalanceThreshold.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Insurance Fund Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Shield className="mr-2 h-5 w-5" />
              Insurance Fund
            </CardTitle>
            <CardDescription>
              Protection against losses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <span className="block text-2xl font-bold text-primary">
                ${vaultInfo.insuranceFund.valueUsd.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                Total Insurance Fund Value
              </span>
            </div>
            
            <div className="rounded-lg border p-3">
              <h4 className="font-medium mb-1">Coverage Details</h4>
              <p className="text-sm text-muted-foreground">
                {vaultInfo.insuranceFund.coverageDetails}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <LockKeyhole className="h-4 w-4 mr-2" />
                <span className="text-sm">Auto-Protect</span>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
        
        {/* Staking Rewards Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <DollarSign className="mr-2 h-5 w-5" />
              Staking Rewards
            </CardTitle>
            <CardDescription>
              Earn rewards on your vault funds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
              <div>
                <h4 className="font-medium text-sm">Annual Percentage Rate</h4>
                <p className="text-success font-bold text-2xl">{vaultInfo.stakingRewards.apr}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-success" />
              </div>
            </div>
            
            <div className="rounded-lg border p-3">
              <h4 className="font-medium mb-1">Next Distribution</h4>
              <p className="text-sm">
                {formatDate(vaultInfo.stakingRewards.nextDistribution)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rewards are automatically compounded
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Timer className="h-4 w-4 mr-2" />
                <span className="text-sm">Auto-Compound</span>
              </div>
              <Switch defaultChecked={vaultInfo.stakingRewards.enabled} />
            </div>
          </CardContent>
        </Card>
        
        {/* Security Measures Card */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AlertCircle className="mr-2 h-5 w-5" />
              Security Measures
            </CardTitle>
            <CardDescription>
              Active security features protecting your assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <LockKeyhole className="h-4 w-4 mr-2" />
                    <span className="text-sm">Multi-signature Wallet</span>
                  </div>
                  <Switch defaultChecked={vaultInfo.multisigEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="text-sm">Cold Storage Backup</span>
                  </div>
                  <Switch defaultChecked={vaultInfo.coldStorage.percentage > 50} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Timer className="h-4 w-4 mr-2" />
                    <span className="text-sm">Time-Locked Withdrawals</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">Anomaly Detection</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <PiggyBank className="h-4 w-4 mr-2" />
                    <span className="text-sm">Auto-Insurance</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart className="h-4 w-4 mr-2" />
                    <span className="text-sm">Risk Analytics</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Flame className="h-4 w-4 mr-2" />
                    <span className="text-sm">Automatic Rebalancing</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="text-sm">Fee Optimization</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ThermometerSnowflake className="h-4 w-4 mr-2" />
                    <span className="text-sm">Emergency Freeze</span>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
