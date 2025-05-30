// @ts-nocheck
'use client'

import React from 'react'
import { createBrowserClient } from '@/utils/supabase/client'
import { exchangeCredentialsService, ExchangeCredential, ExchangeCredentialInsert } from '@/utils/supabase/exchange-credentials'
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { getSupportedExchanges } from '@/lib/exchange/connector-factory'
import { Loader2, PlusCircle, KeyRound, Check, X, AlertTriangle, Shield } from 'lucide-react'

/**
 * Form schema for exchange credentials
 */
const credentialFormSchema = z.object({
  name: z.string().min(3, {
    message: 'Credential name must be at least 3 characters.',
  }),
  exchange: z.string().min(1, {
    message: 'Please select an exchange.',
  }),
  apiKey: z.string().min(10, {
    message: 'API key must be at least 10 characters.',
  }),
  apiSecret: z.string().min(10, {
    message: 'API secret must be at least 10 characters.',
  }),
  apiPassphrase: z.string().optional(),
  isTestnet: z.boolean().default(false),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default(['read']),
})

type CredentialFormValues = z.infer<typeof credentialFormSchema>

/**
 * Exchange credential item display
 */
interface CredentialItemProps {
  credential: ExchangeCredential
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onTestConnection: (id: string) => void
  testResults: Record<string, { success: boolean, message: string }>
}

