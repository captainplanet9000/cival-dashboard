/**
 * Content Security Policy (CSP) configuration for Trading Farm
 * 
 * This module provides CSP headers to protect against XSS and other injection attacks
 */

// Generate a nonce for script execution
export function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

// CSP directives for the application
export function getCSPDirectives(nonce: string): Record<string, string[]> {
  return {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      // Allow inline scripts with nonce
      "'strict-dynamic'",
      // For development only - remove in production
      process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : '',
    ].filter(Boolean),
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https://source.unsplash.com', 'https://images.unsplash.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      // Supabase connections
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      // Trading APIs
      'https://api.binance.com',
      'https://api.coinbase.com',
      'https://api.kraken.com',
      // WebSocket connections
      'wss://stream.binance.com',
    ].filter(Boolean),
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // Strict CSP to block all mixed content
    'upgrade-insecure-requests': [],
  };
}

// Convert CSP directives to header string
export function getCSPHeader(nonce: string): string {
  const directives = getCSPDirectives(nonce);
  
  return Object.entries(directives)
    .map(([key, values]) => {
      return `${key} ${values.join(' ')}`.trim();
    })
    .join('; ');
}

// Apply CSP headers to Next.js API response
export function applySecurityHeaders(
  headers: Headers,
  nonce?: string
): Headers {
  // Generate nonce if not provided
  const cspNonce = nonce || generateNonce();
  
  // Set Content-Security-Policy header
  headers.set('Content-Security-Policy', getCSPHeader(cspNonce));
  
  // Other security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Only in production
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  return headers;
}

// Create middleware for Next.js to apply CSP headers
export function securityMiddleware(middleware: Function) {
  return async (req: Request, event: any) => {
    const nonce = generateNonce();
    
    // Store nonce in response header for access in components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    
    // Create a new request with the nonce
    const newRequest = new Request(req.url, {
      method: req.method,
      headers: requestHeaders,
      body: req.body,
      cache: req.cache,
      credentials: req.credentials,
      integrity: req.integrity,
      keepalive: req.keepalive,
      mode: req.mode,
      redirect: req.redirect,
      referrer: req.referrer,
      referrerPolicy: req.referrerPolicy,
      signal: req.signal,
    });
    
    // Call the original middleware
    const response = await middleware(newRequest, event);
    
    // Apply security headers to the response
    const responseHeaders = new Headers(response.headers);
    applySecurityHeaders(responseHeaders, nonce);
    
    // Create a new response with the security headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  };
}

// Create a middleware for Next.js App Router
export function createSecurityMiddleware() {
  return async function middleware(request: Request) {
    const nonce = generateNonce();
    const requestHeaders = new Headers(request.headers);
    
    // Add nonce to request headers for access in server components
    requestHeaders.set('x-nonce', nonce);
    
    // Create response with security headers
    const response = new Response(null, {
      status: 200,
      headers: {
        'x-middleware-next': '1',
      },
    });
    
    const responseHeaders = new Headers(response.headers);
    applySecurityHeaders(responseHeaders, nonce);
    
    // Apply the headers to the response
    responseHeaders.forEach((value, key) => {
      requestHeaders.set(`x-middleware-${key.toLowerCase()}`, value);
    });
    
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-next': '1',
        'x-middleware-rewrite': request.url,
        ...Object.fromEntries(requestHeaders),
      },
    });
  };
}

// Helper to get CSP nonce in components
export function getNonce(headers?: Headers): string {
  if (typeof window !== 'undefined') {
    // Client-side: get from window object
    return (window as any).__CSP_NONCE__ || '';
  }
  
  // Server-side: get from headers
  return headers?.get('x-nonce') || generateNonce();
}

// Script component that uses CSP nonce
export function Script({
  children,
  nonce,
}: {
  children: string;
  nonce?: string;
}) {
  const scriptNonce = nonce || getNonce();
  
  return (
    <script
      nonce={scriptNonce}
      dangerouslySetInnerHTML={{ __html: children }}
    />
  );
}
