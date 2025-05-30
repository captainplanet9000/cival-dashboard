import { useEffect, useState } from 'react';
import { getHyperLiquidAnalytics } from '@/services/exchanges/hyperliquid-api-service';

export function useHyperLiquidAnalytics(address?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pnl, setPnl] = useState<{ day: string } | null>(null);
  const [openInterest, setOpenInterest] = useState<string | null>(null);
  const [fundingRates, setFundingRates] = useState<{ current: string; next: string } | null>(null);
  const [liquidationRisk, setLiquidationRisk] = useState<string | null>(null);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    getHyperLiquidAnalytics(address)
      .then((data) => {
        setPnl(data.pnl);
        setOpenInterest(data.openInterest);
        setFundingRates(data.fundingRates);
        setLiquidationRisk(data.liquidationRisk);
        setTradeHistory(data.tradeHistory);
      })
      .catch((e) => setError(e.message || 'Failed to fetch analytics'))
      .finally(() => setLoading(false));
  }, [address]);

  return {
    pnl,
    openInterest,
    fundingRates,
    liquidationRisk,
    tradeHistory,
    loading,
    error,
  };
}
