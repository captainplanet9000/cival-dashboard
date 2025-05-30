import { AgentMemory } from './AgentMemory';

/**
 * Simple in-memory implementation of AgentMemory using a Map.
 * Suitable for testing or simple agents, but data is lost on restart.
 */
export class InMemoryAgentMemory implements AgentMemory {
    private memoryStore: Map<string, any>;

    constructor() {
        this.memoryStore = new Map<string, any>();
        console.log('[InMemoryAgentMemory] Initialized.');
    }

    async store(key: string, value: any): Promise<void> {
        console.log(`[InMemoryAgentMemory] Storing key: ${key}`);
        this.memoryStore.set(key, value);
        return Promise.resolve();
    }

    async retrieve(key: string): Promise<any> {
        const value = this.memoryStore.get(key);
        console.log(`[InMemoryAgentMemory] Retrieving key: ${key} - Found: ${value !== undefined}`);
        return Promise.resolve(value); // Returns undefined if key doesn't exist, matching Map behavior
    }

    async remove(key: string): Promise<void> {
        console.log(`[InMemoryAgentMemory] Removing key: ${key}`);
        this.memoryStore.delete(key);
        return Promise.resolve();
    }

    async clear(): Promise<void> {
        console.log('[InMemoryAgentMemory] Clearing memory store.');
        this.memoryStore.clear();
        return Promise.resolve();
    }

    // Optional: Method to list keys or dump memory for debugging
    listKeys(): string[] {
        return Array.from(this.memoryStore.keys());
    }
} 