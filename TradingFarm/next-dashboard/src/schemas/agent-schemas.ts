import { z } from 'zod';

// Zod schema for creating a new agent
export const createAgentSchema = z.object({
  agent_type: z.string().min(1, { message: 'Agent type is required' }),
  farm_id: z.number().int().positive().optional().nullable(),
  brain_id: z.string().uuid().optional().nullable(),
  // TODO: Add other fields as needed for creation, e.g.:
  // manager_id: z.string().uuid().optional().nullable(), 
  // metadata: z.record(z.any()).optional().nullable(), // For initial config
  // status: z.string().optional(), // Default status might be set by DB trigger or backend
});

// TypeScript type inferred from the schema
export type CreateAgentInput = z.infer<typeof createAgentSchema>;

// Zod schema for updating an existing agent
// Making fields optional as we might only update some
export const updateAgentSchema = createAgentSchema.partial().extend({
  // Add fields that are specific to update or always required for update if any
  // Example: Allowing status update
  status: z.string().optional(),
  // Example: Allowing metadata update (careful with deep partials)
  metadata: z.record(z.any()).optional().nullable(), 
  farm_id: z.number().int().positive().optional().nullable(),
  brain_id: z.string().uuid().optional().nullable(),
});

// TypeScript type inferred from the update schema
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>; 