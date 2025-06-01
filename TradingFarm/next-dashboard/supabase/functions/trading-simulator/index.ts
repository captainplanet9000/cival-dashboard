// This edge function simulates trading activity for demonstration and testing
// It creates realistic trading transactions with varying outcomes

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.0'

// Available trading assets for simulation
const ASSETS = ['BTC', 'ETH', 'USDT', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX']

// Trade types for simulation
const TRADE_TYPES = ['spot', 'margin', 'futures', 'swap']

// Get random number within range
function getRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Get random integer within range
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a random trade with realistic values
function generateRandomTrade(farm_id: number, balance: number) {
  // Determine trade size (1-10% of balance)
  const tradeSize = balance * getRandomNumber(0.01, 0.1)
  
  // Randomly determine if trade is profitable (65% chance of profit)
  const isProfitable = Math.random() < 0.65
  
  // Calculate profit or loss (0-5% for profit, 0-8% for loss)
  const profitPercent = isProfitable 
    ? getRandomNumber(0.001, 0.05) 
    : -getRandomNumber(0.001, 0.08)
  
  const profit = tradeSize * profitPercent
  
  // Calculate fee (0.1-0.5% of trade size)
  const fee = tradeSize * getRandomNumber(0.001, 0.005)
  
  // Pick random asset and trade type
  const asset = ASSETS[getRandomInt(0, ASSETS.length - 1)]
  const tradeType = TRADE_TYPES[getRandomInt(0, TRADE_TYPES.length - 1)]
  
  // Create trade object
  return {
    farm_id,
    external_id: `sim-${uuidv4()}`,
    amount: tradeSize,
    type: tradeType,
    asset,
    status: 'completed',
    profit: profit,
    fee: fee,
    details: {
      entry_price: isProfitable ? getRandomNumber(90, 110) : getRandomNumber(95, 105),
      exit_price: isProfitable ? getRandomNumber(105, 120) : getRandomNumber(85, 95),
      leverage: tradeType === 'futures' || tradeType === 'margin' ? getRandomInt(1, 5) : 1,
      direction: isProfitable ? 'long' : Math.random() < 0.5 ? 'long' : 'short',
      simulated: true
    }
  }
}

serve(async (req) => {
  try {
    // Parse request body
    const { 
      farmId, 
      count = 1, 
      timeSpan = 'now',
      affectBalance = true
    } = await req.json().catch(() => ({ farmId: null, count: 1 }))
    
    if (!farmId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'farmId is required'
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get farm data to simulate realistic trades
    const { data: farm, error: farmError } = await supabaseClient
      .from('farms')
      .select('balance, name, performance_metrics')
      .eq('id', farmId)
      .single()
    
    if (farmError || !farm) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Farm with ID ${farmId} not found`
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }
    
    console.log(`Simulating ${count} trades for farm ${farmId} (${farm.name})`)
    
    // Generate transactions based on count parameter
    const transactions = []
    let currentBalance = farm.balance
    
    // Parse timespan for historical data
    let startDate: Date
    let endDate = new Date()
    
    switch (timeSpan) {
      case 'day':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date(endDate)
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'year':
        startDate = new Date(endDate)
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        // Default to current time for all transactions
        startDate = endDate
    }
    
    // Generate random transactions
    for (let i = 0; i < count; i++) {
      const trade = generateRandomTrade(farmId, currentBalance)
      
      // If we're distributing across a time range, assign random timestamp
      if (timeSpan !== 'now') {
        const randomTimestamp = new Date(
          startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
        )
        trade.created_at = randomTimestamp.toISOString()
      }
      
      transactions.push(trade)
      
      // Update simulated balance if specified
      if (affectBalance) {
        currentBalance += trade.profit - trade.fee
      }
    }
    
    // Insert transactions into the database
    const { data: insertedTrades, error: insertError } = await supabaseClient
      .from('farm_transactions')
      .insert(transactions)
      .select()
    
    if (insertError) {
      throw insertError
    }
    
    // Update farm balance if specified
    if (affectBalance) {
      const netProfitLoss = transactions.reduce((sum, t) => sum + t.profit - t.fee, 0)
      
      const { error: updateError } = await supabaseClient
        .from('farms')
        .update({ 
          balance: farm.balance + netProfitLoss,
          updated_at: new Date().toISOString()
        })
        .eq('id', farmId)
      
      if (updateError) {
        console.error('Error updating farm balance:', updateError)
      }
    }
    
    // Recalculate performance metrics
    await supabaseClient.rpc('calculate_farm_performance', { farm_id: farmId })
      .then(({ error }) => {
        if (error) console.error('Error calculating performance:', error)
      })
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully simulated ${count} trades for farm ${farmId}`,
        data: {
          farm_id: farmId,
          transactions_count: transactions.length,
          net_profit_loss: transactions.reduce((sum, t) => sum + t.profit - t.fee, 0),
          transactions: insertedTrades
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in trading simulator:', error)
    
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
