// Types for OpenRouter-compatible LLM messages
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallLLMOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  // Add other OpenRouter-supported parameters as needed
}

interface LLMResponseChoice {
  index: number;
  message: LLMMessage;
  finish_reason: string;
}

interface LLMSuccessResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMResponseChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LLMErrorResponse {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

/**
 * Calls the OpenRouter API to get a response from a specified LLM.
 * This function MUST run on the server-side (Server Components, API Routes, Server Actions)
 * to protect the API key.
 */
export async function callLLM(options: CallLLMOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter API key is not set in environment variables.');

  // Set referer header for OpenRouter (required)
  const siteUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_SITE_URL || 'YOUR_DEPLOYED_APP_URL';

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': siteUrl,
    // 'X-Title': 'Trading Farm Dashboard', // Optional: for OpenRouter analytics
  };

  const body = JSON.stringify({
    model: options.model,
    messages: options.messages,
    temperature: options.temperature,
    max_tokens: options.max_tokens,
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body,
  });

  const responseData: LLMSuccessResponse | LLMErrorResponse = await response.json();

  if (!response.ok) {
    const errorDetails = (responseData as LLMErrorResponse).error;
    throw new Error(`OpenRouter API Error: ${errorDetails?.message || response.statusText}`);
  }

  const successData = responseData as LLMSuccessResponse;

  if (!successData.choices || !successData.choices[0]?.message?.content) {
    throw new Error('Received an invalid response from the LLM.');
  }

  return successData.choices[0].message.content.trim();
}
