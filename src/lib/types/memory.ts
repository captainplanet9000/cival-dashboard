// src/lib/types/memory.ts

export interface MemoryEntryInterface {
  retrieved_memory_content: string;
  // Potentially other fields if the backend starts returning more structured memory objects:
  // id?: string; 
  // timestamp?: string; 
  // score?: number;
  // metadata?: Record<string, any>;
}
