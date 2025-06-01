// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/supabase_edge_functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookPayload {
  event: string;
  farmId: string;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
}

interface WebhookResponse {
  success: boolean;
  message: string;
}

Deno.serve(async (req) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase client');
    }

    // Initialize Supabase client with service role key (for admin operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const payload: WebhookPayload = await req.json();

    // Validate required fields
    if (!payload.event || !payload.farmId || !payload.data) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields in webhook payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Find the webhook configuration for this farm and event
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('farm_id', payload.farmId)
      .filter('events', 'cs', `{${payload.event}}`)
      .eq('is_active', true);

    if (webhookError) {
      throw new Error(`Error fetching webhook configuration: ${webhookError.message}`);
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `No active webhook configured for farm ${payload.farmId} and event ${payload.event}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Process the event based on type
    let result: WebhookResponse = { success: false, message: 'Unhandled event type' };

    switch (payload.event) {
      case 'farm.status.changed':
        result = await handleFarmStatusChange(supabase, payload);
        break;
      case 'trade.executed':
        result = await handleTradeExecuted(supabase, payload);
        break;
      case 'order.status.changed':
        result = await handleOrderStatusChange(supabase, payload);
        break;
      case 'strategy.performance.updated':
        result = await handleStrategyPerformanceUpdate(supabase, payload);
        break;
      case 'flash.loan.status.changed':
        result = await handleFlashLoanStatusChange(supabase, payload);
        break;
      case 'risk.threshold.exceeded':
        result = await handleRiskThresholdExceeded(supabase, payload);
        break;
      default:
        // Log unknown event type
        await supabase
          .from('audit_logs')
          .insert({
            farm_id: payload.farmId,
            action: 'webhook.event.unknown',
            resource_type: 'webhook',
            resource_id: null,
            details: payload
          });
        break;
    }

    // Create a log entry for this webhook event
    await supabase
      .from('audit_logs')
      .insert({
        farm_id: payload.farmId,
        action: 'webhook.processed',
        resource_type: 'webhook',
        resource_id: null,
        details: { 
          event: payload.event,
          result: result,
          payload: payload
        }
      });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: result.success ? 200 : 400 }
    );
  } catch (error) {
    // Handle any errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook processing error: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Handler functions for different event types

async function handleFarmStatusChange(supabase: any, payload: WebhookPayload): Promise<WebhookResponse> {
  const { farmId, data } = payload;
  
  try {
    // Update farm status in the database
    const { error } = await supabase
      .from('farms')
      .update({ 
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', farmId);

    if (error) throw new Error(error.message);
    
    // Create a farm status update record
    await supabase
      .from('farm_status_updates')
      .insert({
        farm_id: farmId,
        status: data.status,
        message: data.message || `Status changed to ${data.status}`,
        metrics: data.metrics || {}
      });
    
    // Get farm owner ID to create notification
    const { data: farmData } = await supabase
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .single();
    
    if (farmData) {
      // Create notification for the farm owner
      await supabase.rpc('create_notification', {
        user_id: farmData.owner_id,
        title: 'Farm Status Changed',
        message: data.message || `Your farm status changed to ${data.status}`,
        event_type: 'farm_status_change',
        link: `/farms/${farmId}`,
        data: { farm_id: farmId, status: data.status }
      });
    }
    
    return { success: true, message: 'Farm status updated successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Error updating farm status: ${errorMessage}` };
  }
}

