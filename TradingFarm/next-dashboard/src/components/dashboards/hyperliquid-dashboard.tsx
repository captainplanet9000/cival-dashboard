import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHyperLiquidAnalytics } from '@/utils/analytics/hyperliquid-analytics';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

/**
 * HyperLiquidDashboard
 * Specialized dashboard for HyperLiquid perpetual futures trading.
 * Shows custom analytics, risk metrics, and wallet-based auth status.
 */
export const HyperLiquidDashboard: React.FC = () => {
  const { wallet, isConnected } = useWallet();
  const {
    pnl,
    openInterest,
    fundingRates,
    liquidationRisk,
    tradeHistory,
    loading,
    error,
  } = useHyperLiquidAnalytics(wallet?.address);

  return (
    <Card className="w-full max-w-4xl mx-auto mt-6 shadow-lg border border-blue-400">
      <CardHeader className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <img
            src="/icons/hyperliquid.svg"
            alt="HyperLiquid"
            className="w-7 h-7 inline-block"
          />
          HyperLiquid Perpetuals Dashboard
        </h2>
        <div className="text-xs text-muted-foreground">
          Wallet Status: {isConnected ? (
            <span className="text-green-600 font-semibold">Connected</span>
          ) : (
            <span className="text-red-500 font-semibold">Not Connected</span>
          )}
          {wallet?.address && (
            <span className="ml-2 text-blue-800">{wallet.address}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
            <TabsTrigger value="history">Trade History</TabsTrigger>
            <TabsTrigger value="funding">Funding Rates</TabsTrigger>
          </TabsList>
          <TabsContent value="performance">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="PnL (24h)" value={pnl?.day ?? '--'} loading={loading} />
              <MetricCard label="Open Interest" value={openInterest ?? '--'} loading={loading} />
            </div>
          </TabsContent>
          <TabsContent value="risk">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Liquidation Risk" value={liquidationRisk ?? '--'} loading={loading} />
              {/* Add more risk metrics as needed */}
            </div>
          </TabsContent>
          <TabsContent value="history">
            <div className="overflow-x-auto max-h-64">
              {tradeHistory && tradeHistory.length > 0 ? (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="p-2">Time</th>
                      <th className="p-2">Pair</th>
                      <th className="p-2">Side</th>
                      <th className="p-2">Size</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade, i) => (
                      <tr key={i} className="even:bg-blue-50">
                        <td className="p-2">{trade.time}</td>
                        <td className="p-2">{trade.pair}</td>
                        <td className={cn('p-2 font-semibold', trade.side === 'buy' ? 'text-green-600' : 'text-red-500')}>{trade.side}</td>
                        <td className="p-2">{trade.size}</td>
                        <td className="p-2">{trade.price}</td>
                        <td className="p-2">{trade.pnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : loading ? (
                <div>Loading...</div>
              ) : (
                <div className="text-muted-foreground">No trades found.</div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="funding">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Funding Rate" value={fundingRates?.current ?? '--'} loading={loading} />
              <MetricCard label="Next Funding" value={fundingRates?.next ?? '--'} loading={loading} />
            </div>
          </TabsContent>
        </Tabs>
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </CardContent>
    </Card>
  );
};

/**
 * MetricCard - Simple metric display for dashboard
 */
const MetricCard: React.FC<{ label: string; value: React.ReactNode; loading?: boolean }> = ({ label, value, loading }) => (
  <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 border border-blue-100">
    <span className="text-sm text-blue-800 font-semibold">{label}</span>
    <span className="text-xl font-bold">{loading ? <span className="animate-pulse">--</span> : value}</span>
  </div>
);

export default HyperLiquidDashboard;
