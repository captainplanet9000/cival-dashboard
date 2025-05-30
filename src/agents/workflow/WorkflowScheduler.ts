import { WorkflowExecutor } from './WorkflowExecutor';
import { WorkflowRegistry } from './WorkflowRegistry';
import { WorkflowParameters, WorkflowTemplate } from './WorkflowTemplate';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

/**
 * Interface representing a scheduled workflow.
 */
export interface ScheduledWorkflow {
    id: string;
    templateId: string;
    parameters: WorkflowParameters;
    schedule: WorkflowSchedule;
    lastExecutionTime?: Date;
    nextExecutionTime?: Date;
    status: 'active' | 'paused' | 'completed' | 'failed';
    createdAt: Date;
    createdBy?: string;
    description?: string;
    tags?: string[];
}

/**
 * Interface representing the schedule for a workflow.
 */
export interface WorkflowSchedule {
    type: 'one-time' | 'interval' | 'cron';
    
    // For one-time schedules
    executeAt?: Date;
    
    // For interval schedules
    interval?: {
        value: number;
        unit: 'seconds' | 'minutes' | 'hours' | 'days';
    };
    
    // For cron schedules
    cronExpression?: string;
    
    // Common properties
    startDate?: Date;
    endDate?: Date;
    maxExecutions?: number;
    executionCount?: number;
    timezone?: string;
}

/**
 * Class for scheduling and managing recurring workflow executions.
 */
export class WorkflowScheduler {
    private executor: WorkflowExecutor;
    private registry: WorkflowRegistry;
    private scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();
    private isRunning: boolean = false;
    private timers: Map<string, NodeJS.Timeout> = new Map();
    
    /**
     * Creates a new WorkflowScheduler.
     * @param executor The workflow executor
     * @param registry The workflow registry
     */
    constructor(executor: WorkflowExecutor, registry: WorkflowRegistry) {
        this.executor = executor;
        this.registry = registry;
    }
    
    /**
     * Schedules a new workflow to be executed according to the provided schedule.
     * @param templateId The ID of the workflow template
     * @param parameters The parameters for the workflow
     * @param schedule The schedule for the workflow
     * @param description Optional description for the scheduled workflow
     * @param tags Optional tags for the scheduled workflow
     * @returns The ID of the scheduled workflow
     */
    scheduleWorkflow(
        templateId: string,
        parameters: WorkflowParameters,
        schedule: WorkflowSchedule,
        description?: string,
        tags?: string[]
    ): string {
        // Validate template exists
        const template = this.registry.getTemplate(templateId);
        if (!template) {
            throw new Error(`Workflow template with ID ${templateId} not found`);
        }
        
        // Generate ID for the scheduled workflow
        const id = uuidv4();
        
        // Create scheduled workflow object
        const scheduledWorkflow: ScheduledWorkflow = {
            id,
            templateId,
            parameters,
            schedule: {
                ...schedule,
                executionCount: 0
            },
            status: 'active',
            createdAt: new Date(),
            description,
            tags
        };
        
        // Calculate next execution time
        this.calculateNextExecutionTime(scheduledWorkflow);
        
        // Add to scheduled workflows
        this.scheduledWorkflows.set(id, scheduledWorkflow);
        
        // Schedule the workflow
        this.scheduleNextExecution(scheduledWorkflow);
        
        logger.info(`Scheduled workflow ${id} with template ${templateId}`);
        
        return id;
    }
    
    /**
     * Pauses a scheduled workflow.
     * @param id The ID of the scheduled workflow
     */
    pauseScheduledWorkflow(id: string): void {
        const workflow = this.scheduledWorkflows.get(id);
        if (!workflow) {
            throw new Error(`Scheduled workflow with ID ${id} not found`);
        }
        
        workflow.status = 'paused';
        
        // Clear the timer for this workflow
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        
        logger.info(`Paused scheduled workflow ${id}`);
    }
    
    /**
     * Resumes a paused scheduled workflow.
     * @param id The ID of the scheduled workflow
     */
    resumeScheduledWorkflow(id: string): void {
        const workflow = this.scheduledWorkflows.get(id);
        if (!workflow) {
            throw new Error(`Scheduled workflow with ID ${id} not found`);
        }
        
        if (workflow.status !== 'paused') {
            throw new Error(`Scheduled workflow ${id} is not paused`);
        }
        
        workflow.status = 'active';
        this.calculateNextExecutionTime(workflow);
        this.scheduleNextExecution(workflow);
        
        logger.info(`Resumed scheduled workflow ${id}`);
    }
    
    /**
     * Cancels a scheduled workflow.
     * @param id The ID of the scheduled workflow
     */
    cancelScheduledWorkflow(id: string): void {
        const workflow = this.scheduledWorkflows.get(id);
        if (!workflow) {
            throw new Error(`Scheduled workflow with ID ${id} not found`);
        }
        
        // Clear the timer for this workflow
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        
        // Remove from scheduled workflows
        this.scheduledWorkflows.delete(id);
        
        logger.info(`Cancelled scheduled workflow ${id}`);
    }
    
