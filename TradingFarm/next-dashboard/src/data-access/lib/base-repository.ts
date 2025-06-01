/**
 * Base entity interface for all data models
 */
export interface BaseEntity {
  id?: string | number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

/**
 * Base repository options for queries
 */
export interface RepositoryOptions {
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Record<string, any>;
}

/**
 * Base repository class that all repositories extend
 */
export class BaseRepository<T extends BaseEntity> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string | number): Promise<T | null> {
    // In a real implementation, this would query the database
    console.log(`[STUB] Finding ${this.tableName} with ID: ${id}`);
    return null;
  }

  /**
   * Find all records matching the given criteria
   */
  async findAll(options: RepositoryOptions = {}): Promise<T[]> {
    // In a real implementation, this would query the database
    console.log(`[STUB] Finding all ${this.tableName} with options:`, options);
    return [];
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    // In a real implementation, this would insert into the database
    console.log(`[STUB] Creating ${this.tableName} with data:`, data);
    return data as T;
  }

  /**
   * Update an existing record
   */
  async update(id: string | number, data: Partial<T>): Promise<T> {
    // In a real implementation, this would update the database
    console.log(`[STUB] Updating ${this.tableName} with ID: ${id} and data:`, data);
    return data as T;
  }

  /**
   * Delete a record
   */
  async delete(id: string | number): Promise<boolean> {
    // In a real implementation, this would delete from the database
    console.log(`[STUB] Deleting ${this.tableName} with ID: ${id}`);
    return true;
  }

  /**
   * Execute a raw query
   */
  async query(sql: string, params: any[] = []): Promise<any> {
    // In a real implementation, this would execute a custom SQL query
    console.log(`[STUB] Executing query on ${this.tableName}:`, sql, params);
    return null;
  }
}
