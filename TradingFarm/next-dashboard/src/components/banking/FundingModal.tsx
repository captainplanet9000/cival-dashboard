"use client"

import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { ArrowDownToDot, ArrowUpFromDot, RefreshCw, CheckCircle2, XCircle, Wallet } from 'lucide-react'
import { bankingService, TransactionRequest } from '@/services/banking-service'
import { createBrowserClient } from '@/utils/supabase/client'

// Available assets
const ASSETS = [
  { id: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum' },
  { id: 'USDT', name: 'Tether' },
  { id: 'SOL', name: 'Solana' },
  { id: 'LINK', name: 'Chainlink' },
  { id: 'AVAX', name: 'Avalanche' },
  { id: 'MATIC', name: 'Polygon' },
]

// Transaction schema with zod validation
const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer', 'allocation']),
  asset: z.string().min(1, 'Asset is required'),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .min(0.00000001, 'Minimum amount is 0.00000001'),
  to: z.string().optional(),
  from: z.string().optional(),
  notes: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface FundingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAsset?: string | null
  onSuccess?: () => void
  userId?: string
  farmId?: string
}

export default function FundingModal({ 
  isOpen, 
  onClose, 
  selectedAsset = null,
  onSuccess,
  userId = '1',
  farmId
}: FundingModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [farms, setFarms] = useState<{id: string, name: string}[]>([])
  const { toast } = useToast()
  const supabase = createBrowserClient()
  
  // Setup form with validation
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'deposit',
      asset: selectedAsset || '',
      amount: 0,
      notes: '',
    },
  })

  // Fetch available farms when component mounts
  useEffect(() => {
    async function fetchFarms() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: farmData } = await supabase
          .from('farms')
          .select('id, name')
          .eq('user_id', user.id)
        
        if (farmData && farmData.length > 0) {
          setFarms(farmData)
        }
      }
    }
    
    fetchFarms()
  }, [supabase])

  const executeTransaction = async (values: TransactionFormValues) => {
    setStatus('loading')
    
    try {
      const transactionRequest: TransactionRequest = {
        ...values,
        userId,
      }
      
      const { data, error } = await bankingService.executeTransaction(transactionRequest)
      
      if (error) {
        throw new Error(error)
      }
      
      setStatus('success')
      toast({
        title: 'Transaction Successful',
        description: `Your ${values.type} of ${values.amount} ${values.asset} has been processed.`,
        variant: 'default',
      })
      
      // Wait a moment before closing modal for better UX
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (err: any) {
      setStatus('error')
      toast({
        title: 'Transaction Failed',
        description: err.message || 'There was an error processing your transaction.',
        variant: 'destructive',
      })
    }
  }

  // Close and reset when done
  const handleClose = () => {
    if (status !== 'loading') {
      setStatus('idle')
      onClose()
    }
  }

  // Reset form when transaction type changes
  const handleTransactionTypeChange = (type: string) => {
    form.reset({
      ...form.getValues(),
      type: type as any,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {status === 'success' ? 'Transaction Complete' : 'Manage Funds'}
          </DialogTitle>
          <DialogDescription>
            {status === 'success' 
              ? 'Your transaction has been processed successfully.'
              : status === 'error'
                ? 'There was an error processing your transaction.'
                : 'Add or withdraw funds from your trading account.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Success View */}
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Transaction Complete</h3>
            <p className="text-muted-foreground text-center mb-4">
              Your {form.getValues().type} of {form.getValues().amount} {form.getValues().asset} has been processed.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}

        {/* Error View */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Transaction Failed</h3>
            <p className="text-muted-foreground text-center mb-4">
              There was an error processing your transaction. Please try again.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={() => setStatus('idle')}>Try Again</Button>
            </div>
          </div>
        )}

        {/* Transaction Form */}
        {status !== 'success' && status !== 'error' && (
          <Tabs defaultValue="deposit" onValueChange={handleTransactionTypeChange}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="deposit">
                <ArrowDownToDot className="mr-2 h-4 w-4" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdrawal">
                <ArrowUpFromDot className="mr-2 h-4 w-4" />
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="allocation">
                <Wallet className="mr-2 h-4 w-4" />
                Allocate
              </TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(executeTransaction)} className="space-y-4">
                <TabsContent value="deposit">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="asset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={status === 'loading'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ASSETS.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name} ({asset.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.00000001" 
                              placeholder="0.00" 
                              {...field} 
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any notes about this deposit" 
                              {...field}
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="withdrawal">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="asset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={status === 'loading'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ASSETS.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name} ({asset.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.00000001" 
                              placeholder="0.00" 
                              {...field}
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Withdrawal Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter wallet address" 
                              {...field}
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                          <FormDescription>
                            The address you want to withdraw your funds to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any notes about this withdrawal" 
                              {...field}
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="allocation">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="asset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={status === 'loading'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ASSETS.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name} ({asset.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.00000001" 
                              placeholder="0.00" 
                              {...field}
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allocate To</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={status === 'loading'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select farm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {farms.map((farm) => (
                                <SelectItem key={farm.id} value={farm.id}>
                                  {farm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select a farm to allocate these funds to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any notes about this allocation" 
                              {...field}
                              disabled={status === 'loading'}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={status === 'loading'}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
