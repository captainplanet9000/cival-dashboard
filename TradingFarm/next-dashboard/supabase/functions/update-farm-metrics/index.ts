// This edge function will update farm metrics on a schedule
// It can be invoked manually or set up as a cron job in Supabase

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

interface FarmRecord {
  id: number;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      // Supabase API URL - env var injected by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var injected by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth header from the middleware
      { global: { headers: { Authorization: authHeader } } }
    )

    console.log('Starting farm performance metrics update job')

    // Check if a specific farm ID was provided in the request
    const { farmId } = await req.json().catch(() => ({ farmId: null }))

    // If a specific farm ID was provided, only update that farm
    if (farmId) {
      console.log(`Updating metrics for specific farm: ${farmId}`)
      
      // Call the SQL function to recalculate performance
      const { data: result, error } = await supabaseClient.rpc(
        'calculate_farm_performance',
        { farm_id: farmId }
      )
      
      if (error) throw error
      
      // Update the farm with the new metrics
      const { error: updateError } = await supabaseClient
        .from('farms')
        .update({ performance_metrics: result })
        .eq('id', farmId)
      
      if (updateError) throw updateError
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Updated metrics for farm ${farmId}`,
          data: result
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Otherwise, update all active farms
    console.log('Updating metrics for all active farms')
    
    // Get all active farms
    const { data: farms, error: fetchError } = await supabaseClient
      .from('farms')
      .select('id')
      .eq('is_active', true)
    
    if (fetchError) throw fetchError
    
    console.log(`Found ${farms?.length || 0} active farms`)
    
    // Update each farm's metrics
    const results = []
    for (const farm of (farms as FarmRecord[] || [])) {
      // Calculate performance metrics using the SQL function
      const { data: metrics, error } = await supabaseClient.rpc(
        'calculate_farm_performance',
        { farm_id: farm.id }
      )
      
      if (error) {
        console.error(`Error calculating metrics for farm ${farm.id}:`, error)
        continue
      }
      
      // Update the farm with the new metrics
      const { error: updateError } = await supabaseClient
        .from('farms')
        .update({ performance_metrics: metrics })
        .eq('id', farm.id)
      
      if (updateError) {
        console.error(`Error updating metrics for farm ${farm.id}:`, updateError)
        continue
      }
      
      results.push({ farmId: farm.id, success: true })
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated metrics for ${results.length} farms`,
        data: results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in update-farm-metrics function:', error)
    
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