async function handleTradeExecuted(supabase: any, payload: WebhookPayload): Promise<WebhookResponse> {
  const { farmId, data } = payload;
  
  try {
    // Create a new trade record
    const { error } = await supabase
      .from('trades')
      .insert({
        farm_id: farmId,
        agent_id: data.agentId,
        order_id: data.orderId,
        market: data.market,
        side: data.side,
        price: data.price,
        quantity: data.quantity,
        fee: data.fee,
        fee_currency: data.feeCurrency,
        total: data.total,
        profit_loss: data.profitLoss,
        executed_at: data.executedAt || new Date().toISOString(),
        wallet_id: data.walletId,
        strategy_id: data.strategyId,
        metadata: data.metadata
      });

    if (error) throw new Error(error.message);
    
    // Update the order if an order ID was provided
    if (data.orderId) {
      await supabase
        .from('orders')
        .update({ 
          status: 'filled',
          filled_quantity: data.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.orderId);
    }
    
    // Get farm owner ID to create notification
    const { data: farmData } = await supabase
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .single();
    
    if (farmData) {
      // Create notification for the farm owner
      await supabase.rpc('create_notification', {
        user_id: farmData.owner_id,
        title: 'Trade Executed',
        message: `${data.side.toUpperCase()} ${data.quantity} ${data.market} at ${data.price}`,
        event_type: 'trade_executed',
        link: `/farms/${farmId}/trading`,
        data: { 
          farm_id: farmId, 
          market: data.market,
          side: data.side,
          price: data.price,
          quantity: data.quantity,
          total: data.total
        }
      });
    }
    
    return { success: true, message: 'Trade recorded successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Error recording trade: ${errorMessage}` };
  }
}

async function handleOrderStatusChange(supabase: any, payload: WebhookPayload): Promise<WebhookResponse> {
  const { farmId, data } = payload;
  
  try {
    // Update order status
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: data.status,
        filled_quantity: data.filledQuantity || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.orderId)
      .eq('farm_id', farmId);

    if (error) throw new Error(error.message);
    
    // Get farm owner ID to create notification
    const { data: farmData } = await supabase
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .single();
    
    if (farmData) {
      // Create notification for the farm owner
      await supabase.rpc('create_notification', {
        user_id: farmData.owner_id,
        title: 'Order Status Changed',
        message: `Order for ${data.market} is now ${data.status}`,
        event_type: 'order_status_change',
        link: `/farms/${farmId}/trading`,
        data: { 
          farm_id: farmId, 
          order_id: data.orderId,
          status: data.status,
          market: data.market
        }
      });
    }
    
    return { success: true, message: 'Order status updated successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Error updating order status: ${errorMessage}` };
  }
}

async function handleStrategyPerformanceUpdate(supabase: any, payload: WebhookPayload): Promise<WebhookResponse> {
  const { farmId, data } = payload;
  
  try {
    // Update strategy performance
    const { error } = await supabase
      .from('strategies')
      .update({ 
        performance_metrics: data.metrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.strategyId);

    if (error) throw new Error(error.message);
    
    // If this strategy is linked to a farm, update the farm_strategies junction table
    if (farmId) {
      await supabase
        .from('farm_strategies')
        .update({ 
          performance_metrics: data.metrics,
          updated_at: new Date().toISOString()
        })
        .eq('farm_id', farmId)
        .eq('strategy_id', data.strategyId);
    }
    
    return { success: true, message: 'Strategy performance updated successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Error updating strategy performance: ${errorMessage}` };
  }
}

async function handleFlashLoanStatusChange(supabase: any, payload: WebhookPayload): Promise<WebhookResponse> {
  const { farmId, data } = payload;
  
  try {
    // Update flash loan status
    const { error } = await supabase
      .from('flash_loans')
      .update({ 
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.loanId)
      .eq('farm_id', farmId);

    if (error) throw new Error(error.message);
    
    // Get farm owner ID to create notification
    const { data: farmData } = await supabase
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .single();
    
    if (farmData) {
      // Create notification for the farm owner
      let message = `Flash loan status changed to ${data.status}`;
      let eventType = 'flash_loan_status_change';
      
      // Special case for repaid loans
      if (data.status === 'repaid') {
        message = `Flash loan of ${data.amount} ${data.token} has been repaid`;
        eventType = 'flash_loan_repaid';
      }
      // Special case for defaulted loans
      else if (data.status === 'defaulted') {
        message = `Flash loan of ${data.amount} ${data.token} has defaulted`;
        eventType = 'flash_loan_defaulted';
      }
      
      await supabase.rpc('create_notification', {
        user_id: farmData.owner_id,
        title: 'Flash Loan Update',
        message: message,
        event_type: eventType,
        link: `/farms/${farmId}/banking`,
        data: { 
          farm_id: farmId, 
          loan_id: data.loanId,
          status: data.status,
          amount: data.amount,
          token: data.token
        }
      });
    }
    
    return { success: true, message: 'Flash loan status updated successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Error updating flash loan status: ${errorMessage}` };
  }
}

async function handleRiskThresholdExceeded(supabase: any, payload: WebhookPayload): Promise<WebhookResponse> {
  const { farmId, data } = payload;
  
  try {
    // Create a risk assessment report
    await supabase
      .from('risk_assessment_reports')
      .insert({
        farm_id: farmId,
        report_date: new Date().toISOString().split('T')[0],
        risk_score: data.riskScore,
        risk_level: data.riskLevel,
        value_at_risk: data.valueAtRisk,
        expected_shortfall: data.expectedShortfall,
        risk_by_asset: data.riskByAsset || [],
        risk_by_strategy: data.riskByStrategy || [],
        recommendations: data.recommendations || []
      });
    
    // Get farm owner ID to create urgent notification
    const { data: farmData } = await supabase
      .from('farms')
      .select('owner_id, name')
      .eq('id', farmId)
      .single();
    
    if (farmData) {
      // Create high-priority notification for the farm owner
      await supabase.rpc('create_notification', {
        user_id: farmData.owner_id,
        title: '⚠️ Risk Threshold Exceeded',
        message: `Your farm "${farmData.name}" has exceeded risk threshold. Current risk level: ${data.riskLevel.toUpperCase()}`,
        event_type: 'risk_threshold_exceeded',
        link: `/farms/${farmId}/analytics/risk`,
        data: { 
          farm_id: farmId, 
          risk_score: data.riskScore,
          risk_level: data.riskLevel,
          threshold: data.threshold,
          current_value: data.currentValue
        }
      });
      
      // Also attempt to send email notification using Edge Function
      // This is a placeholder that would be implemented in a real system
      console.log(`Risk threshold exceeded for farm ${farmId}. Would send email to owner.`);
    }
    
    return { success: true, message: 'Risk threshold alert processed successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Error processing risk threshold alert: ${errorMessage}` };
  }
} 