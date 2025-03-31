import React from 'react';
import { Metadata } from 'next';
import AdvancedOrderForm from '@/components/orders/advanced-order-form';
import { createServerClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { ChevronRight, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Advanced Order | Trading Farm',
  description: 'Create advanced trading orders with comprehensive risk management',
};

async function getActiveStrategies() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('strategies')
    .select('id, name, description, farm_id')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }

  return data || [];
}

async function getActiveFarms() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('farms')
    .select('id, name, description')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching farms:', error);
    return [];
  }

  return data || [];
}

export default async function CreateAdvancedOrderPage({
  searchParams,
}: {
  searchParams: { farm_id?: string; agent_id?: string; strategy_id?: string };
}) {
  const { farm_id, agent_id, strategy_id } = searchParams;

  // If no farm_id is provided, fetch the first active farm
  if (!farm_id) {
    const farms = await getActiveFarms();
    if (farms.length === 0) {
      // No active farms found, redirect to create farm page
      return redirect('/farms/create');
    }
    // Redirect to the same page but with the first farm selected
    return redirect(`/trading/orders/create?farm_id=${farms[0].id}`);
  }

  // Fetch farm details
  const supabase = await createServerClient();
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('id, name, description')
    .eq('id', farm_id)
    .single();

  if (farmError || !farm) {
    console.error('Error fetching farm:', farmError);
    return notFound();
  }

  // If agent_id is provided, fetch agent details
  let agent = null;
  if (agent_id) {
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('id, name, description')
      .eq('id', agent_id)
      .single();

    if (!agentError && agentData) {
      agent = agentData;
    }
  }

  // If strategy_id is provided, fetch strategy details
  let strategy = null;
  if (strategy_id) {
    const { data: strategyData, error: strategyError } = await supabase
      .from('strategies')
      .select('id, name, description')
      .eq('id', strategy_id)
      .single();

    if (!strategyError && strategyData) {
      strategy = strategyData;
    }
  }

  // Fetch active strategies for the selected farm
  const strategies = await getActiveStrategies();
  const farmStrategies = strategies.filter(s => s.farm_id === farm_id);

  return (
    <main className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/trading">Trading</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/trading/orders">Orders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>Create Advanced Order</BreadcrumbItem>
        </Breadcrumb>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Create Advanced Order</CardTitle>
            <CardDescription>
              {agent ? (
                <>
                  Creating order for agent <span className="font-medium">{agent.name}</span> in farm{' '}
                  <span className="font-medium">{farm.name}</span>
                </>
              ) : (
                <>Creating order for farm <span className="font-medium">{farm.name}</span></>
              )}
              {strategy && (
                <>
                  {' '}
                  using strategy <span className="font-medium">{strategy.name}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdvancedOrderForm 
              farmId={farm_id} 
              agentId={agent_id} 
              strategyId={strategy_id} 
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
