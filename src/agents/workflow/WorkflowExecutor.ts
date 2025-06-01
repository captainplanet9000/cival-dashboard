import { WorkflowTemplate, WorkflowParameters, WorkflowStep, WorkflowResult } from './WorkflowTemplate';
import { Tool } from '../../lib/tools/Tool';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

/**
 * Represents the status of a workflow execution
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Represents the state of a step execution
 */
export interface StepState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: Error;
}

/**
 * Represents a workflow execution
 */
export interface WorkflowExecution {
  id: string;
  templateId: string;
  parameters: WorkflowParameters;
  status: WorkflowStatus;
  steps: Record<string, StepState>;
  result?: any;
  error?: Error;
  startTime: Date;
  endTime?: Date;
  progress: number;
}

/**
 * A class responsible for executing workflow templates, tracking their progress,
 * and handling the results.
 */
export class WorkflowExecutor {
  private toolRegistry: Map<string, Tool>;
  private executions: Map<string, WorkflowExecution> = new Map();
  
  /**
   * Creates a new WorkflowExecutor instance.
   * @param toolRegistry Map of available tools by name
   */
  constructor(toolRegistry: Map<string, Tool>) {
    this.toolRegistry = toolRegistry;
  }
  
  /**
   * Executes a workflow template with the provided parameters.
   * @param template The workflow template to execute
   * @param parameters The parameters for the workflow
   * @returns A promise that resolves with the execution ID
   */
  async executeWorkflow(template: WorkflowTemplate, parameters: WorkflowParameters): Promise<string> {
    // Validate parameters against template
    try {
      parameters = template.applyDefaults(parameters);
    } catch (error) {
      logger.error('Parameter validation failed', { error });
      throw error;
    }
    
    // Generate the steps
    const steps = template.generateSteps(parameters);
    
    // Create execution record
    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      templateId: template.getMetadata().id,
      parameters,
      status: WorkflowStatus.PENDING,
      steps: {},
      startTime: new Date(),
      progress: 0
    };
    
    // Initialize step states
    steps.forEach(step => {
      execution.steps[step.id] = {
        id: step.id,
        status: 'pending'
      };
    });
    
    // Store execution
    this.executions.set(executionId, execution);
    
    // Start execution asynchronously
    this.runWorkflow(executionId, template, steps).catch(error => {
      logger.error('Workflow execution failed', { executionId, error });
      const execution = this.executions.get(executionId);
      if (execution) {
        execution.status = WorkflowStatus.FAILED;
        execution.error = error as Error;
        execution.endTime = new Date();
      }
    });
    
