import { NextRequest, NextResponse } from 'next/server';

// --- ENV VARS ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- PROVIDER ENDPOINTS ---
const PROVIDER_ENDPOINTS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
};

// --- HANDLER ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      input, // user input (string)
      provider = 'openrouter', // default to openrouter
      model = 'gpt-4o', // default model
      messages = [], // optional: chat history
      ...rest
    } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid input' }, { status: 400 });
    }

    // Compose messages array for OpenAI/OpenRouter
    const chatMessages = [
      ...messages,
      { role: 'user', content: input },
    ];

    // Select endpoint and API key
    let endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS['openrouter'];
    let apiKey = provider === 'openai' ? OPENAI_API_KEY : OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: `API key for provider '${provider}' not configured.` }, { status: 500 });
    }

    // Prepare payload
    const payload = {
      model,
      messages: chatMessages,
      ...rest,
    };

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': provider === 'openai' ? `Bearer ${apiKey}` : `Bearer ${apiKey}`,
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://your-dashboard-domain.com'; // Replace with your domain
    }

    // Call LLM endpoint
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ error: err }, { status: resp.status });
    }

    const data = await resp.json();
    // Extract intent/response from LLM output (assume OpenAI format)
    const completion = data.choices?.[0]?.message?.content || '';
    // Optionally: parse intent from response (if using a system prompt for intent extraction)
    return NextResponse.json({
      provider,
      model,
      completion,
      raw: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
