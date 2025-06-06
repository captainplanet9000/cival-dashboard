import { NextRequest } from 'next/server';

export interface AuthSession {
  user: { id: string };
}

export function checkAuth(req: NextRequest): AuthSession | null {
  const apiKey = req.headers.get('x-api-key');
  const validKey = process.env.AGENT_API_KEY;
  if (!validKey) {
    console.warn('AGENT_API_KEY env variable not set');
  }
  if (!apiKey || apiKey !== validKey) {
    return null;
  }
  // In a real system this would look up the user from the API key
  return { user: { id: 'api-key-user' } };
}
