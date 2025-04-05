import { v4 as uuidv4 } from 'uuid';
import { 
  mockAgents, 
  createMockAgent, 
  MockAgent 
} from '../data/agentData';
import { 
  mockFarms, 
  createMockFarm, 
  MockFarm 
} from '../data/farmData';
import {
  mockAgentStorages,
  mockFarmStorages,
  mockStorageAllocations,
  mockStorageTransactions,
  mockStorageAuditLogs,
  createMockAgentStorage,
  createMockFarmStorage,
  createMockStorageAllocation,
  createMockStorageTransaction,
  createMockStorageAuditLog,
  MockAgentStorage,
  MockFarmStorage,
  MockStorageAllocation,
  MockStorageTransaction,
  MockStorageAuditLog
} from '../data/storageData';
import {
  mockVaultMasters,
  mockVaultAccounts,
  mockVaultTransactions,
  mockSecurityPolicies,
  mockVaultAuditLogs,
  createMockVaultMaster,
  createMockVaultAccount,
  createMockVaultTransaction,
  createMockSecurityPolicy,
  createMockVaultAuditLog,
  updateMockTransactionStatus,
  MockVaultMaster,
  MockVaultAccount,
  MockVaultTransaction,
  MockSecurityPolicy,
  MockVaultAuditLog
} from '../data/vaultData';
import { CONFIG, simulateLatency, simulateFailure } from '@/config/mockConfig';

// Generic types for query responses
type QueryResponse<T> = {
  data: T | null;
  error: Error | null;
};

// Helper to convert snake_case names to camelCase
const snakeToCamel = (str: string): string => 
  str.replace(/_([a-z])/g, (match, group) => group.toUpperCase());

// Helper to convert objects from snake_case to camelCase
const convertToCamelCase = <T>(obj: any): T => {
  if (!obj || typeof obj !== 'object') return obj as T;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertToCamelCase(item)) as unknown as T;
  }
  
  const camelObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      camelObj[camelKey] = obj[key];
    }
  }
  
  return camelObj as T;
};

// Mock Supabase query builder
class QueryBuilder<T> {
  private table: string;
  private conditions: { field: string; operator: string; value: any }[] = [];
  private selectedFields: string[] | null = null;
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private orderByField: string | null = null;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private isSingleMode = false;
  private tables: Record<string, any[]> = {
    agents: mockAgents,
    farms: mockFarms,
    agent_storage: mockAgentStorages,
    farm_storage: mockFarmStorages,
    storage_allocation: mockStorageAllocations,
    storage_transactions: mockStorageTransactions,
    storage_audit_log: mockStorageAuditLogs,
    vault_master: mockVaultMasters,
    vault_accounts: mockVaultAccounts,
    vault_transactions: mockVaultTransactions,
    security_policies: mockSecurityPolicies,
    vault_audit_log: mockVaultAuditLogs
  };
  
  constructor(table: string) {
    this.table = table;
  }
  
