import { create } from 'zustand';
import { Farm } from '@/schemas/farm-schemas';
import { BaseState, BaseActions, FilterOption, SortDirection } from './types';

/**
 * Farm filter options
 */
export interface FarmFilters {
  status: string[];
  searchQuery: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
}

/**
 * Farm sort options
 */
export interface FarmSort {
  field: 'name' | 'created_at' | 'updated_at' | 'roi' | 'profit';
  direction: SortDirection;
}

/**
 * Farm store state interface
 */
interface FarmState extends BaseState {
  selectedFarmId: number | null;
  filters: FarmFilters;
  sort: FarmSort;
  view: 'grid' | 'list';
  filterOptions: {
    status: FilterOption[];
  };
}

/**
 * Farm store actions interface
 */
interface FarmActions extends BaseActions {
  // Selection actions
  setSelectedFarmId: (id: number | null) => void;
  
  // Filter actions
  setStatusFilter: (statuses: string[]) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (from: Date | null, to: Date | null) => void;
  resetFilters: () => void;
  
  // Sort actions
  setSort: (field: FarmSort['field'], direction: SortDirection) => void;
  
  // View actions
  setView: (view: 'grid' | 'list') => void;
}

/**
 * Combined Farm store type
 */
type FarmStore = FarmState & FarmActions;

/**
 * Initial farm state
 */
const initialState: FarmState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  selectedFarmId: null,
  filters: {
    status: [],
    searchQuery: '',
    dateRange: {
      from: null,
      to: null,
    },
  },
  sort: {
    field: 'created_at',
    direction: 'desc',
  },
  view: 'grid',
  filterOptions: {
    status: [
      { id: 'active', label: 'Active', value: 'active' },
      { id: 'inactive', label: 'Inactive', value: 'inactive' },
      { id: 'paused', label: 'Paused', value: 'paused' },
    ],
  },
};

/**
 * Create farm store
 */
export const useFarmStore = create<FarmStore>()((set) => ({
  ...initialState,
  
  // Base actions
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
  
  // Selection actions
  setSelectedFarmId: (selectedFarmId) => set({ selectedFarmId }),
  
  // Filter actions
  setStatusFilter: (status) => set((state) => ({
    filters: {
      ...state.filters,
      status,
    },
  })),
  setSearchQuery: (searchQuery) => set((state) => ({
    filters: {
      ...state.filters,
      searchQuery,
    },
  })),
  setDateRange: (from, to) => set((state) => ({
    filters: {
      ...state.filters,
      dateRange: {
        from,
        to,
      },
    },
  })),
  resetFilters: () => set((state) => ({
    filters: initialState.filters,
  })),
  
  // Sort actions
  setSort: (field, direction) => set({
    sort: {
      field,
      direction,
    },
  }),
  
  // View actions
  setView: (view) => set({ view }),
}));