    return executionId;
  }
  
  /**
   * Runs a workflow with the given steps.
   * @param executionId The ID of the execution
   * @param template The workflow template
   * @param steps The steps to execute
   */
  private async runWorkflow(executionId: string, template: WorkflowTemplate, steps: WorkflowStep[]): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    // Update execution status
    execution.status = WorkflowStatus.RUNNING;
    
    // Create a record to store step results
    const stepResults: Record<string, any> = {};
    
    try {
      // Execute steps in dependency order
      await this.executeSteps(executionId, steps, stepResults);
      
      // Process results
      const result = template.processResults(stepResults);
      
      // Update execution record
      execution.status = WorkflowStatus.COMPLETED;
      execution.result = result;
      execution.endTime = new Date();
      execution.progress = 100;
      
      logger.info('Workflow execution completed successfully', { executionId });
    } catch (error) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = error as Error;
      execution.endTime = new Date();
      
      logger.error('Workflow execution failed', { executionId, error });
    }
  }
  
  /**
   * Executes the steps of a workflow in the correct order respecting dependencies.
   * @param executionId The ID of the execution
   * @param steps The steps to execute
   * @param stepResults Record to store step results
   */
  private async executeSteps(executionId: string, steps: WorkflowStep[], stepResults: Record<string, any>): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    // Create a map of steps by ID
    const stepsById = new Map<string, WorkflowStep>();
    steps.forEach(step => stepsById.set(step.id, step));
    
    // Create a set of completed steps
    const completedSteps = new Set<string>();
    
    // Continue until all steps are completed or failed
    while (completedSteps.size < steps.length) {
      // Find steps that can be executed (all dependencies are completed)
      const executableSteps = steps.filter(step => {
        // Skip steps that are already completed
        if (completedSteps.has(step.id)) {
          return false;
        }
        
        // Check if dependencies are completed
        if (step.dependsOn) {
          return step.dependsOn.every(depId => completedSteps.has(depId));
        }
        
        // No dependencies, can be executed
        return true;
      });
      
      // Check if we have steps to execute
      if (executableSteps.length === 0) {
        // If we still have steps remaining, we have a dependency cycle
        if (completedSteps.size < steps.length) {
          throw new Error('Dependency cycle detected in workflow steps');
        }
        break;
      }
      
      // Execute all applicable steps in parallel
      await Promise.all(executableSteps.map(async step => {
        try {
          await this.executeStep(executionId, step, stepResults);
          completedSteps.add(step.id);
        } catch (error) {
          logger.error('Step execution failed', { executionId, stepId: step.id, error });
          throw new Error(`Step ${step.id} failed: ${(error as Error).message}`);
        }
      }));
      
      // Update progress
      execution.progress = Math.round((completedSteps.size / steps.length) * 100);
    }
  }
  
  /**
   * Executes a single step of the workflow.
   * @param executionId The ID of the execution
   * @param step The step to execute
   * @param stepResults Record to store step results
   */
  private async executeStep(executionId: string, step: WorkflowStep, stepResults: Record<string, any>): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    // Update step status
    const stepState = execution.steps[step.id];
    stepState.status = 'running';
    stepState.startTime = new Date();
    
    logger.info('Executing step', { executionId, stepId: step.id });
    
    try {
      // Check if the tool is registered
      const tool = this.toolRegistry.get(step.tool);
      if (!tool) {
        throw new Error(`Tool ${step.tool} not found for step ${step.id}`);
      }
      
      // Execute the tool with the provided parameters
      const result = await tool.execute(step.parameters);
      
      // Store the result
      stepResults[step.id] = result;
      
      // Update step status
      stepState.status = 'completed';
      stepState.endTime = new Date();
      stepState.result = result;
      
      logger.info('Step completed successfully', { executionId, stepId: step.id });
    } catch (error) {
      // Update step status
      stepState.status = 'failed';
      stepState.endTime = new Date();
      stepState.error = error as Error;
      
      logger.error('Step execution failed', { executionId, stepId: step.id, error });
      
      // Rethrow the error to stop workflow execution
      throw error;
    }
  }
  
  /**
   * Gets the current state of a workflow execution.
   * @param executionId The ID of the execution
   * @returns The workflow execution state
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
  
  /**
   * Gets all workflow executions.
   * @returns All workflow executions
   */
  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }
  
  /**
   * Cancels a running workflow execution.
   * @param executionId The ID of the execution to cancel
   * @returns Whether the cancellation was successful
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== WorkflowStatus.RUNNING) {
      return false;
    }
    
    // Mark execution as cancelled
    execution.status = WorkflowStatus.CANCELLED;
    execution.endTime = new Date();
    
    logger.info('Workflow execution cancelled', { executionId });
    
    return true;
  }
  
  /**
   * Gets the result of a completed workflow execution.
   * @param executionId The ID of the execution
   * @returns The workflow execution result or undefined if not completed
   */
  getWorkflowResult(executionId: string): WorkflowResult | undefined {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== WorkflowStatus.COMPLETED) {
      return undefined;
    }
    
    return {
      success: true,
      stepResults: Object.fromEntries(
        Object.entries(execution.steps)
          .filter(([_, state]) => state.status === 'completed')
          .map(([id, state]) => [id, state.result])
      ),
      output: execution.result,
      executionTime: execution.endTime!.getTime() - execution.startTime.getTime()
    };
  }
} 