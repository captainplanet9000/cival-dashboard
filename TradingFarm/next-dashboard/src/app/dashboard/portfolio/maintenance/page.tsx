import React from 'react';
const { Suspense } = React;
import { Metadata } from 'next';
import { createServerClient } from '@/utils/supabase/server';
import PortfolioMaintenance from '@/components/portfolio/PortfolioMaintenance';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Portfolio Maintenance',
  description: 'Automated portfolio maintenance and rebalancing',
};

interface MaintenancePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function PortfolioMaintenanceLoader() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const supabase = await createServerClient();
  
  // Get the portfolio ID from search params if available
  const portfolioId = searchParams.id?.toString();
  
  // Get user session
  const { data: { session } } = await supabase.auth.getSession();
  
  // If no portfolio ID is provided, show all portfolios for the user
  let portfolioName = 'All Portfolios';
  
  if (portfolioId) {
    try {
      // Get portfolio name if specific portfolio is selected
      // Using any type to bypass TypeScript errors until the database schema is updated 
      const { data: portfolio } = await supabase
        .from('portfolios' as any)
        .select('name')
        .eq('id', portfolioId)
        .eq('user_id', session?.user?.id || '')
        .single();
        
      if (portfolio && 'name' in portfolio) {
        portfolioName = portfolio.name as string;
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      // Continue with default portfolio name
    }
  }
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Portfolio Maintenance"
        subheading={`Automated maintenance and rebalancing for ${portfolioName}`}
      />
      
      <div className="grid gap-4 md:gap-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Schedule</CardTitle>
              <CardDescription>Automatically rebalance on schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Portfolio maintenance runs automatically based on your rebalancing frequency settings. You can 
                manually trigger rebalancing checks or execute pending transactions.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Drift Monitoring</CardTitle>
              <CardDescription>Track allocation drift and rebalance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The system continuously monitors your portfolios for allocation drift against your set
                thresholds, and automatically creates rebalancing transactions when needed.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Suspense fallback={<PortfolioMaintenanceLoader />}>
          <PortfolioMaintenance portfolioId={portfolioId} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
