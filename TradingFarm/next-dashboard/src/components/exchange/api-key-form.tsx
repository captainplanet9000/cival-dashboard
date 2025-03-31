'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Check, 
  Info, 
  Key, 
  Lock, 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2 
} from 'lucide-react';
import { saveExchangeApiKey, testApiConnection } from '@/app/actions/exchange-actions';

// API Key Schema
const apiKeySchema = z.object({
  exchange_id: z.string({
    required_error: "Please select an exchange",
  }),
  name: z.string({
    required_error: "Please enter a name for this key",
  }).min(3, {
    message: "Name must be at least 3 characters long",
  }),
  api_key: z.string({
    required_error: "API key is required",
  }).min(5, {
    message: "API key seems too short",
  }),
  api_secret: z.string({
    required_error: "API secret is required",
  }).min(5, {
    message: "API secret seems too short",
  }),
  passphrase: z.string().optional(),
  testnet: z.boolean().default(false),
  read_only: z.boolean().default(true),
  trading_enabled: z.boolean().default(false),
  farm_id: z.string({
    required_error: "Farm ID is required",
  }),
});

// Types for exchanges
export interface Exchange {
  id: string;
  name: string;
  requires_passphrase: boolean;
  supports_testnet: boolean;
  logo_url: string;
}

export interface Farm {
  id: string;
  name: string;
}

// API Key Management Form Props
interface ApiKeyFormProps {
  exchanges: Exchange[];
  farms: Farm[];
  initialValues?: z.infer<typeof apiKeySchema>;
  onSuccess?: () => void;
  editMode?: boolean;
}

export default function ApiKeyForm({
  exchanges,
  farms,
  initialValues,
  onSuccess,
  editMode = false
}: ApiKeyFormProps) {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [connectionTestResult, setConnectionTestResult] = React.useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  
  // Get the form with validation
  const form = useForm<z.infer<typeof apiKeySchema>>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: initialValues || {
      exchange_id: "",
      name: "",
      api_key: "",
      api_secret: "",
      passphrase: "",
      testnet: false,
      read_only: true,
      trading_enabled: false,
      farm_id: "",
    },
  });
  
  // Watch for form values to conditionally render UI
  const selectedExchangeId = form.watch('exchange_id');
  const testnetEnabled = form.watch('testnet');
  const readOnly = form.watch('read_only');
  const tradingEnabled = form.watch('trading_enabled');
  
  // Find the selected exchange object
  const selectedExchange = exchanges.find(exchange => exchange.id === selectedExchangeId);
  
  // Handle submission
  const onSubmit = async (values: z.infer<typeof apiKeySchema>) => {
    try {
      const result = await saveExchangeApiKey(values);
      
      if (result.success) {
        toast({
          title: editMode ? "API Key Updated" : "API Key Added",
          description: result.message || `Your API key for ${values.name} has been ${editMode ? 'updated' : 'saved'} successfully.`,
          variant: "default",
        });
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Test connection
  const handleTestConnection = async () => {
    const values = form.getValues();
    
    // Validate form before testing
    const validationResult = await form.trigger();
    if (!validationResult) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields correctly",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      const result = await testApiConnection({
        exchange_id: values.exchange_id,
        api_key: values.api_key,
        api_secret: values.api_secret,
        passphrase: values.passphrase,
        testnet: values.testnet,
      });
      
      setConnectionTestResult({
        success: result.success,
        message: result.message || (result.success ? "Connection successful" : "Connection failed"),
        details: result.details,
      });
      
      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: "Your API keys are valid and working correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.error || "There was an issue connecting to the exchange",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionTestResult({
        success: false,
        message: "An unexpected error occurred",
      });
      
      toast({
        title: "Error",
        description: "An unexpected error occurred during connection test",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Key className="h-5 w-5 mr-2" />
              {editMode ? "Edit Exchange API Key" : "Add Exchange API Key"}
            </CardTitle>
            <CardDescription>
              Add API keys to connect to cryptocurrency exchanges
            </CardDescription>
            {testnetEnabled && (
              <Badge className="mt-2 bg-amber-100 text-amber-800 border-amber-200">
                Testnet Mode
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Exchange Selection */}
              <FormField
                control={form.control}
                name="exchange_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={editMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exchanges.map((exchange) => (
                          <SelectItem key={exchange.id} value={exchange.id} className="flex items-center">
                            <div className="flex items-center">
                              {exchange.logo_url && (
                                <img 
                                  src={exchange.logo_url} 
                                  alt={exchange.name} 
                                  className="w-5 h-5 mr-2" 
                                />
                              )}
                              {exchange.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Key Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Trading Key, Read-Only Key" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name to identify this API key
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* API Key */}
            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Input 
                        placeholder="Enter your API key" 
                        {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* API Secret */}
            <FormField
              control={form.control}
              name="api_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Secret</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Enter your API secret" 
                          type={showSecret ? "text" : "password"} 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Your API secret will be encrypted before storage
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Passphrase (if required) */}
            {selectedExchange?.requires_passphrase && (
              <FormField
                control={form.control}
                name="passphrase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Passphrase</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Enter your API passphrase" 
                            type={showSecret ? "text" : "password"} 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                    </div>
                    <FormDescription>
                      Required for {selectedExchange.name} API access
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Separator />
            
            {/* Farm Selection */}
            <FormField
              control={form.control}
              name="farm_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a farm" />
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
                    The trading farm this API key will be used with
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-md font-medium flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Permissions & Settings
              </h3>
              
              {/* Testnet Toggle */}
              {selectedExchange?.supports_testnet && (
                <FormField
                  control={form.control}
                  name="testnet"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Testnet Mode</FormLabel>
                        <FormDescription>
                          Use the exchange testnet for paper trading
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
              )}
              
              {/* Read-Only Toggle */}
              <FormField
                control={form.control}
                name="read_only"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Read-Only Mode</FormLabel>
                      <FormDescription>
                        Key will only be used to read data, not place orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(value) => {
                          field.onChange(value);
                          if (value) {
                            // If setting to read-only, disable trading
                            form.setValue('trading_enabled', false);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Trading Enabled Toggle */}
              <FormField
                control={form.control}
                name="trading_enabled"
                render={({ field }) => (
                  <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm ${
                    readOnly ? 'opacity-50 bg-muted' : ''
                  }`}>
                    <div className="space-y-0.5">
                      <FormLabel>Trading Enabled</FormLabel>
                      <FormDescription>
                        Allow placing and managing orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Warning for trading permission */}
              {!readOnly && tradingEnabled && (
                <Alert variant="warning" className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Trading Permission Enabled</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    This API key will be able to place and manage orders on your behalf. Make sure you understand the risks.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Connection Test Results */}
            {connectionTestResult && (
              <Alert variant={connectionTestResult.success ? "default" : "destructive"} className={
                connectionTestResult.success 
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }>
                {connectionTestResult.success ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertTitle className={connectionTestResult.success ? "text-green-800" : "text-red-800"}>
                  {connectionTestResult.success ? "Connection Successful" : "Connection Failed"}
                </AlertTitle>
                <AlertDescription className={connectionTestResult.success ? "text-green-700" : "text-red-700"}>
                  {connectionTestResult.message}
                  
                  {connectionTestResult.details && (
                    <div className="mt-2 text-xs bg-background/50 p-2 rounded border">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(connectionTestResult.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !form.formState.isValid}
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            
            <Button 
              type="submit" 
              disabled={!form.formState.isValid || isTestingConnection}
            >
              {editMode ? "Update API Key" : "Save API Key"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