    /**
     * Updates a scheduled workflow.
     * @param id The ID of the scheduled workflow
     * @param updates The updates to apply
     */
    updateScheduledWorkflow(
        id: string,
        updates: {
            parameters?: WorkflowParameters;
            schedule?: Partial<WorkflowSchedule>;
            description?: string;
            tags?: string[];
        }
    ): void {
        const workflow = this.scheduledWorkflows.get(id);
        if (!workflow) {
            throw new Error(`Scheduled workflow with ID ${id} not found`);
        }
        
        // Update parameters if provided
        if (updates.parameters) {
            workflow.parameters = updates.parameters;
        }
        
        // Update schedule if provided
        if (updates.schedule) {
            workflow.schedule = { ...workflow.schedule, ...updates.schedule };
            // Recalculate next execution time
            this.calculateNextExecutionTime(workflow);
            
            // Reschedule the workflow
            const timer = this.timers.get(id);
            if (timer) {
                clearTimeout(timer);
                this.timers.delete(id);
            }
            
            if (workflow.status === 'active') {
                this.scheduleNextExecution(workflow);
            }
        }
        
        // Update description if provided
        if (updates.description !== undefined) {
            workflow.description = updates.description;
        }
        
        // Update tags if provided
        if (updates.tags !== undefined) {
            workflow.tags = updates.tags;
        }
        
        logger.info(`Updated scheduled workflow ${id}`);
    }
    
    /**
     * Gets all scheduled workflows.
     * @returns All scheduled workflows
     */
    getScheduledWorkflows(): ScheduledWorkflow[] {
        return Array.from(this.scheduledWorkflows.values());
    }
    
    /**
     * Gets a scheduled workflow by ID.
     * @param id The ID of the scheduled workflow
     * @returns The scheduled workflow, or undefined if not found
     */
    getScheduledWorkflow(id: string): ScheduledWorkflow | undefined {
        return this.scheduledWorkflows.get(id);
    }
    
    /**
     * Starts the scheduler.
     */
    start(): void {
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;
        
        // Schedule all active workflows
        for (const workflow of this.scheduledWorkflows.values()) {
            if (workflow.status === 'active') {
                this.scheduleNextExecution(workflow);
            }
        }
        
        logger.info('Workflow scheduler started');
    }
    
    /**
     * Stops the scheduler.
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        // Clear all timers
        for (const [id, timer] of this.timers.entries()) {
            clearTimeout(timer);
        }
        
        this.timers.clear();
        
        logger.info('Workflow scheduler stopped');
    }
    
    /**
     * Executes a scheduled workflow now, regardless of its next scheduled execution time.
     * @param id The ID of the scheduled workflow
     * @returns The ID of the workflow execution
     */
    async executeNow(id: string): Promise<string> {
        const workflow = this.scheduledWorkflows.get(id);
        if (!workflow) {
            throw new Error(`Scheduled workflow with ID ${id} not found`);
        }
        
        return await this.executeWorkflow(workflow);
    }
    
