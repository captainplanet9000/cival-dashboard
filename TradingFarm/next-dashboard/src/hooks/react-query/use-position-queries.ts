import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

// Position filter parameters
export interface PositionFilters {
  farmId?: string;
  exchange?: string;
  symbol?: string;
  direction?: 'long' | 'short';
  status?: 'open' | 'closed';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Position entity interface
export interface Position {
  id: string;
  farmId: string;
  exchange: string;
  symbol: string;
  direction: 'long' | 'short';
  size: number;
  entryPrice: number;
  liquidationPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercentage?: number;
  realizedPnl?: number;
  realizedPnlPercentage?: number;
  margin?: number;
  leverage?: number;
  openDate: string;
  closeDate?: string;
  status: 'open' | 'closed';
  reason?: string;
  agentId?: string;
  strategyId?: string;
}

// Position list response with pagination
export interface PositionListResponse {
  positions: Position[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Hook to fetch a paginated list of positions with optional filtering
 */
export function usePositions(filters: PositionFilters = {}) {
  return useQuery<PositionListResponse>({
    queryKey: queryKeys.positions.list(filters),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getPositions(filters);
      
      // For now, return mock data
      const positions: Position[] = Array.from({ length: 20 }).map((_, index) => ({
        id: `pos-${index + 1}`,
        farmId: filters.farmId || 'farm-1',
        exchange: ['Bybit', 'Binance', 'Coinbase'][Math.floor(Math.random() * 3)],
        symbol: ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)],
        direction: Math.random() > 0.5 ? 'long' : 'short',
        size: Math.random() * 50000,
        entryPrice: 30000 + Math.random() * 5000,
        liquidationPrice: Math.random() > 0.5 ? 25000 + Math.random() * 5000 : undefined,
        takeProfit: Math.random() > 0.5 ? 35000 + Math.random() * 5000 : undefined,
        stopLoss: Math.random() > 0.5 ? 28000 + Math.random() * 2000 : undefined,
        unrealizedPnl: Math.random() * 2000 - 1000,
        unrealizedPnlPercentage: Math.random() * 20 - 10,
        realizedPnl: Math.random() > 0.7 ? Math.random() * 2000 - 1000 : undefined,
        realizedPnlPercentage: Math.random() > 0.7 ? Math.random() * 20 - 10 : undefined,
        margin: Math.random() * 10000,
        leverage: Math.floor(Math.random() * 10) + 1,
        openDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        closeDate: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        status: Math.random() > 0.6 ? 'closed' : 'open',
        reason: Math.random() > 0.6 ? ['Take Profit', 'Stop Loss', 'Manual Close', 'System Close'][Math.floor(Math.random() * 4)] : undefined,
        agentId: Math.random() > 0.5 ? `agent-${Math.floor(Math.random() * 5) + 1}` : undefined,
        strategyId: Math.random() > 0.5 ? `strategy-${Math.floor(Math.random() * 3) + 1}` : undefined,
      }));
      
      // Apply filters
      let filteredPositions = positions;
      
      if (filters.exchange) {
        filteredPositions = filteredPositions.filter(p => p.exchange === filters.exchange);
      }
      
      if (filters.symbol) {
        filteredPositions = filteredPositions.filter(p => p.symbol === filters.symbol);
      }
      
      if (filters.direction) {
        filteredPositions = filteredPositions.filter(p => p.direction === filters.direction);
      }
      
      if (filters.status) {
        filteredPositions = filteredPositions.filter(p => p.status === filters.status);
      }
      
      if (filters.startDate) {
        filteredPositions = filteredPositions.filter(p => p.openDate >= filters.startDate!);
      }
      
      if (filters.endDate) {
        filteredPositions = filteredPositions.filter(p => p.openDate <= filters.endDate!);
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredPositions.sort((a: any, b: any) => {
          const aValue = a[filters.sortBy!];
          const bValue = b[filters.sortBy!];
          
          if (aValue < bValue) return filters.sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return filters.sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      // Calculate pagination values
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const total = filteredPositions.length;
      const totalPages = Math.ceil(total / pageSize);
      
      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedPositions = filteredPositions.slice(start, end);
      
      return {
        positions: paginatedPositions,
        total,
        page,
        pageSize,
        totalPages,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a single position by ID
 */
export function usePosition(id: string) {
  return useQuery<Position>({
    queryKey: queryKeys.positions.detail(id),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getPosition(id);
      
      // For now, return mock data
      return {
        id,
        farmId: 'farm-1',
        exchange: ['Bybit', 'Binance', 'Coinbase'][Math.floor(Math.random() * 3)],
        symbol: ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)],
        direction: Math.random() > 0.5 ? 'long' : 'short',
        size: Math.random() * 50000,
        entryPrice: 30000 + Math.random() * 5000,
        liquidationPrice: Math.random() > 0.5 ? 25000 + Math.random() * 5000 : undefined,
        takeProfit: Math.random() > 0.5 ? 35000 + Math.random() * 5000 : undefined,
        stopLoss: Math.random() > 0.5 ? 28000 + Math.random() * 2000 : undefined,
        unrealizedPnl: Math.random() * 2000 - 1000,
        unrealizedPnlPercentage: Math.random() * 20 - 10,
        realizedPnl: Math.random() > 0.7 ? Math.random() * 2000 - 1000 : undefined,
        realizedPnlPercentage: Math.random() > 0.7 ? Math.random() * 20 - 10 : undefined,
        margin: Math.random() * 10000,
        leverage: Math.floor(Math.random() * 10) + 1,
        openDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        closeDate: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        status: Math.random() > 0.6 ? 'closed' : 'open',
        reason: Math.random() > 0.6 ? ['Take Profit', 'Stop Loss', 'Manual Close', 'System Close'][Math.floor(Math.random() * 4)] : undefined,
        agentId: Math.random() > 0.5 ? `agent-${Math.floor(Math.random() * 5) + 1}` : undefined,
        strategyId: Math.random() > 0.5 ? `strategy-${Math.floor(Math.random() * 3) + 1}` : undefined,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch all positions for a specific farm
 */
export function useFarmPositions(farmId: string, filters: Omit<PositionFilters, 'farmId'> = {}) {
  return usePositions({ ...filters, farmId });
}

/**
 * Hook to fetch all positions for a specific agent
 */
export function useAgentPositions(agentId: string, filters: Omit<PositionFilters, 'agentId'> = {}) {
  return useQuery<Position[]>({
    queryKey: queryKeys.positions.list({ ...filters, agentId }),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getAgentPositions(agentId, filters);
      
      // For now, return mock data filtered by agentId
      const { positions } = await usePositions({ ...filters })
        .queryFn();
      
      return positions.filter(p => p.agentId === agentId);
    },
    staleTime: 30000, // 30 seconds
  });
}
