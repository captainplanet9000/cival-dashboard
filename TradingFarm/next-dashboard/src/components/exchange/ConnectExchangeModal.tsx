'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
// Import the exchange credentials service and types
import { storeExchangeCredentials } from '@/utils/exchange/exchange-credentials-service';
import { ExchangeCredentials } from '@/utils/exchange/types';

// Define response type for the credential service
interface ExchangeCredentialResponse {
  success: boolean;
  credential?: {
    id: string;
    exchange: 'binance' | 'coinbase' | 'bybit' | 'hyperliquid';
  };
  balanceCount?: number;
  error?: string;
}
import { createBrowserClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

/**
 * Define available exchange options
 */
const exchangeOptions = [
  { value: 'binance', label: 'Binance', requiresPassphrase: false },
  { value: 'coinbase', label: 'Coinbase', requiresPassphrase: true },
  { value: 'bybit', label: 'Bybit', requiresPassphrase: false },
  { value: 'hyperliquid', label: 'HyperLiquid', requiresPassphrase: false },
];

/**
 * Props for the ConnectExchangeModal component
 * @interface ConnectExchangeModalProps
 * @property {boolean} [isOpen] - Whether the modal is open
 * @property {() => void} [onClose] - Callback when the modal is closed
 * @property {(credentialId: string) => void} [onSuccess] - Callback when an exchange is successfully connected
 */
interface ConnectExchangeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (credentialId: string) => void;
}

/**
 * ConnectExchangeModal Component
 * 
 * Provides a form for connecting to cryptocurrency exchanges by entering API credentials.
 * Supports both standalone usage with internal state and controlled usage through props.
 * 
 * @param props ConnectExchangeModalProps
 */
/**
 * Modal for connecting cryptocurrency exchanges to the Trading Farm platform
 * Allows users to enter API keys and secrets for various supported exchanges
 * @param {ConnectExchangeModalProps} props - Component props
 */
export function ConnectExchangeModal({ isOpen, onClose, onSuccess }: ConnectExchangeModalProps = {}) {
  const { toast } = useToast();
  const router = useRouter();
  // Internal state for standalone usage, external state takes precedence when provided
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    exchange: '',
    name: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    testnet: false,
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleExchangeChange = (value: string) => {
    setFormData({ ...formData, exchange: value });
  };

  const handleTestnetChange = (checked: boolean) => {
    setFormData({ ...formData, testnet: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate that the exchange is one of the allowed values
      if (!['binance', 'coinbase', 'bybit', 'hyperliquid'].includes(formData.exchange)) {
        throw new Error('Invalid exchange selected');
      }

      // Store credentials in the database (API endpoint)
      const credentials: ExchangeCredentials = {
        user_id: user.id,
        exchange: formData.exchange as 'binance' | 'coinbase' | 'bybit' | 'hyperliquid',
        name: formData.name || formData.exchange,
        api_key: formData.apiKey,
        api_secret: formData.apiSecret,
        passphrase: formData.passphrase,
        testnet: formData.testnet
      };
      
      // The service returns a JSON string that needs to be parsed
      const responseStr = await storeExchangeCredentials(credentials);
      let responseData: ExchangeCredentialResponse;
      
      try {
        responseData = JSON.parse(responseStr);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (responseData && responseData.success) {
        toast({
          title: 'Exchange Connected',
          description: `Successfully connected to ${formData.exchange}${
            responseData.balanceCount ? ` Found ${responseData.balanceCount} currencies.` : ''
          }`,
        });

        // Reset form and close modal
        setFormData({
          exchange: '',
          name: '',
          apiKey: '',
          apiSecret: '',
          passphrase: '',
          testnet: false,
        });
        
        // Close the modal
        if (onClose) {
          onClose();
        } else {
          setInternalOpen(false);
        }
        
        // Call onSuccess callback if provided
        if (onSuccess && responseData?.credential?.id) {
          onSuccess(responseData.credential.id);
        }

        // Refresh page to load updated balances
        router.refresh();
      } else if (responseData.error) {
        setError(responseData.error);
      }
    } catch (err: any) {
      console.error('Error connecting exchange:', err);
      setError(err.message || 'Failed to connect exchange');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Dialog component wrapper to fix TypeScript issues with Dialog props
  /**
   * Custom Dialog component wrapper to fix TypeScript issues with Dialog props
   */
  const DialogWrapper = ({ 
    open, 
    onOpenChange, 
    children 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    children: React.ReactNode 
  }) => {
    return React.createElement(Dialog, { open, onOpenChange }, children);
  };
  
  // Determine if modal should be open based on props or internal state
  const isDialogOpen = isOpen !== undefined ? isOpen : internalOpen;

  // Reset form state when modal is opened or closed
  React.useEffect(() => {
    if (isDialogOpen) {
      // Reset form when opened
      setError(null);
    } else {
      // Reset form when closed after a short delay to allow for animation
      const timer = setTimeout(() => {
        setFormData({
          exchange: '',
          name: '',
          apiKey: '',
          apiSecret: '',
          passphrase: '',
          testnet: false
        });
        setError(null);
        setIsLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isDialogOpen]);

  // Handle close from Dialog component
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only update internal state if no external state is provided
      if (isOpen === undefined) {
        setInternalOpen(false);
      }
      // Call the onClose callback if provided
      if (onClose) {
        onClose();
      }
    }
  };

  // Custom Dialog component wrapper to fix TypeScript issues with Dialog props
  /**
   * Custom Dialog component wrapper to fix TypeScript issues with Dialog props
   */
  const StandaloneWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isOpen !== undefined) {
      // Controlled mode doesn't need a trigger
      return <>{children}</>;
    }
    
    return (
      <>
        {/* Standalone trigger button shown only if isOpen prop is not provided */}
        {isOpen === undefined && (
          <Button 
            onClick={() => setInternalOpen(true)} 
            variant="outline" 
            size="sm"
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Connect Exchange
          </Button>
        )}
        {children}
      </>
    );
  };
  
  return (
    <DialogWrapper open={isDialogOpen} onOpenChange={handleOpenChange}>
      <StandaloneWrapper>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect Exchange</DialogTitle>
            <DialogDescription>
              Connect your exchange account using API keys. Your keys will be securely encrypted.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Select value={formData.exchange} onValueChange={handleExchangeChange} required>
                  <SelectTrigger id="exchange">
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {exchangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name">Connection Name (Optional)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="e.g., My Binance Account"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={handleChange('apiKey')}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={formData.apiSecret}
                  onChange={handleChange('apiSecret')}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="passphrase">Passphrase (if required)</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={formData.passphrase}
                  onChange={handleChange('passphrase')}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="testnet" 
                  checked={formData.testnet}
                  onCheckedChange={handleTestnetChange}
                />
                <Label htmlFor="testnet" className="text-sm">Use testnet</Label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Exchange'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </StandaloneWrapper>
    </DialogWrapper>
  );
}
