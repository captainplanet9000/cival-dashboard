"use client"

import { useState } from "react"
import { useAccount, useBalance, useNetwork, usePublicClient, useWalletClient } from "wagmi"
import { parseEther, formatEther } from "viem"
import { Agent } from "@/components/agents/agent-details"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  InfoIcon, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Wallet, 
  Loader2,
  Bot
} from "lucide-react"

interface AgentFundingModalProps {
  agent: Agent
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (amount: string, txHash: string) => void
}

export function AgentFundingModal({ 
  agent, 
  open, 
  onOpenChange,
  onSuccess
}: AgentFundingModalProps) {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  
  // Get wallet balance
  const { data: balanceData } = useBalance({
    address,
    watch: true,
  })
  
  // Funding states
  const [amount, setAmount] = useState<string>("0.1")
  const [percentOfWallet, setPercentOfWallet] = useState<number>(10)
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [txHash, setTxHash] = useState<string>("")
  const [error, setError] = useState<string>("")
  
  // Calculate max amount user can send (account for gas)
  const maxAmount = balanceData 
    ? parseFloat(formatEther(balanceData.value)) * 0.95 // Leave 5% for gas
    : 0
  
  // Update amount when percent changes
  const handlePercentChange = (value: number[]) => {
    const percent = value[0]
    setPercentOfWallet(percent)
    
    if (balanceData) {
      const calculatedAmount = (parseFloat(formatEther(balanceData.value)) * percent / 100).toFixed(4)
      setAmount(calculatedAmount)
    }
  }
  
  // Update percent when amount changes
  const handleAmountChange = (value: string) => {
    setAmount(value)
    
    if (balanceData && parseFloat(value) > 0) {
      const percent = (parseFloat(value) / parseFloat(formatEther(balanceData.value))) * 100
      setPercentOfWallet(Math.min(percent, 100))
    } else {
      setPercentOfWallet(0)
    }
  }
  
  // Handle funding agent
  const handleFundAgent = async () => {
    if (!walletClient || !address || !agent.walletAddress) {
      setError("Wallet not connected or agent wallet not available")
      return
    }
    
    try {
      setTxStatus('pending')
      setError("")
      
      // Simulating transaction to the agent's wallet address
      // In a real implementation, this would use a smart contract for secure agent funding
      const hash = await walletClient.sendTransaction({
        to: agent.walletAddress as `0x${string}`,
        value: parseEther(amount as `${number}`),
      })
      
      setTxHash(hash)
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash
      })
      
      if (receipt.status === 'success') {
        setTxStatus('success')
        onSuccess?.(amount, hash)
      } else {
        setTxStatus('error')
        setError("Transaction failed")
      }
    } catch (err) {
      console.error("Error funding agent:", err)
      setTxStatus('error')
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    }
  }
  
  // Reset modal state when closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only reset if transaction was successful or no transaction in progress
      if (txStatus !== 'pending') {
        setAmount("0.1")
        setPercentOfWallet(10)
        setTxStatus('idle')
        setTxHash("")
        setError("")
      }
    }
    onOpenChange(open)
  }
  
  // Check if current amount is valid
  const isAmountValid = 
    parseFloat(amount) > 0 && 
    parseFloat(amount) <= maxAmount
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Fund Agent: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Allocate funds to this agent for automated trading operations.
          </DialogDescription>
        </DialogHeader>
        
        {txStatus === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Amount ({balanceData?.symbol || "ETH"})</span>
                <span className="text-muted-foreground">
                  Available: {maxAmount.toFixed(4)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  step="0.01"
                  min="0"
                  max={maxAmount.toString()}
                  className="font-mono"
                />
                <span className="text-muted-foreground font-medium">
                  {balanceData?.symbol || "ETH"}
                </span>
              </div>
              
              <div className="pt-4 pb-2">
                <Slider
                  value={[percentOfWallet]}
                  onValueChange={handlePercentChange}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">0%</span>
                  <span className="text-xs font-medium">{percentOfWallet.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">100%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                <span className="text-sm">Agent Strategy</span>
                <span className="text-sm font-medium">{agent.type}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                <span className="text-sm">Risk Level</span>
                <span className="text-sm font-medium capitalize">{agent.settings.riskLevel}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                <span className="text-sm">Max Position Size</span>
                <span className="text-sm font-medium">{agent.settings.maxPositionSize}%</span>
              </div>
            </div>
            
            <Alert variant="outline" className="mt-2">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Funds will be allocated to this agent's wallet for trading operations. 
                You can withdraw unused funds at any time.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {txStatus === 'pending' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium mb-2">Transaction Processing</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Please wait while your transaction is being processed...
            </p>
            {txHash && (
              <p className="text-xs font-mono text-muted-foreground break-all">
                TX: {txHash}
              </p>
            )}
          </div>
        )}
        
        {txStatus === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Funding Successful</h3>
            <p className="text-sm text-muted-foreground text-center mb-1">
              You have successfully funded {agent.name} with:
            </p>
            <p className="text-xl font-bold mb-4">
              {amount} {balanceData?.symbol || "ETH"}
            </p>
            {txHash && (
              <p className="text-xs font-mono text-muted-foreground break-all">
                TX: {txHash}
              </p>
            )}
          </div>
        )}
        
        {txStatus === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Transaction Failed</h3>
            <p className="text-sm text-destructive text-center mb-4">
              {error || "An error occurred during the transaction."}
            </p>
            {txHash && (
              <p className="text-xs font-mono text-muted-foreground break-all">
                TX: {txHash}
              </p>
            )}
          </div>
        )}
        
        <DialogFooter>
          {txStatus === 'idle' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                disabled={!isAmountValid || !isConnected} 
                onClick={handleFundAgent}
                className="gap-2"
              >
                Fund Agent
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {txStatus === 'pending' && (
            <Button disabled>
              Processing...
            </Button>
          )}
          
          {(txStatus === 'success' || txStatus === 'error') && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
