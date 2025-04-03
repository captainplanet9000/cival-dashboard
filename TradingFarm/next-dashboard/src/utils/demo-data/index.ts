/**
 * Demo Data Provider
 * 
 * This module provides mock data for development and fallback scenarios
 * when the application cannot connect to Supabase.
 */

import { Strategy } from '@/types/strategy';
import { Farm } from '@/types/farm';
import { KnowledgeDocument } from '@/types/knowledge';
import { Agent } from '@/types/agent';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || true;

/**
 * Demo strategies for the Trading Farm dashboard
 */
export const demoStrategies: Strategy[] = [
  { id: 1, name: 'EMA Crossover', category: 'momentum', status: 'active', type: 'Technical', performance: 12.5, created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 2, name: 'RSI Reversal', category: 'reversal', status: 'active', type: 'Technical', performance: 8.2, created_at: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 3, name: 'Bollinger Squeeze', category: 'volatility', status: 'paused', type: 'Technical', performance: 15.7, created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: 4, name: 'MACD Divergence', category: 'trend', status: 'testing', type: 'Technical', performance: 5.3, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 5, name: 'Sentiment Analysis', category: 'fundamental', status: 'active', type: 'AI-Powered', performance: 18.9, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 6, name: 'News Event Arbitrage', category: 'event', status: 'active', type: 'AI-Powered', performance: 21.2, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 7, name: 'Orderbook Imbalance', category: 'market structure', status: 'active', type: 'Technical', performance: 9.1, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: 8, name: 'Funding Rate Arbitrage', category: 'arbitrage', status: 'failed', type: 'Quantitative', performance: -2.8, created_at: new Date(Date.now() - 86400000 * 12).toISOString() }
];

/**
 * Demo farms for the Trading Farm dashboard
 */
export const demoFarms: Farm[] = [
  { id: 1, name: 'Alpha Bitcoin Farm', description: 'Bitcoin-focused momentum trading farm', status: 'active', goal_percentage: 78, assets: ['BTC'], created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 2, name: 'Ethereum Swing Trader', description: 'Ethereum trading with medium-term positions', status: 'active', goal_percentage: 62, assets: ['ETH'], created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
  { id: 3, name: 'Altcoin Diversified', description: 'Diversified trading across promising L1/L2 chains', status: 'paused', goal_percentage: 45, assets: ['SOL', 'AVAX', 'MATIC'], created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: 4, name: 'DeFi Opportunities', description: 'Yield farming and DeFi protocol exploitation', status: 'active', goal_percentage: 91, assets: ['AAVE', 'UNI', 'COMP'], created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
];

/**
 * Demo knowledge documents for the Trading Farm dashboard
 */
export const demoKnowledgeDocuments: KnowledgeDocument[] = [
  { id: 1, title: 'Bitcoin Technical Analysis Framework', category: 'market analysis', content: 'Comprehensive technical analysis framework for Bitcoin price action...', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 2, title: 'EMA Crossover Strategy Guide', category: 'strategy', content: 'Detailed explanation of EMA crossover strategy implementation...', created_at: new Date(Date.now() - 86400000 * 28).toISOString() },
  { id: 3, title: 'Risk Management Best Practices', category: 'risk', content: 'Guidelines for implementing robust risk management in trading farms...', created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
  { id: 4, title: 'Market Structure Analysis', category: 'market analysis', content: 'Understanding market structure and order flow analysis techniques...', created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: 5, title: 'Agent Coordination Principles', category: 'agents', content: 'Best practices for coordinating multiple trading agents in a farm...', created_at: new Date(Date.now() - 86400000 * 15).toISOString() }
];

/**
 * Demo agents for the Trading Farm dashboard
 */
export const demoAgents: Agent[] = [
  { id: 1, name: 'Alpha Seeker', role: 'Market Scout', status: 'active', farm_id: 1, strategy_id: 1, performance: 12.8, created_at: new Date(Date.now() - 86400000 * 28).toISOString() },
  { id: 2, name: 'Trend Rider', role: 'Position Manager', status: 'active', farm_id: 1, strategy_id: 3, performance: 8.9, created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
  { id: 3, name: 'News Watcher', role: 'Event Analyzer', status: 'paused', farm_id: 2, strategy_id: 6, performance: 15.3, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: 4, name: 'Risk Guardian', role: 'Risk Manager', status: 'active', farm_id: 3, strategy_id: null, performance: 0, created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: 5, name: 'DeFi Explorer', role: 'Yield Farmer', status: 'active', farm_id: 4, strategy_id: 2, performance: 21.5, created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
];

/**
 * Hook to use demo data with a simulated loading delay
 * @param dataType The type of demo data to fetch
 * @param delay Simulated loading delay in ms (default: 1000)
 * @returns Object with isLoading and data properties
 */
export function useDemoData<T>(
  dataType: 'strategies' | 'farms' | 'knowledge' | 'agents', 
  delay: number = 800
): { isLoading: boolean; data: T[]; error: string | null } {
  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState<T[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        switch (dataType) {
          case 'strategies':
            setData(demoStrategies as unknown as T[]);
            break;
          case 'farms':
            setData(demoFarms as unknown as T[]);
            break;
          case 'knowledge':
            setData(demoKnowledgeDocuments as unknown as T[]);
            break;
          case 'agents':
            setData(demoAgents as unknown as T[]);
            break;
          default:
            setError('Unknown demo data type requested');
            break;
        }
      } catch (err) {
        setError('Error loading demo data');
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [dataType, delay]);

  return { isLoading, data, error };
}

/**
 * Function to get demo data synchronously
 * @param dataType The type of demo data to fetch
 * @returns Array of demo data items
 */
export function getDemoData<T>(dataType: 'strategies' | 'farms' | 'knowledge' | 'agents'): T[] {
  switch (dataType) {
    case 'strategies':
      return demoStrategies as unknown as T[];
    case 'farms':
      return demoFarms as unknown as T[];
    case 'knowledge':
      return demoKnowledgeDocuments as unknown as T[];
    case 'agents':
      return demoAgents as unknown as T[];
    default:
      console.error('Unknown demo data type requested');
      return [] as T[];
  }
}
