'use client';

import React, { useState, useEffect } from 'react';
import { OrderEntry } from './OrderEntry';
import { OrdersList } from './OrdersList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GridLoader } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';

interface OrderManagementProps {
  farmId?: string;
  defaultSymbol?: string;
}

export function OrderManagement({ farmId, defaultSymbol = 'BTC/USDT' }: OrderManagementProps) {
  const [exchangeCredentials, setExchangeCredentials] = useState<any[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load exchange credentials
  useEffect(() => {
    const loadCredentials = async () => {
      setLoading(true);
      
      try {
        const supabase = createBrowserClient();
        
        const { data, error } = await supabase
          .from('exchange_credentials')
          .select('*')
          .eq('is_active', true);
        
        if (error) throw error;
        
        setExchangeCredentials(data || []);
        
        // Select the first exchange by default if available
        if (data && data.length > 0 && !selectedExchangeId) {
          setSelectedExchangeId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading exchange credentials:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCredentials();
  }, []);

  // Handle order creation
  const handleOrderCreated = () => {
    // Refresh the orders list
    setRefreshTrigger(prev => prev + 1);
  };

  // If no exchange credentials are available, show a message
  if (!loading && exchangeCredentials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            Connect an exchange to start trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 border rounded-md">
            <p className="text-muted-foreground mb-4">
              No exchange connections found. Please connect an exchange in the Wallet section.
            </p>
            <a 
              href="/dashboard/wallet" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground"
            >
              Go to Wallet
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // While loading, show a loading indicator
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <GridLoader className="h-8 w-8 animate-spin opacity-30" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        {selectedExchangeId && (
          <OrderEntry 
            defaultSymbol={defaultSymbol}
            exchangeCredentialId={selectedExchangeId}
            onOrderCreated={handleOrderCreated}
          />
        )}
      </div>
      
      <div className="md:col-span-2">
        {selectedExchangeId && (
          <OrdersList 
            exchangeCredentialId={selectedExchangeId}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
}
