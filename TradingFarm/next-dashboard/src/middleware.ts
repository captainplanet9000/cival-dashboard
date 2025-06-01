import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Rate limiting implementation
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const API_RATE_LIMIT = 60; // 60 requests per minute for API endpoints
const TRADING_RATE_LIMIT = 20; // 20 requests per minute for trading endpoints

// In-memory store for rate limiting
// In production, you would use Redis or another distributed cache
type RateLimitStore = {
  [ip: string]: {
    timestamp: number;
    count: number;
  };
};

const apiLimiter: RateLimitStore = {};
const tradingLimiter: RateLimitStore = {};

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(apiLimiter).forEach(key => {
    if (now - apiLimiter[key].timestamp > RATE_LIMIT_WINDOW) {
      delete apiLimiter[key];
    }
  });
  
  Object.keys(tradingLimiter).forEach(key => {
    if (now - tradingLimiter[key].timestamp > RATE_LIMIT_WINDOW) {
      delete tradingLimiter[key];
    }
  });
}, 5 * 60 * 1000);

// Define protected routes that require authentication
const authProtectedPaths = [
  '/dashboard',
  '/api/agents',
  '/api/trading',
  '/api/credentials',
  '/api/vault',
];

// Define routes that need additional rate limiting
const tradingEndpoints = [
  '/api/trading/place-order',
  '/api/trading/cancel-order',
  '/api/agents/start',
  '/api/agents/stop',
];

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const ip = request.ip ?? 'unknown';
  const path = request.nextUrl.pathname;
  
  // Create supabase client for auth checks
  const supabase = createMiddlewareClient({ req: request, res });
  
  // SINGLE USER MODE: Authentication checks are bypassed
  // This allows accessing all routes without authentication
  
  // Original authentication check (commented out for single-user mode)
  // const isProtectedRoute = authProtectedPaths.some(prefix => path.startsWith(prefix));
  // if (isProtectedRoute) {
  //   const { data: { session } } = await supabase.auth.getSession();
  //   if (!session) {
  //     if (path.startsWith('/api/')) {
  //       return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  //     } else {
  //       return NextResponse.redirect(new URL('/login', request.url));
  //     }
  //   }
  // }
  
  // If the user accesses the login page, redirect them to the dashboard
  if (path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Basic rate limiting for all API routes
  if (path.startsWith('/api/')) {
    const limiter = isTradingEndpoint(path) ? tradingLimiter : apiLimiter;
    const limit = isTradingEndpoint(path) ? TRADING_RATE_LIMIT : API_RATE_LIMIT;
    
    if (!limiter[ip]) {
      limiter[ip] = {
        timestamp: Date.now(),
        count: 0,
      };
    }
    
    const currentWindow = limiter[ip];
    const elapsedTime = Date.now() - currentWindow.timestamp;
    
    // Reset window if it's expired
    if (elapsedTime > RATE_LIMIT_WINDOW) {
      currentWindow.timestamp = Date.now();
      currentWindow.count = 0;
    }
    
    // Check if rate limit exceeded
    if (currentWindow.count >= limit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': `${Math.ceil((RATE_LIMIT_WINDOW - elapsedTime) / 1000)}`,
            'X-RateLimit-Limit': `${limit}`,
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': `${Math.ceil((currentWindow.timestamp + RATE_LIMIT_WINDOW) / 1000)}`,
          }
        }
      );
    }
    
    // Increment count for this window
    currentWindow.count++;
    
    // Add rate limit headers
    res.headers.set('X-RateLimit-Limit', `${limit}`);
    res.headers.set('X-RateLimit-Remaining', `${Math.max(0, limit - currentWindow.count)}`);
    res.headers.set('X-RateLimit-Reset', `${Math.ceil((currentWindow.timestamp + RATE_LIMIT_WINDOW) / 1000)}`);
  }
  
  // Add security headers
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Content Security Policy
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.supabase.io wss://*.supabase.co;"
  );
  
  return res;
}

// Helper function to check if the endpoint is a trading endpoint
function isTradingEndpoint(path: string): boolean {
  return tradingEndpoints.some(endpoint => path.startsWith(endpoint));
}