const CredentialItem = ({ 
  credential, 
  onDelete, 
  onToggleActive, 
  onTestConnection,
  testResults
}: CredentialItemProps) => {
  const testResult = testResults[credential.id]
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {credential.name}
              {credential.is_testnet && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Testnet
                </Badge>
              )}
              {credential.is_active ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500 border-gray-500">
                  Inactive
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{credential.exchange.toUpperCase()}</CardDescription>
          </div>
          <div className="flex gap-1">
            {testResult && (
              <Badge 
                variant={testResult.success ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {testResult.success ? <Check size={12} /> : <AlertTriangle size={12} />}
                {testResult.success ? 'Connected' : 'Failed'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm pb-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">API Key:</span>
            <div className="font-mono text-xs mt-1 truncate max-w-xs">
              {credential.api_key.substring(0, 8)}...{credential.api_key.substring(credential.api_key.length - 4)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Permissions:</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {credential.permissions.map((perm: string) => (
                <Badge key={perm} variant="secondary" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-2 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onTestConnection(credential.id)}
        >
          Test Connection
        </Button>
        <Button 
          variant={credential.is_active ? "outline" : "default"} 
          size="sm"
          onClick={() => onToggleActive(credential.id, !credential.is_active)}
        >
          {credential.is_active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => onDelete(credential.id)}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}

/**
 * Exchange credential manager component
 */
export function ExchangeCredentialManager() {
  const supabase = createBrowserClient()
  const [loading, setLoading] = React.useState(true)
  const [credentials, setCredentials] = React.useState<ExchangeCredential[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [testResults, setTestResults] = React.useState<Record<string, { success: boolean; message: string }}>({})
  
  // Get supported exchanges
  const supportedExchanges = getSupportedExchanges()
  
  // Form configuration
  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    defaultValues: {
      name: '',
      exchange: '',
      apiKey: '',
      apiSecret: '',
      apiPassphrase: '',
      isTestnet: false,
      isActive: true,
      permissions: ['read'],
    },
  })
  
  // Load credentials on component mount
  React.useEffect(() => {
    loadCredentials()
  }, [])
  
  // Load credentials from the database
  const loadCredentials = async () => {
    setLoading(true)
    
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No authenticated user')
      }
      
      const { data, error } = await exchangeCredentialsService.listCredentials(
        supabase,
        sessionData.session.user.id
      )
      
      if (error) {
        throw error
      }
      
      setCredentials(data || [])
    } catch (error: any) {
      console.error('Error loading credentials:', error)
      toast({
        title: 'Error loading credentials',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
        variant: 'destructive',
      });
    } else {
      setCredentials(data || []);
    }
    
    setLoading(false);
  }
  
  // Handle form submission
  const onSubmit = async (values: CredentialFormValues) => {
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No authenticated user')
      }
      
      const newCredential: ExchangeCredentialInsert = {
        user_id: sessionData.session.user.id,
        label: values.name,
        exchange: values.exchange,
        api_key: values.apiKey,
        api_secret: values.apiSecret,
        api_passphrase: values.apiPassphrase || null,
        is_testnet: values.isTestnet,
        is_default: false, // Set first credential as default
        permissions: values.permissions,
        is_active: values.isActive
      }
      
      const { data, error } = await exchangeCredentialsService.create(
        supabase,
        newCredential
      )
      
      if (error) {
        throw error
      }
      
      // If this is the first credential for an exchange, make it the default
      const matchingExchangeCredentials = credentials.filter(
        (cred: ExchangeCredential) => cred.exchange === values.exchange
      )
      
      if (matchingExchangeCredentials.length === 0 && data) {
        await exchangeCredentialsService.setDefault(
          supabase,
          sessionData.session.user.id,
          data.id,
          values.exchange
        )
      }
      
      setDialogOpen(false)
      form.reset()
      loadCredentials()
      
      toast({
        title: 'Credential added',
        description: 'Your exchange credential has been added successfully.',
      })
    } catch (error) {
      console.error('Error adding credential:', error)
      toast({
        title: 'Error adding credential',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    }
  }
  
  // Handle credential deletion
  const handleDelete = async (id: string) => {
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No authenticated user')
      }
      
      const { error } = await exchangeCredentialsService.delete(
        supabase,
        sessionData.session.user.id,
        id
      )
      
      if (error) {
        throw error
      }
      
      loadCredentials()
      
      toast({
        title: 'Credential deleted',
        description: 'The exchange credential has been deleted.',
      })
    } catch (error) {
      console.error('Error deleting credential:', error)
      toast({
        title: 'Error deleting credential',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    }
  }
  
  // Handle toggling active status
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No authenticated user')
      }
      
      const { error } = await exchangeCredentialsService.update(
        supabase,
        sessionData.session.user.id,
        {
          id,
          is_active: isActive
        }
      )
      
      if (error) {
        throw error
      }
      
      loadCredentials()
      
      toast({
        title: isActive ? 'Credential activated' : 'Credential deactivated',
        description: isActive 
          ? 'The exchange credential is now active.' 
          : 'The exchange credential has been deactivated.',
      })
    } catch (error) {
      console.error('Error updating credential:', error)
      toast({
        title: 'Error updating credential',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    }
  }
  
  // Handle testing a connection
  const handleTestConnection = async (id: string) => {
    // Find the credential
    const credential = credentials.find((c: ExchangeCredential) => c.id === id)
    if (!credential) return
    
    setTestResults((prev: Record<string, { success: boolean; message: string }>) => ({
      ...prev,
      [id]: { success: false, message: 'Testing...' }
    }))
    
    try {
      // Call the API to test the connection
      const response = await fetch('/api/exchange/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentialId: id,
          exchange: credential.exchange,
        }),
      })
      
      const result = await response.json()
      
      setTestResults((prev: Record<string, { success: boolean; message: string }>) => ({
        ...prev,
        [id]: { 
          success: result.success, 
          message: result.message 
        }
      }))
      
      toast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      })
    } catch (error) {
      console.error('Error testing connection:', error)
      
      setTestResults((prev: Record<string, { success: boolean; message: string }>) => ({
        ...prev,
        [id]: { 
          success: false, 
          message: 'Connection failed' 
        }
      }))
      
      toast({
        title: 'Error testing connection',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Exchange Credentials</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle size={16} />
              Add Exchange
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Exchange Credential</DialogTitle>
              <DialogDescription>
                Enter your exchange API credentials to connect to the exchange.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credential Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Account" {...field} />
                      </FormControl>
                      <FormDescription>
                        A name to identify this credential set
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                          {supportedExchanges.map((exchange) => (
                            <SelectItem key={exchange} value={exchange}>
                              {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The cryptocurrency exchange to connect to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Your API key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <Input placeholder="Your API secret" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiPassphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Passphrase (if required)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your API passphrase" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Required for some exchanges like Coinbase
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="isTestnet"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use Testnet</FormLabel>
                          <FormDescription>
                            Connect to the exchange's test environment
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable this credential for use in trading
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="permissions"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Permissions</FormLabel>
                        <FormDescription>
                          Select the permissions for this API key
                        </FormDescription>
                      </div>
                      <div className="flex gap-4">
                        {['read', 'trade', 'withdraw'].map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked: boolean) => {
                                        return checked
                                          ? field.onChange([...field.value, item])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal capitalize">
                                    {item}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" className="mt-4 w-full">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Add Credential
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="rounded-lg border bg-card p-5">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No Exchange Credentials</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Add your exchange API credentials to start trading or viewing your data.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="mt-4"
            >
              Add Your First Exchange
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentials.map((credential: ExchangeCredential) => (
              <CredentialItem
                key={credential.id}
                credential={credential}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onTestConnection={handleTestConnection}
                testResults={testResults}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
