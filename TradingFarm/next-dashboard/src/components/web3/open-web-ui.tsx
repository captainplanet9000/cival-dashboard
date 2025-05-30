"use client"

import { useState, useEffect } from 'react'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { useConfig, useChains, useSwitchChain } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Wallet, ExternalLink, Copy, LogOut, AlertTriangle, Check, ArrowRight, Loader2, Shield, Globe, RefreshCw, AlertCircle, ChevronDown, Coins } from 'lucide-react'
import { truncateAddress, copyToClipboard, formatBalance } from '@/utils/web3-utils'

interface OpenWebUIProps {
  variant?: 'default' | 'minimal' | 'expanded'
  className?: string
  showNetworkSelector?: boolean
  showBalances?: boolean
  showAvatar?: boolean
}

export function OpenWebUI({
  variant = 'default',
  className = '',
  showNetworkSelector = true,
  showBalances = true,
  showAvatar = true,
}: OpenWebUIProps) {
  const { open } = useWeb3Modal()
  const { address, isConnected, status } = useAccount()
  const { disconnect } = useDisconnect()
  const config = useConfig()
  const { chain } = useAccount()
  const chains = useChains()
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain()
  const { data: balance, isLoading: isLoadingBalance } = useBalance({
    address: address,
  })
  
  const [isCopied, setIsCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('account')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  
  // Reset copied state after 2 seconds
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isCopied])
  
  // Handle copying address
  const handleCopyAddress = async () => {
    if (address) {
      await copyToClipboard(address)
      setIsCopied(true)
    }
  }
  
  // Minimal view - just connect button or address
  if (variant === 'minimal') {
    return (
      <div className={className}>
        {isConnected ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => open()}
          >
            <Wallet className="h-3.5 w-3.5" />
            {truncateAddress(address || '')}
          </Button>
        ) : (
          <Button 
            size="sm" 
            className="gap-2"
            onClick={() => open()}
          >
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </Button>
        )}
      </div>
    )
  }
  
  // Default variant - dropdown with options
  if (variant === 'default') {
    return (
      <div className={className}>
        {isConnected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {showAvatar && (
                  <Avatar className="h-5 w-5 rounded-full border">
                    <Wallet className="h-3 w-3" />
                  </Avatar>
                )}
                {truncateAddress(address || '')}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>Wallet</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {truncateAddress(address || '')}
                  </span>
                </div>
              </DropdownMenuLabel>
              
              {showBalances && balance && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {formatBalance(balance.formatted, 4)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {balance.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={handleCopyAddress}
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {isCopied ? 'Copied!' : 'Copy Address'}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => open({ view: 'Account' })}
              >
                <Wallet className="h-4 w-4" />
                Account Details
              </DropdownMenuItem>
              
              {showNetworkSelector && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => open({ view: 'Networks' })}
                >
                  <Globe className="h-4 w-4" />
                  Switch Network
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={() => disconnect()}
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            size="sm" 
            className="gap-2"
            onClick={() => open()}
          >
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </Button>
        )}
      </div>
    )
  }
  
  // Expanded variant - full panel
  return (
    <div className={className}>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          {isConnected ? (
            <Button variant="outline" size="sm" className="gap-2">
              {showAvatar && (
                <Avatar className="h-5 w-5 rounded-full border">
                  <Wallet className="h-3 w-3" />
                </Avatar>
              )}
              {truncateAddress(address || '')}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="gap-2"
              onClick={() => open()}
            >
              <Wallet className="h-3.5 w-3.5" />
              Connect Wallet
            </Button>
          )}
        </SheetTrigger>
        
        {isConnected && (
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader className="mb-6">
              <SheetTitle>Wallet Dashboard</SheetTitle>
              <SheetDescription>
                Manage your wallet and Trading Farm connections
              </SheetDescription>
            </SheetHeader>
            
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
              </TabsList>
              
              <TabsContent value="account" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Wallet Details</CardTitle>
                    <CardDescription>Your connected wallet information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Address</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{truncateAddress(address || '')}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7" 
                          onClick={handleCopyAddress}
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={status === 'connected' ? 'success' : 'outline'}>
                        {status === 'connected' ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Network</span>
                      {chain ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm font-medium">{chain.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unknown</span>
                      )}
                    </div>
                    
                    {showBalances && balance && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Balance</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">
                            {isLoadingBalance ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              formatBalance(balance.formatted, 4)
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {balance.symbol}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full gap-2" 
                      onClick={() => disconnect()}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Disconnect Wallet
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Wallet security recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Secure Connection</p>
                          <p className="text-xs text-muted-foreground">Your connection is secure and encrypted.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 items-start">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Transaction Signing</p>
                          <p className="text-xs text-muted-foreground">Always review transaction details before signing.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="network" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Network</CardTitle>
                    <CardDescription>Current network and chain details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Chain</span>
                      {chain ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm font-medium">{chain.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unknown</span>
                      )}
                    </div>
                    
                    {chain && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Chain ID</span>
                          <span className="text-sm font-medium">{chain.id}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Native Currency</span>
                          <span className="text-sm font-medium">{chain.nativeCurrency.symbol}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Available Networks</CardTitle>
                    <CardDescription>Switch between supported networks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {chains.map((availableChain) => (
                        <div
                          key={availableChain.id}
                          className={`
                            flex justify-between items-center p-2 rounded-md cursor-pointer
                            ${chain?.id === availableChain.id 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted'
                            }
                          `}
                          onClick={() => {
                            if (chain?.id !== availableChain.id && switchChain) {
                              switchChain(availableChain.id)
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm font-medium">{availableChain.name}</span>
                          </div>
                          
                          {chain?.id === availableChain.id ? (
                            <Badge variant="secondary">Connected</Badge>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              {isSwitchingNetwork ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Switch'
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="assets" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Assets</CardTitle>
                    <CardDescription>Your token holdings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {balance && (
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{balance.symbol}</p>
                            <p className="text-xs text-muted-foreground">Native Token</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {isLoadingBalance ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              formatBalance(balance.formatted, 6)
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {/* Mock USD value - would be calculated from actual rates */}
                            ~${isLoadingBalance ? '-.--' : (parseFloat(balance.formatted) * 3800).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-center py-6">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => open({ view: 'Account' })}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh Balances
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </SheetContent>
        )}
      </Sheet>
    </div>
  )
}
