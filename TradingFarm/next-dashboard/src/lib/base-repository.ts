/**
 * Base querying options for repositories
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
  orderBy?: string;
  search?: string;
  userId?: string;
  filters?: Record<string, any>;
}

/**
 * Base Repository that provides common data access methods
 * This is an abstract class that specific repositories will extend
 */
export class BaseRepository<T> {
  /**
   * The table or collection name this repository manages
   */
  protected tableName: string;

  /**
   * Create a new repository for the specified table
   * @param tableName The name of the table this repository manages
   */
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find an entity by its ID
   * @param id The ID of the entity to find
   * @returns The found entity or null if not found
   */
  async findById(id: string | number): Promise<T | null> {
    // Stub implementation - would connect to database in production
    console.log(`Finding ${this.tableName} with ID: ${id}`);
    return null;
  }

  /**
   * Find all entities matching the provided options
   * @param options Query options for filtering, pagination, etc.
   * @returns Array of matching entities
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    // Stub implementation - would connect to database in production
    console.log(`Finding all ${this.tableName} with options:`, options);
    return [];
  }

  /**
   * Find the first entity matching the provided options
   * @param options Query options for filtering
   * @returns The first matching entity or null if none found
   */
  async findOne(options?: QueryOptions): Promise<T | null> {
    // Stub implementation - would connect to database in production
    console.log(`Finding one ${this.tableName} with options:`, options);
    return null;
  }

  /**
   * Count entities matching the provided options
   * @param options Query options for filtering
   * @returns The count of matching entities
   */
  async count(options?: QueryOptions): Promise<number> {
    // Stub implementation - would connect to database in production
    console.log(`Counting ${this.tableName} with options:`, options);
    return 0;
  }

  /**
   * Create a new entity
   * @param data The data for the new entity
   * @returns The created entity
   */
  async create(data: Partial<T>): Promise<T> {
    // Stub implementation - would connect to database in production
    console.log(`Creating ${this.tableName} with data:`, data);
    return data as T;
  }

  /**
   * Update an existing entity
   * @param id The ID of the entity to update
   * @param data The data to update
   * @returns The updated entity
   */
  async update(id: string | number, data: Partial<T>): Promise<T> {
    // Stub implementation - would connect to database in production
    console.log(`Updating ${this.tableName} with ID: ${id} and data:`, data);
    return data as T;
  }

  /**
   * Delete an entity by its ID
   * @param id The ID of the entity to delete
   * @returns Boolean indicating success
   */
  async delete(id: string | number): Promise<boolean> {
    // Stub implementation - would connect to database in production
    console.log(`Deleting ${this.tableName} with ID: ${id}`);
    return true;
  }

  /**
   * Execute a raw query for more complex operations
   * @param query The query to execute
   * @param params Parameters for the query
   * @returns Query results
   */
  async executeQuery(query: string, params?: any[]): Promise<any> {
    // Stub implementation - would connect to database in production
    console.log(`Executing query on ${this.tableName}:`, query, params);
    return null;
  }
}
