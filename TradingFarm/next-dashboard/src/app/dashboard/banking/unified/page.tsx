'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, Clock, ArrowRightLeft, Wallet } from "lucide-react";

export default function UnifiedBankingDashboardPage() {
  // This would normally be fetched from your API
  const accountsData = {
    totalBalance: '$143,568.20',
    activeAccounts: 5,
    pendingTransactions: 3,
    lastSync: '5 mins ago'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unified Banking</h1>
        <p className="text-muted-foreground">
          Manage all your financial accounts, wallets, and transactions in one place.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountsData.totalBalance}</div>
            <p className="text-xs text-muted-foreground">
              Across all accounts and wallets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountsData.activeAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Connected and operational
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountsData.pendingTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Synced</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountsData.lastSync}</div>
            <p className="text-xs text-muted-foreground">
              All accounts up to date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different banking functions */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Accounts Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Overview</CardTitle>
              <CardDescription>
                View and manage all your connected financial accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for Accounts Overview component that will be imported from the actual component */}
                <p className="text-sm text-muted-foreground">
                  Your accounts overview will be displayed here once the integration is complete. 
                  This will include wallet balances, exchange accounts, and banking connections.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                View and manage your recent financial activities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for Transactions component */}
                <p className="text-sm text-muted-foreground">
                  Your recent transactions will be displayed here once the integration is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfers</CardTitle>
              <CardDescription>
                Transfer funds between accounts and external wallets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for Transfers component */}
                <p className="text-sm text-muted-foreground">
                  Fund transfer functionality will be available here once the integration is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Banking Settings</CardTitle>
              <CardDescription>
                Configure your banking preferences and security settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for Settings component */}
                <p className="text-sm text-muted-foreground">
                  Banking settings will be displayed here once the integration is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
