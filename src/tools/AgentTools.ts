/**
 * Represents a tool that an agent can use.
 * A tool is essentially a function that performs an action and returns a result.
 */
import { AgentTool } from "@/types/agentTypes";

/**
 * Defines the interface for managing agent tools.
 */
export interface AgentTools {
  /**
   * Retrieves a tool function by its name.
   * @param name The name of the tool.
   * @returns The tool function, or undefined if not found.
   */
  getTool(name: string): AgentTool | undefined;

  /**
   * Registers a new tool or updates an existing one.
   * @param name The name of the tool.
   * @param tool The tool function.
   */
  registerTool(name: string, tool: AgentTool): void;

  /**
   * Unregisters a tool.
   * @param name The name of the tool to remove.
   */
  unregisterTool(name: string): void;

  /**
   * Lists the names of all available tools.
   * @returns An array of tool names.
   */
  listTools(): string[];
}

/**
 * A simple implementation of AgentTools using an in-memory map.
 */
export class ToolRegistry implements AgentTools {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    // Initialize with any default tools if necessary
    console.log("AgentTools initialized.");
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  registerTool(name: string, tool: AgentTool): void {
    if (this.tools.has(name)) {
      console.warn(`Tool "${name}" is already registered. Overwriting.`);
    }
    this.tools.set(name, tool);
    console.log(`Tool "${name}" registered.`);
  }

  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      console.log(`Tool "${name}" unregistered.`);
    }
    return deleted;
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found.`);
    }
    // Assuming AgentTool has an execute method (needs to be added to the type)
    if (typeof (tool as any).execute !== 'function') {
      throw new Error(`Tool "${toolName}" does not have an executable method.`);
    }
    try {
      console.log(`Executing tool "${toolName}" with args:`, args);
      const result = await (tool as any).execute(args);
      console.log(`Tool "${toolName}" execution result:`, result);
      return result;
    } catch (error: any) {
      console.error(`Error executing tool "${toolName}":`, error);
      throw new Error(`Failed to execute tool "${toolName}": ${error.message}`);
    }
  }
} 