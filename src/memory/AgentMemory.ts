/**
 * Defines the interface for agent memory operations.
 */
export interface AgentMemory {
  /**
   * Stores a value associated with a key.
   * @param key The key to store the value under.
   * @param value The value to store (should be serializable).
   */
  store(key: string, value: any): Promise<void>;

  /**
   * Retrieves a value associated with a key.
   * @param key The key of the value to retrieve.
   * @returns A promise resolving to the retrieved value, or null if not found.
   */
  retrieve(key: string): Promise<any | null>;

  /**
   * Removes a key and its associated value.
   * @param key The key to remove.
   */
  remove(key: string): Promise<void>;

  /**
   * Clears all entries from the memory.
   */
  clear(): Promise<void>;
}

/**
 * A simple implementation of AgentMemory using browser localStorage.
 * Note: This is synchronous but wrapped in Promises to match the interface.
 * Suitable for simple browser-based agents, not for complex server-side memory.
 */
export class LocalStorageMemory implements AgentMemory {
  private prefix: string;

  /**
   * Creates an instance of LocalStorageMemory.
   * @param agentId The ID of the agent, used to prefix keys in localStorage.
   */
  constructor(agentId: string) {
    this.prefix = `agent_${agentId}_memory_`;
  }

  async store(key: string, value: any): Promise<void> {
    try {
      const prefixedKey = this.prefix + key;
      localStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Error storing key \"${key}\" in localStorage:`, error);
      throw new Error(`Failed to store key ${key}`);
    }
    return Promise.resolve();
  }

  async retrieve(key: string): Promise<any | null> {
    try {
      const prefixedKey = this.prefix + key;
      const item = localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error retrieving key \"${key}\" from localStorage:`, error);
      throw new Error(`Failed to retrieve key ${key}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const prefixedKey = this.prefix + key;
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`Error removing key \"${key}\" from localStorage:`, error);
      throw new Error(`Failed to remove key ${key}`);
    }
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Error clearing agent memory from localStorage:", error);
      throw new Error("Failed to clear agent memory");
    }
    return Promise.resolve();
  }
} 