  // Filter operations
  public eq(field: string, value: any): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'eq', value });
    return this;
  }
  
  public neq(field: string, value: any): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'neq', value });
    return this;
  }
  
  public gt(field: string, value: any): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'gt', value });
    return this;
  }
  
  public gte(field: string, value: any): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'gte', value });
    return this;
  }
  
  public lt(field: string, value: any): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'lt', value });
    return this;
  }
  
  public lte(field: string, value: any): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'lte', value });
    return this;
  }
  
  public in(field: string, values: any[]): QueryBuilder<T> {
    this.conditions.push({ field, operator: 'in', value: values });
    return this;
  }
  
  public or(query: string): QueryBuilder<T> {
    // Parse simplified OR query for mocking purposes
    // Example format: "source_id.eq.abc,destination_id.eq.abc"
    const parts = query.split(',');
    this.conditions.push({ field: '_or', operator: 'custom', value: parts });
    return this;
  }
  
  // Selection operations
  public select(fields?: string): QueryBuilder<T> {
    if (fields) {
      this.selectedFields = fields.split(',').map(f => f.trim());
    }
    return this;
  }
  
  // Limit and pagination
  public limit(value: number): QueryBuilder<T> {
    this.limitValue = value;
    return this;
  }
  
  public range(from: number, to: number): QueryBuilder<T> {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }
  
  // Ordering
  public order(field: string, { ascending = true }: { ascending: boolean }): QueryBuilder<T> {
    this.orderByField = field;
    this.orderDirection = ascending ? 'asc' : 'desc';
    return this;
  }
  
  // Result operations
  public single(): Promise<QueryResponse<T>> {
    this.isSingleMode = true;
    return this.execute();
  }
  
  // Execute the query
  public async execute(): Promise<QueryResponse<T>> {
    try {
      // Simulate network latency
      await simulateLatency('supabase');
      
      // Simulate random failures
      simulateFailure('supabase', `Error executing query on ${this.table}`);
      
      // Get the data from the mock tables
      const tableData = this.tables[this.table] || [];
      
      // Apply filters
      let filteredData = [...tableData];
      for (const condition of this.conditions) {
        if (condition.field === '_or') {
          // Handle OR conditions
          const orParts = condition.value as string[];
          filteredData = filteredData.filter(item => {
            return orParts.some(part => {
              const [field, op, value] = part.split('.');
              if (op === 'eq') {
                return item[field] === value;
              }
              return false;
            });
          });
        } else {
          // Handle regular conditions
          filteredData = filteredData.filter(item => {
            switch (condition.operator) {
              case 'eq':
                return item[condition.field] === condition.value;
              case 'neq':
                return item[condition.field] !== condition.value;
              case 'gt':
                return item[condition.field] > condition.value;
              case 'gte':
                return item[condition.field] >= condition.value;
              case 'lt':
                return item[condition.field] < condition.value;
              case 'lte':
                return item[condition.field] <= condition.value;
              case 'in':
                return (condition.value as any[]).includes(item[condition.field]);
              default:
                return true;
            }
          });
        }
      }
      
      // Apply ordering
      if (this.orderByField) {
        filteredData.sort((a, b) => {
          if (a[this.orderByField!] < b[this.orderByField!]) {
            return this.orderDirection === 'asc' ? -1 : 1;
          }
          if (a[this.orderByField!] > b[this.orderByField!]) {
            return this.orderDirection === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      
      // Apply pagination
      if (this.offsetValue !== null) {
        filteredData = filteredData.slice(this.offsetValue);
      }
      
      if (this.limitValue !== null) {
        filteredData = filteredData.slice(0, this.limitValue);
      }
      
      // Return single item or array
      if (this.isSingleMode) {
        return {
          data: filteredData.length > 0 ? filteredData[0] : null,
          error: null
        };
      }
      
      return {
        data: filteredData,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }
}

// Mock Supabase mutation builder
class MutationBuilder<T> {
  private table: string;
  private conditions: { field: string; operator: string; value: any }[] = [];
  private insertData: any = null;
  private updateData: any = null;
  private isSingleMode = false;
  private defaultCreator: any;
  private tables: Record<string, any[]> = {
    agents: mockAgents,
    farms: mockFarms,
    agent_storage: mockAgentStorages,
    farm_storage: mockFarmStorages,
    storage_allocation: mockStorageAllocations,
    storage_transactions: mockStorageTransactions,
    storage_audit_log: mockStorageAuditLogs,
    vault_master: mockVaultMasters,
    vault_accounts: mockVaultAccounts,
    vault_transactions: mockVaultTransactions,
    security_policies: mockSecurityPolicies,
    vault_audit_log: mockVaultAuditLogs
  };
  private creators: Record<string, Function> = {
    agents: createMockAgent,
    farms: createMockFarm,
    agent_storage: createMockAgentStorage,
    farm_storage: createMockFarmStorage,
    storage_allocation: createMockStorageAllocation,
    storage_transactions: createMockStorageTransaction,
    storage_audit_log: createMockStorageAuditLog,
    vault_master: createMockVaultMaster,
    vault_accounts: createMockVaultAccount,
    vault_transactions: createMockVaultTransaction,
    security_policies: createMockSecurityPolicy,
    vault_audit_log: createMockVaultAuditLog
  };
  
  constructor(table: string) {
    this.table = table;
    this.defaultCreator = this.creators[table];
  }
  
  // Filter operations (for update/delete)
  public eq(field: string, value: any): MutationBuilder<T> {
    this.conditions.push({ field, operator: 'eq', value });
    return this;
  }
  
  // Insert operation
  public insert(data: any): MutationBuilder<T> {
    this.insertData = data;
    return this;
  }
  
  // Update operation
  public update(data: any): MutationBuilder<T> {
    this.updateData = data;
    return this;
  }
  
  // Delete operation
  public delete(): MutationBuilder<T> {
    return this;
  }
  
  // Selection operations
  public select(fields?: string): MutationBuilder<T> {
    return this;
  }
  
  // Result operations
  public single(): Promise<QueryResponse<T>> {
    this.isSingleMode = true;
    return this.execute();
  }
  
  // Execute the mutation
  public async execute(): Promise<QueryResponse<T>> {
    try {
      // Simulate network latency
      await simulateLatency('supabase');
      
      // Simulate random failures
      simulateFailure('supabase', `Error executing mutation on ${this.table}`);
      
      const tableData = this.tables[this.table] || [];
      
      // Handle insert
      if (this.insertData) {
        let newItem;
        
        // Handle different entity types with correct creator functions
        if (this.table === 'agents' && this.defaultCreator) {
          newItem = this.defaultCreator(
            this.insertData.name,
            this.insertData.description,
            this.insertData.owner_id
          );
        } else if (this.table === 'farms' && this.defaultCreator) {
          newItem = this.defaultCreator(
            this.insertData.name,
            this.insertData.description,
            this.insertData.owner_id
          );
        } else {
          // Generic fallback for other tables
          newItem = {
            id: this.insertData.id || uuidv4(),
            ...this.insertData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          tableData.push(newItem);
        }
        
        return {
          data: this.isSingleMode ? newItem : [newItem],
          error: null
        };
      }
      
      // Handle update
      if (this.updateData) {
        // Find items to update
        const items = tableData.filter(item => {
          return this.conditions.every(condition => {
            return item[condition.field] === condition.value;
          });
        });
        
        // Update items
        for (const item of items) {
          Object.assign(item, {...this.updateData, updated_at: new Date().toISOString()});
        }
        
        return {
          data: this.isSingleMode && items.length > 0 ? items[0] : items,
          error: null
        };
      }
      
      // Handle delete
      if (!this.insertData && !this.updateData) {
        // Find indices to delete
        const indicesToDelete: number[] = [];
        
        tableData.forEach((item, index) => {
          if (this.conditions.every(condition => item[condition.field] === condition.value)) {
            indicesToDelete.push(index);
          }
        });
        
        // Delete in reverse order to avoid index shifting
        const deletedItems: any[] = [];
        for (let i = indicesToDelete.length - 1; i >= 0; i--) {
          deletedItems.push(tableData.splice(indicesToDelete[i], 1)[0]);
        }
        
        return {
          data: this.isSingleMode && deletedItems.length > 0 ? deletedItems[0] : deletedItems,
          error: null
        };
      }
      
      return {
        data: null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }
}

// Mock RPC functionality for database functions
const mockRpcFunctions: Record<string, Function> = {
  update_storage_capacity: async (args: { 
    p_storage_id: string; 
    p_storage_type: string; 
    p_new_capacity: number; 
  }) => {
    await simulateLatency('supabase');
    simulateFailure('supabase', 'Error executing RPC function update_storage_capacity');
    
    const { p_storage_id, p_storage_type, p_new_capacity } = args;
    
    if (p_storage_type === 'agent_storage') {
      const storage = mockAgentStorages.find(s => s.id === p_storage_id);
      if (storage) {
        storage.capacity = p_new_capacity;
        storage.updated_at = new Date().toISOString();
        return { data: true, error: null };
      }
    } else if (p_storage_type === 'farm_storage') {
      const storage = mockFarmStorages.find(s => s.id === p_storage_id);
      if (storage) {
        storage.capacity = p_new_capacity;
        storage.updated_at = new Date().toISOString();
        return { data: true, error: null };
      }
    }
    
    return { data: false, error: new Error('Storage not found') };
  },
  
  create_storage_allocation: async (args: {
    p_storage_id: string;
    p_storage_type: string;
    p_allocated_to_id: string;
    p_allocated_to_type: string;
    p_amount: number;
    p_purpose: string | null;
    p_start_date: string | null;
    p_end_date: string | null;
    p_metadata: Record<string, any> | null;
  }) => {
    await simulateLatency('supabase');
    simulateFailure('supabase', 'Error executing RPC function create_storage_allocation');
    
    const allocation = createMockStorageAllocation(
      args.p_storage_id,
      args.p_storage_type as any,
      args.p_allocated_to_id,
      args.p_allocated_to_type,
      args.p_amount,
      {
        purpose: args.p_purpose || undefined,
        startDate: args.p_start_date || undefined,
        endDate: args.p_end_date || undefined,
        metadata: args.p_metadata || undefined,
        isActive: true
      }
    );
    
    return { data: allocation.id, error: null };
  },
  
  update_storage_allocation_status: async (args: {
    p_allocation_id: string;
    p_is_active: boolean;
  }) => {
    await simulateLatency('supabase');
    simulateFailure('supabase', 'Error executing RPC function update_storage_allocation_status');
    
    const allocation = mockStorageAllocations.find(a => a.id === args.p_allocation_id);
    if (!allocation) {
      return { data: false, error: new Error('Allocation not found') };
    }
    
    const oldStatus = allocation.is_active;
    allocation.is_active = args.p_is_active;
    allocation.updated_at = new Date().toISOString();
    
    // Update storage used space if deactivating
    if (oldStatus && !args.p_is_active) {
      if (allocation.storage_type === 'agent_storage') {
        const storage = mockAgentStorages.find(s => s.id === allocation.storage_id);
        if (storage) {
          storage.used_space -= allocation.amount;
          storage.updated_at = new Date().toISOString();
        }
      } else if (allocation.storage_type === 'farm_storage') {
        const storage = mockFarmStorages.find(s => s.id === allocation.storage_id);
        if (storage) {
          storage.used_space -= allocation.amount;
          storage.updated_at = new Date().toISOString();
        }
      }
    }
    
    return { data: true, error: null };
  },
  
  update_vault_account_balance: async (args: {
    p_account_id: string;
    p_change_amount: number;
    p_transaction_id: string;
  }) => {
    await simulateLatency('supabase');
    simulateFailure('supabase', 'Error executing RPC function update_vault_account_balance');
    
    const account = mockVaultAccounts.find(a => a.id === args.p_account_id);
    if (!account) {
      return { data: null, error: new Error('Account not found') };
    }
    
    account.balance += args.p_change_amount;
    account.updated_at = new Date().toISOString();
    
    return { data: true, error: null };
  }
};

// Mock Auth for simple auth operations
class MockAuth {
  constructor() {}
  
  async getUser() {
    return {
      data: {
        user: {
          id: 'fake-user-id',
          email: 'user@example.com'
        }
      },
      error: null
    };
  }
}

// Main Supabase client class
export class MockSupabaseClient {
  auth: MockAuth;
  
  constructor() {
    this.auth = new MockAuth();
  }
  
  // Table query builder
  from<T>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  }
  
  // RPC function caller
  async rpc(functionName: string, params?: any): Promise<any> {
    if (mockRpcFunctions[functionName]) {
      return mockRpcFunctions[functionName](params);
    }
    
    await simulateLatency('supabase');
    return { data: null, error: new Error(`RPC function ${functionName} not implemented in mock`) };
  }
}

// Create and export a singleton instance
export const mockSupabaseClient = new MockSupabaseClient();

// Helper function to reset all mock data
export const resetAllMockData = () => {
  // Reset all data arrays
  mockAgents.length = 0;
  mockFarms.length = 0;
  mockAgentStorages.length = 0;
  mockFarmStorages.length = 0;
  mockStorageAllocations.length = 0;
  mockStorageTransactions.length = 0;
  mockStorageAuditLogs.length = 0;
  mockVaultMasters.length = 0;
  mockVaultAccounts.length = 0;
  mockVaultTransactions.length = 0;
  mockSecurityPolicies.length = 0;
  mockVaultAuditLogs.length = 0;
}; 