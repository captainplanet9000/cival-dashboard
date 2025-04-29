"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LiveTradingPanel } from '@/components/trading/LiveTradingPanel';
import { ActivePositionsTable } from '@/components/trading/ActivePositionsTable';
import { RiskManagementPanel } from '@/components/risk/RiskManagementPanel';
import { ConnectExchangeModal } from '@/components/exchange/ConnectExchangeModal';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Position } from '@/types/trading';
import { ShieldAlert, LineChart, CircleDollarSign, AlertTriangle } from 'lucide-react';

export default function LiveTradingPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>('');
  const [hasExchangeConnected, setHasExchangeConnected] = useState<boolean>(false);
  const [exchangeLoading, setExchangeLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Get the user ID
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        
        // Check if the user has any connected exchanges
        const { data: exchanges, error: exchangeError } = await supabase
          .from('exchange_credentials')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .limit(1);
        
        setHasExchangeConnected(!!exchanges && exchanges.length > 0);
        setExchangeLoading(false);
      }
    };
    
    getUser();
  }, [supabase]);
  
  const handlePositionClose = (position: Position) => {
    // In a real application, this could open a modal with more closing options
    toast({
      title: "Closing Position",
      description: `Closing ${position.symbol} position of ${position.quantity}`,
    });
  };
  
  if (exchangeLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-lg">Loading exchange data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col">
        <h2 className="text-3xl font-bold tracking-tight">Live Trading</h2>
        <p className="text-muted-foreground">Manage your exchange positions and execute trades</p>
      </div>
      
      <Separator />
      
      {!hasExchangeConnected ? (
        <Card className="border-dashed border-yellow-600/50 bg-yellow-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Connect an Exchange
            </CardTitle>
            <CardDescription>
              You need to connect to an exchange before you can trade live
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-center text-muted-foreground max-w-md">
                To start live trading, connect your exchange API keys securely. Your keys are encrypted and never shared.
              </p>
              <ConnectExchangeModal />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Tabs defaultValue="positions" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="positions" className="flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  <span>Positions</span>
                </TabsTrigger>
                <TabsTrigger value="place-order" className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4" />
                  <span>Place Order</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="positions" className="mt-6">
                <ActivePositionsTable onSelectClosePosition={handlePositionClose} />
              </TabsContent>
              
              <TabsContent value="place-order" className="mt-6">
                <LiveTradingPanel />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-medium">Risk Controls</h3>
            </div>
            
            <RiskManagementPanel userId={userId} />
          </div>
        </div>
      )}
    </div>
  );
}