    /**
     * Schedules the next execution of a workflow.
     * @param workflow The scheduled workflow
     */
    private scheduleNextExecution(workflow: ScheduledWorkflow): void {
        if (!this.isRunning || workflow.status !== 'active' || !workflow.nextExecutionTime) {
            return;
        }
        
        const now = new Date();
        const delay = Math.max(0, workflow.nextExecutionTime.getTime() - now.getTime());
        
        // Clear any existing timer for this workflow
        const existingTimer = this.timers.get(workflow.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        // Schedule execution
        const timer = setTimeout(async () => {
            try {
                await this.executeWorkflow(workflow);
                
                // Schedule next execution
                if (workflow.status === 'active') {
                    this.calculateNextExecutionTime(workflow);
                    this.scheduleNextExecution(workflow);
                }
            } catch (error: any) {
                logger.error(`Error executing scheduled workflow ${workflow.id}: ${error.message}`);
                workflow.status = 'failed';
            }
        }, delay);
        
        this.timers.set(workflow.id, timer);
        
        logger.info(`Scheduled next execution of workflow ${workflow.id} in ${delay}ms`);
    }
    
    /**
     * Executes a workflow.
     * @param workflow The scheduled workflow
     * @returns The ID of the workflow execution
     */
    private async executeWorkflow(workflow: ScheduledWorkflow): Promise<string> {
        const template = this.registry.getTemplate(workflow.templateId);
        if (!template) {
            throw new Error(`Workflow template with ID ${workflow.templateId} not found`);
        }
        
        try {
            // Execute the workflow
            const executionId = await this.executor.executeWorkflow(template, workflow.parameters);
            
            // Update execution count and last execution time
            workflow.schedule.executionCount = (workflow.schedule.executionCount || 0) + 1;
            workflow.lastExecutionTime = new Date();
            
            // Check if max executions has been reached
            if (workflow.schedule.maxExecutions && workflow.schedule.executionCount >= workflow.schedule.maxExecutions) {
                workflow.status = 'completed';
                logger.info(`Scheduled workflow ${workflow.id} completed (reached max executions: ${workflow.schedule.maxExecutions})`);
            }
            
            logger.info(`Executed scheduled workflow ${workflow.id} (execution ID: ${executionId})`);
            
            return executionId;
        } catch (error: any) {
            logger.error(`Failed to execute scheduled workflow ${workflow.id}: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Calculates the next execution time for a scheduled workflow.
     * @param workflow The scheduled workflow
     */
    private calculateNextExecutionTime(workflow: ScheduledWorkflow): void {
        const now = new Date();
        const schedule = workflow.schedule;
        
        // If end date is in the past, mark as completed
        if (schedule.endDate && schedule.endDate < now) {
            workflow.status = 'completed';
            workflow.nextExecutionTime = undefined;
            return;
        }
        
        // If max executions reached, mark as completed
        if (schedule.maxExecutions && schedule.executionCount && schedule.executionCount >= schedule.maxExecutions) {
            workflow.status = 'completed';
            workflow.nextExecutionTime = undefined;
            return;
        }
        
        switch (schedule.type) {
            case 'one-time':
                // For one-time schedules, use executeAt
                if (schedule.executeAt) {
                    workflow.nextExecutionTime = new Date(schedule.executeAt);
                } else {
                    // If no executeAt specified, use startDate or now
                    workflow.nextExecutionTime = schedule.startDate ? new Date(schedule.startDate) : new Date();
                }
                break;
                
            case 'interval':
                // For interval schedules, calculate next execution based on interval
                if (!schedule.interval) {
                    throw new Error('Interval schedule requires interval property');
                }
                
                let nextTime: Date;
                
                if (workflow.lastExecutionTime) {
                    // If has previous execution, calculate from there
                    nextTime = new Date(workflow.lastExecutionTime);
                } else if (schedule.startDate && schedule.startDate > now) {
                    // If start date is in future, use that
                    nextTime = new Date(schedule.startDate);
                } else {
                    // Otherwise, start from now
                    nextTime = now;
                }
                
                // Add interval
                if (workflow.lastExecutionTime) {
                    switch (schedule.interval.unit) {
                        case 'seconds':
                            nextTime.setSeconds(nextTime.getSeconds() + schedule.interval.value);
                            break;
                        case 'minutes':
                            nextTime.setMinutes(nextTime.getMinutes() + schedule.interval.value);
                            break;
                        case 'hours':
                            nextTime.setHours(nextTime.getHours() + schedule.interval.value);
                            break;
                        case 'days':
                            nextTime.setDate(nextTime.getDate() + schedule.interval.value);
                            break;
                    }
                }
                
                workflow.nextExecutionTime = nextTime;
                break;
                
            case 'cron':
                // Simplified cron implementation - in a real application, use a proper cron library
                if (!schedule.cronExpression) {
                    throw new Error('Cron schedule requires cronExpression property');
                }
                
                // This is a placeholder for cron calculation - in reality, use a library like node-cron
                // to calculate the next execution time based on the cron expression
                workflow.nextExecutionTime = new Date(now.getTime() + 60000); // Add 1 minute
                
                logger.warn(`Cron scheduling is simplified and does not actually parse cron expressions`);
                break;
                
            default:
                throw new Error(`Unknown schedule type: ${(schedule as any).type}`);
        }
        
        // Ensure next execution is after start date if specified
        if (schedule.startDate && workflow.nextExecutionTime < schedule.startDate) {
            workflow.nextExecutionTime = new Date(schedule.startDate);
        }
        
        // Ensure next execution is before end date if specified
        if (schedule.endDate && workflow.nextExecutionTime > schedule.endDate) {
            workflow.status = 'completed';
            workflow.nextExecutionTime = undefined;
        }
    }
    
    /**
     * Gets all scheduled workflows with the specified tag.
     * @param tag The tag to search for
     * @returns All scheduled workflows with the specified tag
     */
    getScheduledWorkflowsByTag(tag: string): ScheduledWorkflow[] {
        const results: ScheduledWorkflow[] = [];
        
        for (const workflow of this.scheduledWorkflows.values()) {
            if (workflow.tags && workflow.tags.includes(tag)) {
                results.push(workflow);
            }
        }
        
        return results;
    }
    
    /**
     * Gets all scheduled workflows for a specific template.
     * @param templateId The ID of the workflow template
     * @returns All scheduled workflows for the specified template
     */
    getScheduledWorkflowsByTemplate(templateId: string): ScheduledWorkflow[] {
        const results: ScheduledWorkflow[] = [];
        
        for (const workflow of this.scheduledWorkflows.values()) {
            if (workflow.templateId === templateId) {
                results.push(workflow);
            }
        }
        
        return results;
    }
} 