import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Create a type-safe resolver for React Hook Form using a Zod schema
 * 
 * @param schema Zod schema to validate against
 * @returns A resolver for React Hook Form
 */
export function createZodResolver<T extends z.ZodType>(schema: T) {
  return zodResolver(schema);
}

/**
 * Get type-safe form field values from a Zod schema
 * 
 * @param schema Zod schema to derive types from
 * @returns The inferred TypeScript type for form values
 */
export type FormValues<T extends z.ZodType> = z.infer<T>;
