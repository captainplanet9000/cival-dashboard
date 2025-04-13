"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, Info, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import databaseService from "@/services/database-service";
import bybitTradingService from "@/services/bybit-trading-service";
import hyperliquidTradingService from "@/services/hyperliquid-trading-service";
import exchangeMonitoringService from "@/services/exchange-monitoring-service";

// Form validation schema
const exchangeConnectionSchema = z.object({
  exchangeName: z.enum(["bybit", "hyperliquid", "coinbase"]),
  chain: z.enum(["arbitrum", "ethereum", "solana", "base"]).optional(),
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
  privateKey: z.string().optional(),
  walletAddress: z.string().optional(),
  label: z.string().optional(),
  isTestnet: z.boolean().default(true),
  permissions: z.object({
    trade: z.boolean().default(false),
    withdraw: z.boolean().default(false),
    deposit: z.boolean().default(true),
  }),
});

type FormValues = z.infer<typeof exchangeConnectionSchema>;

interface ExchangeConnectionFormProps {
  credentialId?: number;
  onSuccess?: (credentialId: number) => void;
}

export function ExchangeConnectionForm({ 
  credentialId,
  onSuccess 
}: ExchangeConnectionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>("");
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(exchangeConnectionSchema),
    defaultValues: {
      exchangeName: "bybit",
      chain: "arbitrum",
      apiKey: "",
      apiSecret: "",
      privateKey: "",
      walletAddress: "",
      label: "",
      isTestnet: true,
      permissions: {
        trade: false,
        withdraw: false,
        deposit: true,
      },
    },
  });

  // Load existing credentials if editing
  React.useEffect(() => {
    if (credentialId) {
      const loadCredentials = async () => {
        try {
          const { data, error } = await databaseService.rpc('get_exchange_credentials', {
            p_credential_id: credentialId
          });
          
          if (error) {
            toast({
              variant: "destructive",
              title: "Error loading credentials",
              description: error.message,
            });
            return;
          }
          
          if (data) {
            form.reset({
              exchangeName: data.exchange_name as any,
              chain: data.chain as any || "arbitrum",
              apiKey: data.api_key,
              apiSecret: data.api_secret,
              privateKey: data.private_key || "",
              walletAddress: data.wallet_address || "",
              label: data.label || "",
              isTestnet: data.is_testnet,
              permissions: {
                trade: data.permissions?.trade || false,
                withdraw: data.permissions?.withdraw || false,
                deposit: data.permissions?.deposit || true,
              },
            });
          }
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Error loading credentials",
            description: error.message || "An unknown error occurred",
          });
        }
      };
      
      loadCredentials();
    }
  }, [credentialId, form, toast]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Format permissions as JSON
      const permissions = {
        trade: values.permissions.trade,
        withdraw: values.permissions.withdraw,
        deposit: values.permissions.deposit,
      };
      
      // Store credentials using RPC function
      const { data, error } = await databaseService.rpc('store_exchange_credentials', {
        p_exchange_name: values.exchangeName,
        p_api_key: values.apiKey,
        p_api_secret: values.apiSecret,
        p_private_key: values.privateKey || null,
        p_wallet_address: values.walletAddress || null,
        p_chain: values.chain || "arbitrum",
        p_label: values.label || null,
        p_is_testnet: values.isTestnet,
        p_permissions: permissions,
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error saving credentials",
          description: error.message,
        });
        return;
      }
      
      toast({
        title: "Credentials saved",
        description: "Exchange connection has been successfully saved.",
      });
      
      // Start monitoring exchange health
      exchangeMonitoringService.startMonitoring(values.exchangeName as any, data);
      
      // Call success callback if provided
      if (onSuccess && data) {
        onSuccess(data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test connection with provided credentials
  const testConnection = async () => {
    setTestStatus('testing');
    setTestMessage("");
    
    const values = form.getValues();
    
    try {
      // Create temporary credentials object
      const credentials = {
        apiKey: values.apiKey,
        apiSecret: values.apiSecret,
        walletAddress: values.walletAddress || undefined,
        testnet: values.isTestnet,
      };
      
      // Test connection based on exchange
      let response;
      
      switch (values.exchangeName) {
        case "bybit":
          response = await bybitTradingService.getServerTime(credentials);
          break;
          
        case "hyperliquid":
          // For Hyperliquid, we can test with the market meta endpoint
          if (!values.privateKey && values.apiSecret) {
            credentials.apiSecret = values.apiSecret;
          }
          response = await hyperliquidTradingService.getMarketMeta();
          break;
          
        case "coinbase":
          // Coinbase integration not implemented yet
          setTestStatus('error');
          setTestMessage("Coinbase integration not implemented yet");
          return;
          
        default:
          setTestStatus('error');
          setTestMessage("Unsupported exchange");
          return;
      }
      
      if (response.success) {
        setTestStatus('success');
        setTestMessage("Connection successful!");
      } else {
        setTestStatus('error');
        setTestMessage(response.error || "Unknown error");
      }
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(error.message || "An unknown error occurred");
    }
  };

  // Show appropriate fields based on selected exchange
  const selectedExchange = form.watch("exchangeName");

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Exchange Connection</CardTitle>
        <CardDescription>
          Connect to a cryptocurrency exchange by providing API credentials
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exchangeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bybit">Bybit</SelectItem>
                        <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                        <SelectItem value="coinbase">Coinbase (Coming soon)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {(selectedExchange === "hyperliquid") && (
                <FormField
                  control={form.control}
                  name="chain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chain</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "arbitrum"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="arbitrum">Arbitrum</SelectItem>
                          <SelectItem value="base">Base</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="E.g. Trading Account, Test Account" 
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this connection
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
                    <Input 
                      placeholder="Enter API key" 
                      {...field}
                    />
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
                    <Input 
                      type="password" 
                      placeholder="Enter API secret" 
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Your API secret is stored securely and encrypted
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedExchange === "hyperliquid" && (
              <>
                <FormField
                  control={form.control}
                  name="privateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private Key (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter wallet private key" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Private key is required for signing transactions on Hyperliquid
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0x..." 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <FormField
              control={form.control}
              name="isTestnet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Testnet Mode</FormLabel>
                    <FormDescription>
                      Use testnet for development and testing
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
            
            <div className="border rounded-lg p-4">
              <div className="text-base font-medium mb-2">Permissions</div>
              
              <FormField
                control={form.control}
                name="permissions.trade"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Enable Trading
                      </FormLabel>
                      <FormDescription>
                        Allow the system to place and manage orders
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="permissions.withdraw"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Enable Withdrawals
                      </FormLabel>
                      <FormDescription>
                        Allow the system to withdraw funds (use with caution)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="permissions.deposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Enable Deposits
                      </FormLabel>
                      <FormDescription>
                        Allow the system to view deposit addresses
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {testStatus !== 'idle' && (
              <Alert 
                variant={
                  testStatus === 'testing' ? 'default' : 
                  testStatus === 'success' ? 'default' : 'destructive'
                }
              >
                <div className="flex items-center">
                  {testStatus === 'testing' && <Info className="h-4 w-4 mr-2" />}
                  {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                  {testStatus === 'error' && <AlertCircle className="h-4 w-4 mr-2" />}
                  
                  <AlertTitle>
                    {testStatus === 'testing' && 'Testing connection...'}
                    {testStatus === 'success' && 'Connection successful'}
                    {testStatus === 'error' && 'Connection failed'}
                  </AlertTitle>
                </div>
                {testMessage && <AlertDescription>{testMessage}</AlertDescription>}
              </Alert>
            )}
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline"
                disabled={isSubmitting || testStatus === 'testing'}
                onClick={testConnection}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Test Connection
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Connection'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ExchangeConnectionForm;
