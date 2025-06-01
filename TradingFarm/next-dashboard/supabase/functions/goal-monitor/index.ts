// This edge function monitors goals for deadlines and progress milestones
// It can send notifications when goals are nearing deadlines or completion

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { format, addDays, differenceInDays } from 'https://esm.sh/date-fns@2.29.3'

interface Goal {
  id: string;
  farm_id: string | number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
  user_id: string;
}

interface Notification {
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata: Record<string, any>;
  is_read: boolean;
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

    console.log('Starting goal monitoring job')

    // Get current date
    const today = new Date()
    
    // Process specific goal if provided, otherwise process all active goals
    const { goalId } = await req.json().catch(() => ({ goalId: null }))
    
    let goalsQuery = supabaseClient
      .from('goals')
      .select('id, farm_id, name, target_amount, current_amount, target_date, status, user_id')
      .not('status', 'eq', 'COMPLETED')
      .not('status', 'eq', 'FAILED')
    
    if (goalId) {
      goalsQuery = goalsQuery.eq('id', goalId)
    }
    
    const { data: goals, error: goalsError } = await goalsQuery
    
    if (goalsError) {
      throw goalsError
    }
    
    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active goals to monitor'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Monitoring ${goals.length} active goals`)
    
    // Array to collect notifications that will be sent
    const notifications: Notification[] = []
    const goalUpdates: any[] = []
    
    // Process each goal
    for (const goal of goals as Goal[]) {
      // Calculate progress percentage
      const progressPercent = (goal.current_amount / goal.target_amount) * 100
      
      // Check if goal is near completion (90% or more)
      if (progressPercent >= 90 && progressPercent < 100) {
        notifications.push({
          user_id: goal.user_id,
          title: 'Goal Near Completion',
          message: `Your goal "${goal.name}" is at ${progressPercent.toFixed(1)}% completion!`,
          type: 'goal_progress',
          metadata: {
            goal_id: goal.id,
            farm_id: goal.farm_id,
            progress: progressPercent
          },
          is_read: false
        })
      }
      
      // Check if goal has target date and is approaching deadline
      if (goal.target_date) {
        const targetDate = new Date(goal.target_date)
        const daysRemaining = differenceInDays(targetDate, today)
        
        // Check if goal is due within 7 days
        if (daysRemaining > 0 && daysRemaining <= 7) {
          notifications.push({
            user_id: goal.user_id,
            title: 'Goal Deadline Approaching',
            message: `Your goal "${goal.name}" is due in ${daysRemaining} days`,
            type: 'goal_deadline',
            metadata: {
              goal_id: goal.id,
              farm_id: goal.farm_id,
              days_remaining: daysRemaining,
              target_date: goal.target_date
            },
            is_read: false
          })
        }
        
        // Check if goal is overdue
        if (daysRemaining < 0 && goal.status !== 'FAILED') {
          notifications.push({
            user_id: goal.user_id,
            title: 'Goal Overdue',
            message: `Your goal "${goal.name}" has missed its target date`,
            type: 'goal_overdue',
            metadata: {
              goal_id: goal.id,
              farm_id: goal.farm_id,
              days_overdue: Math.abs(daysRemaining),
              target_date: goal.target_date
            },
            is_read: false
          })
          
          // Mark goal as failed if it's overdue
          goalUpdates.push({
            id: goal.id,
            status: 'FAILED',
            updated_at: new Date().toISOString()
          })
        }
      }
      
      // Check if goal is stalled (no progress in 30 days)
      const { data: lastTransaction } = await supabaseClient
        .from('goal_transactions')
        .select('created_at')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (lastTransaction) {
        const lastActivityDate = new Date(lastTransaction.created_at)
        const daysSinceActivity = differenceInDays(today, lastActivityDate)
        
        if (daysSinceActivity > 30) {
          notifications.push({
            user_id: goal.user_id,
            title: 'Goal Stalled',
            message: `Your goal "${goal.name}" has had no activity for ${daysSinceActivity} days`,
            type: 'goal_stalled',
            metadata: {
              goal_id: goal.id,
              farm_id: goal.farm_id,
              days_inactive: daysSinceActivity,
              last_activity: lastTransaction.created_at
            },
            is_read: false
          })
        }
      }
    }
    
    // Save notifications to the database
    if (notifications.length > 0) {
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert(notifications)
      
      if (notifError) {
        console.error('Error saving notifications:', notifError)
      } else {
        console.log(`Created ${notifications.length} notifications`)
      }
    }
    
    // Update goal statuses if needed
    if (goalUpdates.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('goals')
        .upsert(goalUpdates)
      
      if (updateError) {
        console.error('Error updating goals:', updateError)
      } else {
        console.log(`Updated ${goalUpdates.length} goal statuses`)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Monitored ${goals.length} goals`,
        data: {
          notifications_created: notifications.length,
          goals_updated: goalUpdates.length
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in goal-monitor function:', error)
    
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
