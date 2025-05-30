import { createServerClient } from '@/utils/supabase/server';
import { 
  Workflows, 
  WorkflowSteps, 
  WorkflowWithSteps, 
  WorkflowTemplates,
  WorkflowSchedules,
  WorkflowStatus,
  StepType
} from '@/types/workflows';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';

export class WorkflowService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase?: SupabaseClient<Database>) {
    // Allow dependency injection for testing
    this.supabase = supabase || createServerClient();
  }

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<Workflows[]> {
    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a workflow by id
   */
  async getWorkflow(id: string): Promise<WorkflowWithSteps | null> {
    const { data: workflow, error: workflowError } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError) {
      console.error('Error fetching workflow:', workflowError);
      throw new Error(`Failed to fetch workflow: ${workflowError.message}`);
    }

    if (!workflow) {
      return null;
    }

    // Get workflow steps
    const { data: steps, error: stepsError } = await this.supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', id)
      .order('position', { ascending: true });

    if (stepsError) {
      console.error('Error fetching workflow steps:', stepsError);
      throw new Error(`Failed to fetch workflow steps: ${stepsError.message}`);
    }

    return {
      ...workflow,
      steps: steps || []
    };
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    name: string,
    description: string,
    parameters: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('workflows')
      .insert({
        name,
        description,
        status: 'draft',
        parameters,
        metadata
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating workflow:', error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    revalidatePath('/dashboard/workflows');
    return data.id;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    id: string,
    updates: Partial<Workflows>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('workflows')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating workflow:', error);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }

    revalidatePath(`/dashboard/workflows/${id}`);
    revalidatePath('/dashboard/workflows');
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workflow:', error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }

    revalidatePath('/dashboard/workflows');
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    id: string,
    status: WorkflowStatus
  ): Promise<void> {
    await this.updateWorkflow(id, { status });
  }

  /**
   * Add a step to a workflow
   */
  async addWorkflowStep(
    workflowId: string,
    type: StepType,
    agentId: string | null,
    parameters: Record<string, any> = {},
    position?: number
  ): Promise<string> {
    // If position not provided, add to the end
    if (position === undefined) {
      const { data: steps, error: stepsError } = await this.supabase
        .from('workflow_steps')
        .select('position')
        .eq('workflow_id', workflowId)
        .order('position', { ascending: false })
        .limit(1);

      if (stepsError) {
        console.error('Error fetching workflow steps:', stepsError);
        throw new Error(`Failed to fetch workflow steps: ${stepsError.message}`);
      }

      position = steps && steps.length > 0 ? steps[0].position + 1 : 1;
    }

    const { data, error } = await this.supabase
      .from('workflow_steps')
      .insert({
        workflow_id: workflowId,
        agent_id: agentId,
        type,
        position,
        parameters,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding workflow step:', error);
      throw new Error(`Failed to add workflow step: ${error.message}`);
    }

    revalidatePath(`/dashboard/workflows/${workflowId}`);
    return data.id;
  }

  /**
   * Update a workflow step
   */
  async updateWorkflowStep(
    stepId: string,
    updates: Partial<WorkflowSteps>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_steps')
      .update(updates)
      .eq('id', stepId);

    if (error) {
      console.error('Error updating workflow step:', error);
      throw new Error(`Failed to update workflow step: ${error.message}`);
    }

    // Get the workflow id to revalidate the path
    const { data, error: getError } = await this.supabase
      .from('workflow_steps')
      .select('workflow_id')
      .eq('id', stepId)
      .single();

    if (!getError && data) {
      revalidatePath(`/dashboard/workflows/${data.workflow_id}`);
    }
  }

  /**
   * Delete a workflow step
   */
  async deleteWorkflowStep(stepId: string): Promise<void> {
    // Get the workflow id to revalidate the path
    const { data, error: getError } = await this.supabase
      .from('workflow_steps')
      .select('workflow_id')
      .eq('id', stepId)
      .single();

    const { error } = await this.supabase
      .from('workflow_steps')
      .delete()
      .eq('id', stepId);

    if (error) {
      console.error('Error deleting workflow step:', error);
      throw new Error(`Failed to delete workflow step: ${error.message}`);
    }

    if (!getError && data) {
      revalidatePath(`/dashboard/workflows/${data.workflow_id}`);
    }
  }

  /**
   * Reorder workflow steps
   */
  async reorderWorkflowSteps(
    workflowId: string,
    stepOrder: string[]
  ): Promise<void> {
    // Update positions in a transaction
    const { error } = await this.supabase.rpc('transaction', async (supabase) => {
      for (let i = 0; i < stepOrder.length; i++) {
        const stepId = stepOrder[i];
        const { error } = await supabase
          .from('workflow_steps')
          .update({ position: i + 1 })
          .eq('id', stepId)
          .eq('workflow_id', workflowId);

        if (error) {
          throw error;
        }
      }
    });

    if (error) {
      console.error('Error reordering workflow steps:', error);
      throw new Error(`Failed to reorder workflow steps: ${error.message}`);
    }

    revalidatePath(`/dashboard/workflows/${workflowId}`);
  }

  /**
   * Get all workflow templates
   */
  async getWorkflowTemplates(): Promise<WorkflowTemplates[]> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflow templates:', error);
      throw new Error(`Failed to fetch workflow templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get workflow template by id
   */
  async getWorkflowTemplate(id: string): Promise<WorkflowTemplates | null> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching workflow template:', error);
      throw new Error(`Failed to fetch workflow template: ${error.message}`);
    }

    return data;
  }

  /**
   * Instantiate a workflow from a template
   */
  async instantiateWorkflowTemplate(
    templateId: string,
    name?: string,
    description?: string,
    parameters?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('instantiate_workflow_template', {
        template_id: templateId,
        workflow_name: name,
        workflow_description: description,
        workflow_parameters: parameters,
        workflow_metadata: metadata
      });

    if (error) {
      console.error('Error instantiating workflow template:', error);
      throw new Error(`Failed to instantiate workflow template: ${error.message}`);
    }

    revalidatePath('/dashboard/workflows');
    return data as string;
  }

  /**
   * Get workflow schedules
   */
  async getWorkflowSchedules(workflowId?: string): Promise<WorkflowSchedules[]> {
    let query = this.supabase
      .from('workflow_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching workflow schedules:', error);
      throw new Error(`Failed to fetch workflow schedules: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a workflow schedule
   */
  async createWorkflowSchedule(
    workflowId: string,
    name: string,
    cronExpression: string,
    parameters: Record<string, any> = {},
    description?: string,
    active: boolean = true
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('workflow_schedules')
      .insert({
        workflow_id: workflowId,
        name,
        description,
        cron_expression: cronExpression,
        active,
        parameters
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating workflow schedule:', error);
      throw new Error(`Failed to create workflow schedule: ${error.message}`);
    }

    revalidatePath(`/dashboard/workflows/${workflowId}`);
    revalidatePath('/dashboard/workflows/schedules');
    return data.id;
  }

  /**
   * Update a workflow schedule
   */
  async updateWorkflowSchedule(
    scheduleId: string,
    updates: Partial<WorkflowSchedules>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_schedules')
      .update(updates)
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating workflow schedule:', error);
      throw new Error(`Failed to update workflow schedule: ${error.message}`);
    }

    // Get the workflow id to revalidate the path
    const { data, error: getError } = await this.supabase
      .from('workflow_schedules')
      .select('workflow_id')
      .eq('id', scheduleId)
      .single();

    if (!getError && data) {
      revalidatePath(`/dashboard/workflows/${data.workflow_id}`);
      revalidatePath('/dashboard/workflows/schedules');
    }
  }

  /**
   * Delete a workflow schedule
   */
  async deleteWorkflowSchedule(scheduleId: string): Promise<void> {
    // Get the workflow id to revalidate the path
    const { data, error: getError } = await this.supabase
      .from('workflow_schedules')
      .select('workflow_id')
      .eq('id', scheduleId)
      .single();

    const { error } = await this.supabase
      .from('workflow_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('Error deleting workflow schedule:', error);
      throw new Error(`Failed to delete workflow schedule: ${error.message}`);
    }

    if (!getError && data) {
      revalidatePath(`/dashboard/workflows/${data.workflow_id}`);
      revalidatePath('/dashboard/workflows/schedules');
    }
  }

  /**
   * Toggle a workflow schedule active status
   */
  async toggleWorkflowSchedule(scheduleId: string, active: boolean): Promise<void> {
    await this.updateWorkflowSchedule(scheduleId, { active });
  }

  /**
   * Trigger a workflow execution
   */
  async triggerWorkflow(
    workflowId: string,
    parameters: Record<string, any> = {},
    triggerType: 'manual' | 'schedule' | 'condition' | 'api' = 'manual',
    referenceId?: string
  ): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('trigger_workflow_execution', {
        workflow_id: workflowId,
        trigger_type: triggerType,
        reference_id: referenceId,
        execution_parameters: parameters
      });

    if (error) {
      console.error('Error triggering workflow execution:', error);
      throw new Error(`Failed to trigger workflow execution: ${error.message}`);
    }

    revalidatePath(`/dashboard/workflows/${workflowId}`);
    revalidatePath(`/dashboard/workflows/${workflowId}/executions`);
    return data as string;
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(workflowId: string): Promise<Database['public']['Tables']['workflow_executions']['Row'][]> {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflow executions:', error);
      throw new Error(`Failed to fetch workflow executions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get workflow execution details
   */
  async getWorkflowExecution(executionId: string): Promise<{
    execution: Database['public']['Tables']['workflow_executions']['Row'],
    steps: Database['public']['Tables']['workflow_execution_steps']['Row'][]
  } | null> {
    const { data: execution, error: executionError } = await this.supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (executionError) {
      console.error('Error fetching workflow execution:', executionError);
      throw new Error(`Failed to fetch workflow execution: ${executionError.message}`);
    }

    if (!execution) {
      return null;
    }

    const { data: steps, error: stepsError } = await this.supabase
      .from('workflow_execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true });

    if (stepsError) {
      console.error('Error fetching workflow execution steps:', stepsError);
      throw new Error(`Failed to fetch workflow execution steps: ${stepsError.message}`);
    }

    return {
      execution,
      steps: steps || []
    };
  }
}
