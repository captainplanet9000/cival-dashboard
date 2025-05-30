/**
 * Alert Evaluation Background Job
 * Scheduled job to evaluate alert rules and generate notifications
 */

import { createServerClient } from '@/utils/supabase/server';
import { AlertEvaluationService } from '../monitoring/alert-evaluation-service';

export class AlertEvaluationJob {
  /**
   * Run the alert evaluation job for all users
   */
  static async run(): Promise<void> {
    try {
      console.log('[AlertEvaluationJob] Starting alert rule evaluation job');
      
      // Get supabase client
      const supabase = await createServerClient();
      
      // Get active users that have alert rules configured
      const { data: users, error } = await supabase
        .from('alert_rules')
        .select('user_id')
        .eq('is_active', true)
        .order('user_id')
        .distinctOn('user_id');
      
      if (error) {
        throw error;
      }
      
      console.log(`[AlertEvaluationJob] Found ${users?.length || 0} users with active alert rules`);
      
      // Process each user's alert rules
      const results = [];
      for (const user of users || []) {
        try {
          await AlertEvaluationService.evaluateUserAlertRules(user.user_id);
          results.push({ userId: user.user_id, success: true });
        } catch (error) {
          console.error(`[AlertEvaluationJob] Error processing user ${user.user_id}:`, error);
          results.push({ 
            userId: user.user_id, 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Log job completion
      console.log(`[AlertEvaluationJob] Completed with ${results.filter(r => r.success).length} successes and ${results.filter(r => !r.success).length} failures`);
      
      // Record job execution in monitoring_jobs table
      await this.recordJobExecution(results);
    } catch (error) {
      console.error('[AlertEvaluationJob] Job execution failed:', error);
      
      // Record job failure
      await this.recordJobExecution([], error);
    }
  }
  
  /**
   * Record job execution in the database
   */
  private static async recordJobExecution(
    results: Array<{ userId: string; success: boolean; error?: string }>,
    jobError?: any
  ): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      const executionRecord = {
        job_type: 'alert_evaluation',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: jobError ? 'failed' : 'completed',
        error_message: jobError ? (jobError instanceof Error ? jobError.message : String(jobError)) : null,
        processed_count: results.length,
        success_count: results.filter(r => r.success).length,
        failure_count: results.filter(r => !r.success).length,
        details: {
          userResults: results,
        },
      };
      
      const { error } = await supabase
        .from('monitoring_jobs')
        .insert(executionRecord);
      
      if (error) {
        console.error('[AlertEvaluationJob] Error recording job execution:', error);
      }
    } catch (error) {
      console.error('[AlertEvaluationJob] Error recording job execution:', error);
    }
  }
}
