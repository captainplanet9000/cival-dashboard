// src/lib/types/crew.ts
export interface TriggerCrewRunPayload {
  symbol: string;
  market_data_summary?: string; 
  // Add any other parameters the frontend client might send
}

export interface TriggerCrewRunResponse { // Mirrors Python CrewRunResponse
  task_id: string; // UUID string
  status: string;
  message?: string;
}
