'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskProfile, RiskLevel, RISK_PRESETS } from '@/lib/risk/types';
import { RiskProfileCard } from './RiskProfileCard';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { PlusCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { RiskProfileEditor } from './RiskProfileEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface RiskProfileManagerProps {
  userId: string;
}

export function RiskProfileManager({ userId }: RiskProfileManagerProps) {
  const [profiles, setProfiles] = React.useState<RiskProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Fetch risk profiles
  const fetchProfiles = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('risk_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map database fields to our RiskProfile type
      const mappedProfiles: RiskProfile[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        level: item.level as RiskLevel,
        parameters: item.parameters,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        userId: item.user_id,
        isDefault: item.is_default
      }));
      
      setProfiles(mappedProfiles);
    } catch (error) {
      console.error('Error fetching risk profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load risk profiles. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, toast]);
  
  // Create default risk profiles if none exist
  const createDefaultProfiles = React.useCallback(async () => {
    try {
      // Create one profile for each risk level
      const defaultProfiles = Object.entries(RISK_PRESETS).map(([level, parameters], index) => ({
        name: `${level.charAt(0).toUpperCase() + level.slice(1)} Strategy`,
        description: `Default ${level} risk management strategy`,
        level: level as RiskLevel,
        parameters: { ...parameters, customRiskRules: {} },
        is_default: index === 1, // Set moderate as default
        user_id: userId
      }));
      
      const { error } = await supabase
        .from('risk_profiles')
        .insert(defaultProfiles);
      
      if (error) throw error;
      
      await fetchProfiles();
      
      toast({
        title: 'Default Profiles Created',
        description: 'We\'ve created some starter risk profiles for you.',
      });
    } catch (error) {
      console.error('Error creating default profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to create default risk profiles. Please try again.',
        variant: 'destructive',
      });
    }
  }, [supabase, userId, fetchProfiles, toast]);
  
  // Handle setting a profile as default
  const handleSetDefault = async (profileId: string) => {
    try {
      // First set all profiles to non-default
      await supabase
        .from('risk_profiles')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      // Then set the selected one as default
      await supabase
        .from('risk_profiles')
        .update({ is_default: true })
        .eq('id', profileId);
      
      // Refresh the list
      await fetchProfiles();
    } catch (error) {
      console.error('Error setting default profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to set default profile. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Load profiles on mount
  React.useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);
  
  // Create default profiles if none exist
  React.useEffect(() => {
    if (!loading && profiles.length === 0) {
      createDefaultProfiles();
    }
  }, [loading, profiles.length, createDefaultProfiles]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Risk Profiles</h2>
          <p className="text-muted-foreground">
            Manage your risk parameters for different trading strategies
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchProfiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Sheet open={isCreating} onOpenChange={setIsCreating}>
            <SheetTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Profile
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[600px] sm:w-[540px]" side="right">
              <SheetHeader>
                <SheetTitle>Create Risk Profile</SheetTitle>
                <SheetDescription>
                  Define parameters for your trading risk management
                </SheetDescription>
              </SheetHeader>
              <RiskProfileEditor 
                onSave={() => {
                  setIsCreating(false);
                  fetchProfiles();
                }}
                onCancel={() => setIsCreating(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {!loading && profiles.length === 0 && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>No Risk Profiles</AlertTitle>
          <AlertDescription>
            You don't have any risk profiles yet. We'll create some default ones for you momentarily.
          </AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded-md w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded-md w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded-md"></div>
                  <div className="h-4 bg-muted rounded-md"></div>
                  <div className="h-4 bg-muted rounded-md"></div>
                  <div className="h-4 bg-muted rounded-md"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <RiskProfileCard
              key={profile.id}
              profile={profile}
              onUpdate={fetchProfiles}
              onDelete={fetchProfiles}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Management Guidelines</CardTitle>
            <CardDescription>
              Best practices for managing trading risk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Position Sizing</h4>
              <p className="text-sm text-muted-foreground">
                Never risk more than 1-2% of your capital on a single trade. Position size should be determined by your stop loss level and risk tolerance.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Stop Loss Management</h4>
              <p className="text-sm text-muted-foreground">
                Always use stop losses to protect your capital. Consider trailing stops to lock in profits when trades move in your favor.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Diversification</h4>
              <p className="text-sm text-muted-foreground">
                Avoid overexposure to a single asset or sector. Diversifying your portfolio reduces overall risk.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Circuit Breakers</h4>
              <p className="text-sm text-muted-foreground">
                Implement rules to stop trading during adverse conditions, such as excessive market volatility or after reaching a daily loss limit.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
