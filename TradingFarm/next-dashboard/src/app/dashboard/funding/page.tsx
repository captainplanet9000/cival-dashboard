"use client";

import React, { useState } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, DollarSign, ArrowRightLeft, Wallet, History } from "lucide-react";

import { ConnectExchangeModal } from "@/components/exchange/ConnectExchangeModal";

export default function FundingPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funding</h1>
          <p className="text-muted-foreground">
            Manage your capital, deposits, withdrawals, and transfers
          </p>
        </div>
        <div className="flex gap-2">
          <ConnectExchangeModal />
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Funds
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Capital
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12,345.67</div>
                <p className="text-xs text-muted-foreground">
                  +5.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Exchanges
                </CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Binance, Bybit, Kraken
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Transactions
                </CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">
                  1 deposit, 1 withdrawal
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fund Allocation</CardTitle>
              <CardDescription>
                Distribution of funds across exchanges and wallets
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-16 text-sm font-medium">Binance</div>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: "45%" }}></div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm">$5,555.25</div>
                    <div className="w-12 text-right text-sm text-muted-foreground">45%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-16 text-sm font-medium">Bybit</div>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: "30%" }}></div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm">$3,703.70</div>
                    <div className="w-12 text-right text-sm text-muted-foreground">30%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-16 text-sm font-medium">Kraken</div>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: "15%" }}></div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm">$1,851.85</div>
                    <div className="w-12 text-right text-sm text-muted-foreground">15%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-16 text-sm font-medium">Wallets</div>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: "10%" }}></div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm">$1,234.57</div>
                    <div className="w-12 text-right text-sm text-muted-foreground">10%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Your latest funding activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Deposit to Binance</div>
                      <div className="text-sm text-muted-foreground">April 20, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">+$1,000 USDT</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Transfer Binance to Bybit</div>
                      <div className="text-sm text-muted-foreground">April 18, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$500 USDT</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Withdrawal from Bybit</div>
                      <div className="text-sm text-muted-foreground">April 15, 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-600">-$250 USDT</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button variant="link" size="sm" onClick={() => window.location.href = "/dashboard/transactions"}>
                  View all transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>
                Add funds to your exchanges and wallets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <p className="mb-4 text-muted-foreground">Deposit functionality coming soon</p>
                <Button disabled>Deposit Funds</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="withdraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>
                Withdraw funds from your exchanges and wallets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <p className="mb-4 text-muted-foreground">Withdrawal functionality coming soon</p>
                <Button disabled>Withdraw Funds</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Funds</CardTitle>
              <CardDescription>
                Move funds between exchanges and wallets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <p className="mb-4 text-muted-foreground">Transfer functionality coming soon</p>
                <Button disabled>Transfer Funds</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage your connected exchanges and wallets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <p className="mb-4 text-muted-foreground">Account management functionality coming soon</p>
                <ConnectExchangeModal />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
