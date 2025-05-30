// src/lib/types/crew.ts

// Payload for triggering a crew run from the client
export interface TriggerCrewRunClientPayload { // Renamed for clarity if needed, or keep as TriggerCrewRunPayload
  blueprint_id: string; // UUID string of the CrewBlueprint
  inputs: Record<string, any>; // Generic inputs, structure depends on the selected blueprint
  // user_id is handled by the Next.js BFF from session/auth
}

// This was the old payload, now replaced by TriggerCrewRunClientPayload
// export interface TriggerCrewRunPayload {
//   symbol: string;
//   market_data_summary?: string; 
// }

export interface TriggerCrewRunResponse { // Mirrors Python CrewRunResponse
  task_id: string; // UUID string
  status: string;
  message?: string;
}

// Types for Static Crew Definition Display
export interface StaticAgentDefinition {
  id: string; // A unique identifier for this agent definition
  role: string;
  goal: string;
  backstory?: string; // Optional
  llmIdentifier?: string | null; // Optional
}

export interface StaticTaskDefinition {
  id: string; // A unique identifier for this task definition
  name: string; // A user-friendly name for the task
  description: string;
  assignedAgentId: string; // ID of the agent assigned to this task
  dependencies?: string[]; // IDs of tasks this task depends on
  expectedOutput?: string;
}

export interface StaticCrewDefinition {
  id: string; // A unique identifier for this crew definition
  name: string;
  description?: string;
  process?: 'sequential' | 'parallel'; // From CrewAI Process enum
  agents: StaticAgentDefinition[];
  tasks: StaticTaskDefinition[];
}

// Interface for CrewBlueprint data received from the backend
export interface CrewBlueprintInterface {
  blueprint_id: string; // UUID
  name: string;
  description?: string | null;
  input_schema?: Record<string, any> | null; // JSON Schema for inputs
  python_crew_identifier: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}
