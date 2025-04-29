import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { recordSecurityEvent } from '@/utils/supabase/security-access';

export type SecurityConfig = {
  enforce: boolean;
  ipRestriction?: boolean;
  rateLimit?: boolean;
  rateLimitThreshold?: number;
  requireApiKey?: boolean;
}

/**
 * Security middleware for protecting API endpoints
 * Provides IP restriction, rate limiting, and access logging
 */
export async function securityMiddleware(
  req: NextRequest,
  options: SecurityConfig = { enforce: true }
) {
  const start = Date.now();
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const endpoint = req.nextUrl.pathname;
  const method = req.method;
  
  // Skip security checks in development mode if enforce is false
  if (process.env.NODE_ENV === 'development' && !options.enforce) {
    return NextResponse.next();
  }
  
  // Create Supabase client
  const supabase = createServerClient();
  
  try {
    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Record unauthorized access attempt
      await recordSecurityEvent({
        event_type: 'unauthorized_access',
        endpoint,
        method,
        ip_address: ip,
        user_agent: userAgent,
        user_id: null,
        risk_score: 80,
        details: { message: 'Authentication required' }
      });
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Perform IP restriction check if enabled
    if (options.ipRestriction) {
      const { data: allowedIps } = await supabase
        .from('security_ip_allowlist')
        .select('ip_address')
        .eq('user_id', userId);
      
      if (allowedIps && allowedIps.length > 0) {
        const isAllowed = allowedIps.some(item => 
          ip === item.ip_address || 
          (item.ip_address.includes('*') && matchesWildcardIp(ip, item.ip_address))
        );
        
        if (!isAllowed) {
          await recordSecurityEvent({
            event_type: 'ip_restriction_violation',
            endpoint,
            method,
            ip_address: ip,
            user_agent: userAgent,
            user_id: userId,
            risk_score: 90,
            details: { message: 'IP address not in allowlist' }
          });
          
          return NextResponse.json(
            { error: 'Access denied: IP address not allowed' },
            { status: 403 }
          );
        }
      }
    }
    
    // Perform rate limiting if enabled
    if (options.rateLimit) {
      const threshold = options.rateLimitThreshold || 100; // Default 100 requests per minute
      const windowMinutes = 1;
      
      const { data: requestCount } = await supabase
        .from('security_access_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString());
      
      if (requestCount && requestCount > threshold) {
        await recordSecurityEvent({
          event_type: 'rate_limit_exceeded',
          endpoint,
          method,
          ip_address: ip,
          user_agent: userAgent,
          user_id: userId,
          risk_score: 60,
          details: { threshold, count: requestCount }
        });
        
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }
    
    // Verify API key if required
    if (options.requireApiKey) {
      const apiKey = req.headers.get('x-api-key');
      if (!apiKey) {
        await recordSecurityEvent({
          event_type: 'missing_api_key',
          endpoint,
          method,
          ip_address: ip,
          user_agent: userAgent,
          user_id: userId,
          risk_score: 70,
          details: { message: 'Missing API key' }
        });
        
        return NextResponse.json(
          { error: 'API key required' },
          { status: 401 }
        );
      }
      
      // Verify the API key is valid for this user
      const { data: validKey } = await supabase
        .from('api_keys')
        .select('id')
        .eq('key_hash', await hashApiKey(apiKey))
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (!validKey) {
        await recordSecurityEvent({
          event_type: 'invalid_api_key',
          endpoint,
          method,
          ip_address: ip,
          user_agent: userAgent,
          user_id: userId,
          risk_score: 85,
          details: { message: 'Invalid API key' }
        });
        
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
    }
    
    // Log successful access with low risk score
    await recordSecurityEvent({
      event_type: 'api_access',
      endpoint,
      method,
      ip_address: ip,
      user_agent: userAgent,
      user_id: userId,
      risk_score: 10,
      details: { duration_ms: Date.now() - start }
    });
    
    // Add security headers to the response
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    return response;
    
  } catch (error) {
    console.error('Security middleware error:', error);
    
    // Log security middleware failure
    await recordSecurityEvent({
      event_type: 'security_middleware_error',
      endpoint,
      method,
      ip_address: ip,
      user_agent: userAgent,
      user_id: null,
      risk_score: 50,
      details: { error: (error as Error).message }
    }).catch(e => console.error('Failed to record security event:', e));
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if an IP matches a wildcard pattern
 * Example: 192.168.1.* matches 192.168.1.55
 */
function matchesWildcardIp(ip: string, pattern: string): boolean {
  const ipParts = ip.split('.');
  const patternParts = pattern.split('.');
  
  if (ipParts.length !== 4 || patternParts.length !== 4) {
    return false;
  }
  
  for (let i = 0; i < 4; i++) {
    if (patternParts[i] !== '*' && patternParts[i] !== ipParts[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Hash API key for secure storage and comparison
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
