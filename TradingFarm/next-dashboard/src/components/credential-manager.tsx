/**
 * Exchange Credential Manager Component
 * 
 * Allows users to view, add, edit, and delete exchange API credentials
 * Provides a secure interface for managing API keys
 */
"use client"

import { useState } from 'react'
import { useExchangeCredentials, CredentialFormValues } from '@/hooks/use-exchange'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertCircle, Check, Key, Plus, RefreshCw, Trash } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExchangeType } from '@/services/exchange-service'
import { cn } from '@/lib/utils'

// Schema for credential form validation
const credentialSchema = z.object({
  exchange: z.enum(['bybit', 'coinbase', 'hyperliquid', 'mock']),
  api_key: z.string().min(1, 'API key is required'),
  api_secret: z.string().min(1, 'API secret is required'),
  is_testnet: z.boolean().default(false),
  is_default: z.boolean().default(false),
  additional_params: z.record(z.any()).optional(),
})

interface CredentialManagerProps {
  defaultExchange?: ExchangeType
  onCredentialsChange?: () => void
  className?: string
}

export function CredentialManager({
  defaultExchange = 'bybit',
  onCredentialsChange,
  className,
}: CredentialManagerProps) {
  const { 
    credentials, 
    isLoading, 
    error, 
    fetchCredentials,
    addCredential,
    updateCredential,
    deleteCredential
  } = useExchangeCredentials()
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<any>(null)
  
  // Group credentials by exchange
  const credentialsByExchange = credentials.reduce((acc, credential) => {
    const exchange = credential.exchange
    if (!acc[exchange]) {
      acc[exchange] = []
    }
    acc[exchange].push(credential)
    return acc
  }, {} as Record<string, any[]>)
  
  // Set up form for adding/editing credentials
  const form = useForm<z.infer<typeof credentialSchema>>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      exchange: defaultExchange,
      api_key: '',
      api_secret: '',
      is_testnet: false,
      is_default: false,
    },
  })
  
  // Handle form submission for adding credentials
  const onSubmit = async (values: z.infer<typeof credentialSchema>) => {
    if (selectedCredential) {
      // Editing existing credential
      await updateCredential(selectedCredential.id, values)
      setIsEditDialogOpen(false)
    } else {
      // Adding new credential
      await addCredential(values)
      setIsAddDialogOpen(false)
    }
    
    // Reset form
    form.reset()
    
    // Notify parent component
    if (onCredentialsChange) {
      onCredentialsChange()
    }
  }
  
  // Open edit dialog with credential data
  const handleEditCredential = (credential: any) => {
    setSelectedCredential(credential)
    
    // Load credential data into form
    form.reset({
      exchange: credential.exchange as ExchangeType,
      api_key: credential.api_key,
      api_secret: '',  // Don't load the secret for security
      is_testnet: credential.is_testnet,
      is_default: credential.is_default,
      additional_params: credential.additional_params || {},
    })
    
    setIsEditDialogOpen(true)
  }
  
  // Open delete confirmation dialog
  const handleDeleteClick = (credential: any) => {
    setSelectedCredential(credential)
    setIsDeleteDialogOpen(true)
  }
  
  // Delete credential
  const handleDeleteConfirm = async () => {
    if (selectedCredential) {
      await deleteCredential(selectedCredential.id)
      setIsDeleteDialogOpen(false)
      setSelectedCredential(null)
      
      // Notify parent component
      if (onCredentialsChange) {
        onCredentialsChange()
      }
    }
  }
  
  // Get exchanges array from the credentials
  const exchanges = Object.keys(credentialsByExchange).length > 0
    ? Object.keys(credentialsByExchange)
    : ['bybit', 'coinbase', 'hyperliquid', 'mock']
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Exchange Credentials</h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCredentials()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedCredential(null)
              form.reset({
                exchange: defaultExchange,
                api_key: '',
                api_secret: '',
                is_testnet: false,
                is_default: false,
              })
              setIsAddDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add API Key
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {credentials.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Key className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No API Keys</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                You haven't added any exchange API keys yet. Add your first key to start trading.
              </p>
              <Button 
                onClick={() => {
                  setSelectedCredential(null)
                  form.reset({
                    exchange: defaultExchange,
                    api_key: '',
                    api_secret: '',
                    is_testnet: false,
                    is_default: false,
                  })
                  setIsAddDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add API Key
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={exchanges[0]}>
          <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${exchanges.length}, minmax(0, 1fr))` }}>
            {exchanges.map(exchange => (
              <TabsTrigger key={exchange} value={exchange} className="capitalize">
                {exchange}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {exchanges.map(exchange => (
            <TabsContent key={exchange} value={exchange}>
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{exchange} API Keys</CardTitle>
                  <CardDescription>
                    Manage your {exchange} API keys for trading and data access.
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    {credentialsByExchange[exchange]?.map(credential => (
                      <div key={credential.id} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{credential.api_key.substring(0, 8)}...</h4>
                              {credential.is_default && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Default
                                </Badge>
                              )}
                              {credential.is_testnet && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  Testnet
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Added: {new Date(credential.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditCredential(credential)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(credential)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <Separator className="my-2" />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
      
      {/* Add Credential Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Exchange API Key</DialogTitle>
            <DialogDescription>
              Enter your exchange API key and secret. These credentials are encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bybit">Bybit</SelectItem>
                        <SelectItem value="coinbase">Coinbase</SelectItem>
                        <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                        <SelectItem value="mock">Mock (Testing)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the exchange for these API credentials.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your API key" {...field} />
                    </FormControl>
                    <FormDescription>
                      The public API key provided by the exchange.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="api_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Secret</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your API secret" {...field} />
                    </FormControl>
                    <FormDescription>
                      The private API secret provided by the exchange. This will be encrypted.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch('exchange') === 'coinbase' && (
                <FormField
                  control={form.control}
                  name="additional_params.passphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Passphrase</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your API passphrase" {...field} />
                      </FormControl>
                      <FormDescription>
                        The passphrase required for Coinbase API authentication.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {form.watch('exchange') === 'hyperliquid' && (
                <FormField
                  control={form.control}
                  name="additional_params.wallet_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your wallet address" {...field} />
                      </FormControl>
                      <FormDescription>
                        The wallet address for Hyperliquid authentication.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="is_testnet"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Testnet</FormLabel>
                        <FormDescription>
                          Use testnet environment for paper trading.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Default</FormLabel>
                        <FormDescription>
                          Set as default credential for this exchange.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add API Key'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Credential Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update your exchange API credentials. Leave the API Secret blank if you don't want to change it.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={true} // Can't change the exchange for existing credentials
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bybit">Bybit</SelectItem>
                        <SelectItem value="coinbase">Coinbase</SelectItem>
                        <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                        <SelectItem value="mock">Mock (Testing)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your API key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="api_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Secret</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Leave blank to keep current secret" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Only enter if you want to change the current secret.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch('exchange') === 'coinbase' && (
                <FormField
                  control={form.control}
                  name="additional_params.passphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Passphrase</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your API passphrase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {form.watch('exchange') === 'hyperliquid' && (
                <FormField
                  control={form.control}
                  name="additional_params.wallet_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your wallet address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="is_testnet"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Testnet</FormLabel>
                        <FormDescription>
                          Use testnet environment for paper trading.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Default</FormLabel>
                        <FormDescription>
                          Set as default credential for this exchange.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update API Key'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCredential && (
            <div className="py-4">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium">Exchange:</h4>
                <span className="capitalize">{selectedCredential.exchange}</span>
              </div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">API Key:</h4>
                <span>{selectedCredential.api_key.substring(0, 8)}...</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
