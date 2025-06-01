'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { VaultAccount, createUnifiedBankingService } from '@/services/unified-banking-service';
import { Loader2 } from 'lucide-react';

const accountFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Account name must be at least 2 characters.',
  }),
  description: z.string().optional(),
  account_type: z.enum(['master', 'farm', 'agent']),
  parent_id: z.string().optional(),
  farm_id: z.coerce.number().optional(),
  agent_id: z.coerce.number().optional(),
  security_level: z.enum(['standard', 'multisig', 'high']),
  initial_balance: z.coerce.number().min(0).optional(),
  require_approvals: z.boolean().default(false),
  required_approvals: z.coerce.number().min(1).max(10).default(2),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
  initialData?: VaultAccount;
  parentAccounts?: VaultAccount[];
  farmId?: number;
  agentId?: number;
  onSubmit: (data: VaultAccount) => void;
  onCancel?: () => void;
}

export function AccountForm({
  initialData,
  parentAccounts = [],
  farmId,
  agentId,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableParents, setAvailableParents] = useState<VaultAccount[]>(parentAccounts);
  
  const bankingService = createUnifiedBankingService();
  
  // Set default values based on provided account data or defaults
  const defaultValues: Partial<AccountFormValues> = {
    name: initialData?.name || '',
    description: initialData?.description || '',
    account_type: initialData?.account_type || 'farm',
    parent_id: initialData?.parent_id || undefined,
    farm_id: initialData?.farm_id ?? farmId,
    agent_id: initialData?.agent_id ?? agentId,
    security_level: initialData?.security_level || 'standard',
    initial_balance: initialData?.balance || 0,
    require_approvals: initialData?.security_level === 'multisig',
    required_approvals: initialData?.security_config?.required_approvals || 2,
  };
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  });
  
  const accountType = form.watch('account_type');
  const securityLevel = form.watch('security_level');
  const requireApprovals = form.watch('require_approvals');
  
  // Load available parent accounts if not provided
  useEffect(() => {
    const fetchParentAccounts = async () => {
      if (parentAccounts.length === 0) {
        try {
          // Fetch accounts that could be parents based on the selected type
          let parentType: string;
          if (accountType === 'farm') {
            parentType = 'master';
          } else if (accountType === 'agent') {
            parentType = 'farm';
          } else {
            return; // Master accounts don't have parents
          }
          
          const accounts = await bankingService.getAccounts({ account_type: parentType });
          setAvailableParents(accounts);
        } catch (error) {
          console.error('Error fetching parent accounts:', error);
        }
      }
    };
    
    fetchParentAccounts();
  }, [accountType, parentAccounts]);
  
  // Update form fields based on account type changes
  useEffect(() => {
    // When changing account type, we might need to adjust the parent field
    if (accountType === 'master') {
      form.setValue('parent_id', undefined);
    } else if (accountType === 'farm') {
      // If changing to farm type, parent should be a master account
      const currentParentId = form.getValues('parent_id');
      const currentParent = availableParents.find(acc => acc.id === currentParentId);
      
      if (!currentParent || currentParent.account_type !== 'master') {
        form.setValue('parent_id', undefined);
      }
    } else if (accountType === 'agent') {
      // If changing to agent type, parent should be a farm account
      const currentParentId = form.getValues('parent_id');
      const currentParent = availableParents.find(acc => acc.id === currentParentId);
      
      if (!currentParent || currentParent.account_type !== 'farm') {
        form.setValue('parent_id', undefined);
      }
    }
  }, [accountType, availableParents]);
  
  // Update security config when multisig settings change
  useEffect(() => {
    if (securityLevel === 'multisig' && !requireApprovals) {
      form.setValue('require_approvals', true);
    }
  }, [securityLevel]);
  
  async function onSubmitForm(data: AccountFormValues) {
    setIsSubmitting(true);
    
    try {
      const accountData: VaultAccount = {
        ...initialData,
        name: data.name,
        description: data.description,
        account_type: data.account_type,
        parent_id: data.parent_id,
        farm_id: data.farm_id ?? farmId,
        agent_id: data.agent_id ?? agentId,
        security_level: data.security_level,
      };
      
      // Only include balance for new accounts
      if (!initialData?.id && data.initial_balance !== undefined) {
        accountData.balance = data.initial_balance;
      }
      
      // Include security configuration for multisig accounts
      if (data.security_level === 'multisig' && data.require_approvals) {
        accountData.security_config = {
          ...initialData?.security_config,
          required_approvals: data.required_approvals,
        };
      }
      
      onSubmit(accountData);
    } catch (error) {
      console.error('Error submitting account form:', error);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Account' : 'Create New Account'}</CardTitle>
        <CardDescription>
          {initialData 
            ? 'Modify details for your existing vault account' 
            : 'Configure a new vault account for your financial operations'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the purpose of this account"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select 
                      disabled={!!initialData} // Can't change type after creation
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="master">Master Account</SelectItem>
                        <SelectItem value="farm">Farm Account</SelectItem>
                        <SelectItem value="agent">Agent Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {accountType === 'master' 
                        ? 'Master accounts are the top level of the hierarchy'
                        : accountType === 'farm'
                        ? 'Farm accounts are linked to trading farms'
                        : 'Agent accounts are managed by specific trading agents'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {accountType !== 'master' && (
                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Account</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableParents.map((account) => (
                            <SelectItem key={account.id} value={account.id || ''}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {accountType === 'farm' 
                          ? 'Select the master account this farm account belongs to'
                          : 'Select the farm account this agent account belongs to'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="security_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select security level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="multisig">Multi-Signature</SelectItem>
                        <SelectItem value="high">High Security</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {securityLevel === 'standard' 
                        ? 'Standard security requires single-user approval'
                        : securityLevel === 'multisig'
                        ? 'Multi-signature requires multiple approvals for transactions'
                        : 'High security includes additional verification steps'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!initialData && (
                <FormField
                  control={form.control}
                  name="initial_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional starting balance for the account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {securityLevel === 'multisig' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="require_approvals"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require Multiple Approvals
                        </FormLabel>
                        <FormDescription>
                          Transactions from this account will need multiple approvals
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
                
                {requireApprovals && (
                  <FormField
                    control={form.control}
                    name="required_approvals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Approvals</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="2"
                            max="10"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Number of approvals required for transactions (minimum 2)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-4 pt-4">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Update Account' : 'Create Account'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
