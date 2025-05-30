/**
 * Base entity interface for all database models
 */
export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}
