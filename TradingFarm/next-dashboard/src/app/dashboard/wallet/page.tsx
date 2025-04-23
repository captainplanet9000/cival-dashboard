import { Metadata } from 'next';
import { WalletBalances } from '@/components/wallet/WalletBalances';
import { MarketPriceTicker } from '@/components/market/MarketPriceTicker';
import { ConnectExchangeModal } from '@/components/wallet/ConnectExchangeModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Wallet - Trading Farm',
  description: 'View and manage your exchange wallets and balances',
};

export default function WalletPage() {
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            View and manage your exchange connections and balances
          </p>
        </div>
        <ConnectExchangeModal />
      </div>
      
      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="balances">Wallet Balances</TabsTrigger>
          <TabsTrigger value="markets">Market Prices</TabsTrigger>
        </TabsList>
        <TabsContent value="balances" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Balances</CardTitle>
              <CardDescription>
                Your available balances across all connected exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletBalances />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="markets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Prices</CardTitle>
              <CardDescription>
                Real-time market data for major cryptocurrencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketPriceTicker />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
