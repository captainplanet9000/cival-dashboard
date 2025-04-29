import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, Info, Percent, DollarSign } from 'lucide-react';
import { useRiskManagement } from '@/hooks/use-trading';
import { RiskProfile } from '@/types/trading';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define schema for risk configuration form
const riskFormSchema = z.object({
  max_position_pct: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01).max(1)
  ),
  max_daily_loss: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01).max(0.5)
  ),
  circuit_breaker: z.boolean(),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

interface RiskManagementPanelProps {
  agentId?: string;
  userId: string;
}

export function RiskManagementPanel({ agentId, userId }: RiskManagementPanelProps) {
  const { getRiskProfile, updateRiskProfile, isLoading } = useRiskManagement();
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [isCircuitBreakerDialogOpen, setIsCircuitBreakerDialogOpen] = useState(false);

  // Setup form with default values
  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      max_position_pct: 0.05,
      max_daily_loss: 0.02,
      circuit_breaker: false,
    },
  });

  // Get the circuit breaker value from the form
  const circuitBreakerEnabled = form.watch("circuit_breaker");

  // Fetch risk profile on component mount
  useEffect(() => {
    const fetchRiskProfile = async () => {
      const profile = await getRiskProfile(agentId);
      if (profile) {
        setRiskProfile(profile);
        
        // Update form values with fetched profile
        form.reset({
          max_position_pct: profile.max_position_pct,
          max_daily_loss: profile.max_daily_loss,
          circuit_breaker: profile.circuit_breaker,
        });
      }
    };

    fetchRiskProfile();
  }, [agentId, getRiskProfile]);

  // Handle form submission
  const onSubmit = async (values: RiskFormValues) => {
    // If trying to enable circuit breaker, show confirmation dialog
    if (values.circuit_breaker && !riskProfile?.circuit_breaker) {
      setIsCircuitBreakerDialogOpen(true);
      return;
    }
    
    // Otherwise just save
    await saveRiskProfile(values);
  };

  // Function to save risk profile
  const saveRiskProfile = async (values: RiskFormValues) => {
    if (!userId) return;
    
    const updatedProfile: RiskProfile = {
      id: riskProfile?.id,
      user_id: userId,
      agent_id: agentId,
      max_position_pct: values.max_position_pct,
      max_daily_loss: values.max_daily_loss,
      circuit_breaker: values.circuit_breaker,
    };
    
    const result = await updateRiskProfile(updatedProfile);
    if (result) {
      setRiskProfile(result);
    }
  };

  // Handle circuit breaker confirmation
  const handleCircuitBreakerConfirm = async () => {
    setIsCircuitBreakerDialogOpen(false);
    await saveRiskProfile(form.getValues());
  };

  // Calculate position limit
  const calculatePositionLimit = (accountValue: number, maxPositionPct: number) => {
    return accountValue * maxPositionPct;
  };

  // Calculate daily loss limit
  const calculateDailyLossLimit = (accountValue: number, maxDailyLoss: number) => {
    return accountValue * maxDailyLoss;
  };

  // Example account value (this would be fetched from API in production)
  const exampleAccountValue = 100000;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
            <span>Risk Management</span>
          </div>
        </CardTitle>
        <CardDescription>
          Configure risk parameters to protect your capital
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Risk Settings</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="max_position_pct"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Maximum Position Size</FormLabel>
                        <div className="font-mono text-sm">
                          {(field.value * 100).toFixed(1)}%
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          min={0.01}
                          max={1}
                          step={0.01}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                        />
                      </FormControl>
                      <FormDescription className="flex items-center gap-1 text-xs">
                        <Percent className="h-3 w-3" />
                        This represents the maximum percentage of your portfolio that can be allocated to a single position.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_daily_loss"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Maximum Daily Loss</FormLabel>
                        <div className="font-mono text-sm">
                          {(field.value * 100).toFixed(1)}%
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          min={0.01}
                          max={0.5}
                          step={0.01}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                        />
                      </FormControl>
                      <FormDescription className="flex items-center gap-1 text-xs">
                        <Percent className="h-3 w-3" />
                        The maximum percentage of portfolio value you're willing to lose in a single day.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="circuit_breaker"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Circuit Breaker</FormLabel>
                        <FormDescription>
                          Automatically stop trading if daily loss limit is reached
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
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save Risk Configuration</>
                  )}
                </Button>
              </form>
            </Form>
            
            {/* Circuit Breaker Confirmation Dialog */}
            <AlertDialog
              open={isCircuitBreakerDialogOpen}
              onOpenChange={setIsCircuitBreakerDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enable Circuit Breaker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will automatically stop all trading if your daily loss reaches {(form.getValues().max_daily_loss * 100).toFixed(1)}% of your portfolio ({calculateDailyLossLimit(exampleAccountValue, form.getValues().max_daily_loss).toLocaleString(undefined, {style: 'currency', currency: 'USD'})}). This can prevent further losses but may also prevent potential recovery trades.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCircuitBreakerConfirm}>
                    Enable
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          
          <TabsContent value="overview" className="py-4">
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Current Risk Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="overflow-hidden">
                  <CardHeader className="p-4 bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-medium">Position Size Limit</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-xl font-bold">
                      {((riskProfile?.max_position_pct || 0.05) * 100).toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Max position size: {calculatePositionLimit(exampleAccountValue, riskProfile?.max_position_pct || 0.05).toLocaleString(undefined, {style: 'currency', currency: 'USD'})}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardHeader className="p-4 bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-medium">Daily Loss Limit</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-xl font-bold">
                      {((riskProfile?.max_daily_loss || 0.02) * 100).toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Daily stop limit: {calculateDailyLossLimit(exampleAccountValue, riskProfile?.max_daily_loss || 0.02).toLocaleString(undefined, {style: 'currency', currency: 'USD'})}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4" />
                  <h3 className="text-base font-semibold">Circuit Breaker Status</h3>
                </div>
                
                <div className={`p-4 rounded-lg border ${riskProfile?.circuit_breaker ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-secondary/20'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {riskProfile?.circuit_breaker ? 'Enabled' : 'Disabled'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {riskProfile?.circuit_breaker 
                          ? 'All trading will stop if daily loss limit is reached' 
                          : 'Trading will continue regardless of daily losses'}
                      </div>
                    </div>
                    <div>
                      {riskProfile?.circuit_breaker ? (
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                      ) : (
                        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5" />
          <p>Risk management settings apply to your trading activities. Review them regularly to ensure they align with your risk tolerance.</p>
        </div>
      </CardFooter>
    </Card>
  );
}
