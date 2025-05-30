import { BaseEntity, BaseRepository, QueryOptions } from '../../lib/base-repository';

/**
 * Base service class to handle common operations for all entity types
 * Provides a higher-level abstraction over repositories
 */
export abstract class BaseService<T extends BaseEntity> {
  protected repository: BaseRepository<T>;

  constructor(repository: BaseRepository<T>) {
    this.repository = repository;
  }

  /**
   * Find entity by ID
   */
  async findById(id: number): Promise<T | null> {
    return this.repository.findById(id);
  }

  /**
   * Find all entities with optional filtering
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.repository.findAll(options);
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    return this.repository.create(data);
  }

  /**
   * Update an existing entity
   */
  async update(id: number, data: Partial<T>): Promise<T | null> {
    return this.repository.update(id, data);
  }

  /**
   * Delete an entity
   */
  async delete(id: number): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Count entities with optional filters
   */
  async count(filters?: Record<string, any>): Promise<number> {
    return this.repository.count(filters);
  }
} 