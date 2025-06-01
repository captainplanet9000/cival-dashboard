"use server";

import { callLLM, LLMMessage } from "@/lib/llm/llm-service";

export interface ProcessUserCommandResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Server Action: Processes a user command using OpenRouter LLM.
 * This is an example you can extend for ElizaOS, agents, etc.
 */
export async function processUserCommand(command: string): Promise<ProcessUserCommandResult> {
  if (!command) {
    return { success: false, error: "Command cannot be empty." };
  }

  // Example: Use system prompt to structure LLM output as JSON
  const messages: LLMMessage[] = [
    {
      role: "system",
      content:
        "You are an AI interpreting user commands for a trading dashboard. Identify the intent and key entities. Respond ONLY with JSON like {\"intent\": \"...\", \"entities\": {...}}.",
    },
    { role: "user", content: `Interpret this command: \"${command}\"` },
  ];

  try {
    const llmResponse = await callLLM({
      model: "openai/gpt-3.5-turbo", // Or any OpenRouter model you prefer
      messages,
      temperature: 0.2, // Low temp for structured output
    });

    // Attempt to parse the LLM response as JSON
    let parsed: any = null;
    let raw = llmResponse;
    try {
      parsed = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;
      return { success: true, data: JSON.stringify(parsed, null, 2) };
    } catch (err) {
      // If parsing fails, return the raw LLM response with an error message
      return {
        success: false,
        error: 'Failed to parse LLM response as JSON.',
        data: typeof raw === 'string' ? raw : JSON.stringify(raw)
      };
    }
    return { success: true, data: llmResponse };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process command via LLM." };
  }
}
