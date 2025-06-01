import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isProduction } from '@/lib/environment';
import { MonitoringEvent } from '@/lib/monitoring';

/**
 * Monitoring health check endpoint
 */
export async function GET() {
  // Return basic health status
  return NextResponse.json({ 
    status: 'ok',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}

/**
 * Endpoint to collect monitoring events and metrics
 */
export async function POST(req: NextRequest) {
  try {
    // Validate API key in production
    if (isProduction()) {
      const apiKey = req.headers.get('X-Monitoring-Key');
      const validKey = process.env.MONITORING_API_KEY;
      
      if (!apiKey || apiKey !== validKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Parse the event data
    const event: MonitoringEvent = await req.json();
    
    // Basic validation
    if (!event || !event.type || !event.severity || !event.message) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }
    
    // Add server timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    // Add source if not present
    if (!event.source) {
      event.source = 'api';
    }
    
    // Process the event
    await processMonitoringEvent(event);
    
    // Return success
    return NextResponse.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Error processing monitoring event:', error);
    
    // Return error
    return NextResponse.json(
      { error: 'Failed to process monitoring event' },
      { status: 500 }
    );
  }
}

/**
 * Process a monitoring event
 * In production, this would send to a monitoring service
 */
async function processMonitoringEvent(event: MonitoringEvent): Promise<void> {
  // Log to console for development
  if (!isProduction()) {
    console.log(`[MONITORING API] ${event.severity.toUpperCase()} - ${event.type}: ${event.message}`);
    if (event.details) {
      console.log(JSON.stringify(event.details, null, 2));
    }
    return;
  }
  
  // In production, implement actual monitoring
  // Examples include sending to:
  // - Datadog, Sentry, New Relic, etc.
  // - Log files for processing
  // - Custom monitoring database
  
  // Alert for high severity events
  if (event.severity === 'error' || event.severity === 'critical') {
    await sendAlert(event);
  }
  
  // Persist event to storage for later analysis
  // This could be Supabase, a dedicated logging database, etc.
  if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true') {
    // Send to your monitoring service
    if (process.env.SENTRY_DSN) {
      // If using Sentry, you could implement Sentry API calls here
      console.log('[MONITORING API] Would send to Sentry:', event);
    }
    
    // Example: store in Supabase logs table
    // const { error } = await supabase
    //   .from('monitoring_logs')
    //   .insert(event);
    // 
    // if (error) {
    //   console.error('Failed to store monitoring event:', error);
    // }
  }
}

/**
 * Send an alert for critical events
 */
async function sendAlert(event: MonitoringEvent): Promise<void> {
  // Only send alerts in production with an alert email configured
  if (!isProduction() || !process.env.ALERT_EMAIL) {
    return;
  }
  
  try {
    // In a real implementation, this would send an email
    // Example code for sending an email using an email service
    console.log(`[ALERT] Would send alert to ${process.env.ALERT_EMAIL}:`, event);
    
    // Sample email service implementation:
    // await fetch('https://api.emailservice.com/send', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     to: process.env.ALERT_EMAIL,
    //     subject: `[${event.severity.toUpperCase()}] ${event.type}: ${event.message}`,
    //     text: JSON.stringify(event, null, 2),
    //     html: `<pre>${JSON.stringify(event, null, 2)}</pre>`
    //   })
    // });
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}