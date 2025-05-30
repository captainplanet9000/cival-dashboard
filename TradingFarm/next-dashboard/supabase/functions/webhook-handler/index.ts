// This edge function handles external webhooks for integrations with trading platforms
// It processes incoming data and updates the relevant farms and transactions

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as crypto from 'https://deno.land/std@0.177.0/crypto/mod.ts'

// Interface for webhook payload from external trading platforms
interface WebhookPayload {
  platform: string;
  event: string;
  farm_id?: number;
  goal_id?: string;
  transaction?: {
    id?: string;
    external_id: string;
    amount: number;
    type: string;
    asset: string;
    timestamp: string;
    status: string;
    profit?: number;
    fee?: number;
    details?: Record<string, any>;
  };
  [key: string]: any;
}

// Verify webhook signature for security
async function verifySignature(req: Request, body: string): Promise<boolean> {
  const signature = req.headers.get('x-webhook-signature')
  if (!signature) return false

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET not configured')
    return false
  }

  // Create HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )

  const bodyBuffer = new TextEncoder().encode(body)
  const mac = await crypto.subtle.sign('HMAC', key, bodyBuffer)
  const calculatedSignature = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signature === calculatedSignature
}

serve(async (req) => {
  try {
    // Parse the request body
    const body = await req.text()
    const payload: WebhookPayload = JSON.parse(body)

    // Verify webhook signature for security
    if (!(await verifySignature(req, body))) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid webhook signature' 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Received webhook: ${payload.event} from ${payload.platform}`)

    // Process based on event type
    switch (payload.event) {
      case 'transaction.created':
        await handleTransaction(supabaseClient, payload)
        break
      
      case 'balance.updated':
        await handleBalanceUpdate(supabaseClient, payload)
        break
      
      case 'goal.progress':
        await handleGoalProgress(supabaseClient, payload)
        break
      
      default:
        console.log(`Unhandled event type: ${payload.event}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${payload.event} webhook` 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Handler for transaction events
async function handleTransaction(
  supabase: any,
  payload: WebhookPayload
): Promise<void> {
  const { transaction, farm_id } = payload
  
  if (!transaction || !farm_id) {
    throw new Error('Missing required transaction or farm_id fields')
  }

  // Check if this transaction already exists (by external_id)
  const { data: existingTx } = await supabase
    .from('farm_transactions')
    .select('id')
    .eq('external_id', transaction.external_id)
    .maybeSingle()

  if (existingTx) {
    console.log(`Transaction ${transaction.external_id} already exists, updating`)
    
    // Update the existing transaction
    await supabase
      .from('farm_transactions')
      .update({
        amount: transaction.amount,
        type: transaction.type,
        asset: transaction.asset,
        status: transaction.status,
        profit: transaction.profit || 0,
        fee: transaction.fee || 0,
        details: transaction.details || {},
        updated_at: new Date().toISOString()
      })
      .eq('external_id', transaction.external_id)
  } else {
    console.log(`Creating new transaction for ${transaction.external_id}`)
    
    // Create a new transaction
    await supabase
      .from('farm_transactions')
      .insert({
        farm_id,
        external_id: transaction.external_id,
        amount: transaction.amount,
        type: transaction.type,
        asset: transaction.asset,
        status: transaction.status,
        profit: transaction.profit || 0,
        fee: transaction.fee || 0,
        details: transaction.details || {},
        created_at: new Date(transaction.timestamp).toISOString(),
        updated_at: new Date().toISOString()
      })
  }

  // The triggers we created will handle updating farm performance metrics
  // and goal progress automatically in the database
}

// Handler for balance update events
async function handleBalanceUpdate(
  supabase: any,
  payload: WebhookPayload
): Promise<void> {
  const { farm_id, balance, asset } = payload
  
  if (!farm_id || balance === undefined) {
    throw new Error('Missing required farm_id or balance fields')
  }

  // Update the farm balance
  await supabase
    .from('farms')
    .update({
      balance,
      updated_at: new Date().toISOString()
    })
    .eq('id', farm_id)

  // If asset allocation is provided, update the farm's asset allocation
  if (payload.asset_allocation) {
    await supabase
      .from('farms')
      .update({
        asset_allocation: payload.asset_allocation,
        updated_at: new Date().toISOString()
      })
      .eq('id', farm_id)
  }
}

// Handler for goal progress events
async function handleGoalProgress(
  supabase: any,
  payload: WebhookPayload
): Promise<void> {
  const { goal_id, current_amount } = payload
  
  if (!goal_id || current_amount === undefined) {
    throw new Error('Missing required goal_id or current_amount fields')
  }

  // Get goal details for comparison
  const { data: goal } = await supabase
    .from('goals')
    .select('target_amount, current_amount, status')
    .eq('id', goal_id)
    .single()

  if (!goal) {
    throw new Error(`Goal ${goal_id} not found`)
  }

  // Determine if goal is completed with new amount
  const isCompleted = current_amount >= goal.target_amount

  // Update the goal progress
  await supabase
    .from('goals')
    .update({
      current_amount,
      status: isCompleted ? 'COMPLETED' : goal.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', goal_id)

  // If goal was completed, trigger completion actions
  if (isCompleted && goal.status !== 'COMPLETED') {
    // Call goal completion procedure
    await supabase.rpc('handle_goal_completion', { goal_id })
  }
}
