import { FarmAgent } from './farm/farm-service';
import { WorkflowType } from '@/components/agents/AgentWorkflow';
import { agentWorkflowService, WorkflowExecutionResult } from './agent-workflow';
import { workflowTemplateService } from './workflow-template-service';
import { llmService } from './llm-service';

// Collaboration task status
export type CollaborationStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// Agent role in collaboration
export type AgentRole = 
  | 'INITIATOR'  // Starts the collaboration
  | 'EXECUTOR'   // Executes actions
  | 'REVIEWER'   // Reviews and approves results
  | 'OBSERVER';  // Only observes the collaboration

// Agent assignment in a collaboration task
export interface AgentAssignment {
  agentId: string | number;
  role: AgentRole;
  status: CollaborationStatus;
  notes?: string;
}

// Collaboration task definition
export interface CollaborationTask {
  id: string;
  name: string;
  description?: string;
  farmId: string | number;
  collaborationType: string;
  status: CollaborationStatus;
  agentAssignments: AgentAssignment[];
  initiatedBy: string | number; // Agent ID
  initiatedAt: Date;
  completedAt?: Date;
  deadline?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata: Record<string, any>;
  results?: {
    summary: string;
    details: Record<string, any>;
  };
}

// Collaboration flow - defines how agents work together
export interface CollaborationFlow {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    stepNumber: number;
    role: AgentRole;
    agentType: string;
    workflowType?: WorkflowType;
    action: string;
    waitForApproval: boolean;
    timeout?: number; // In minutes
  }>;
}

// Predefined collaboration flows
const COLLABORATION_FLOWS: Record<string, CollaborationFlow> = {
  'MARKET_ANALYSIS_AND_TRADE': {
    id: 'market_analysis_and_trade',
    name: 'Market Analysis and Trade Execution',
    description: 'Analyst performs market analysis, then trader executes a trade based on analysis',
    steps: [
      {
        stepNumber: 1,
        role: 'INITIATOR',
        agentType: 'ANALYST',
        workflowType: 'MARKET_ANALYSIS',
        action: 'Perform market analysis on specified assets',
        waitForApproval: false,
        timeout: 30
      },
      {
        stepNumber: 2,
        role: 'REVIEWER',
        agentType: 'TRADER',
        action: 'Review market analysis and determine if trade is viable',
        waitForApproval: true,
        timeout: 60
      },
      {
        stepNumber: 3,
        role: 'EXECUTOR',
        agentType: 'TRADER',
        workflowType: 'TRADE_EXECUTION',
        action: 'Execute trade based on analysis recommendations',
        waitForApproval: false,
        timeout: 30
      },
      {
        stepNumber: 4,
        role: 'OBSERVER',
        agentType: 'MONITOR',
        action: 'Monitor trade execution and record results',
        waitForApproval: false,
        timeout: 15
      }
    ]
  },
  'RISK_ASSESSMENT_AND_REBALANCE': {
    id: 'risk_assessment_and_rebalance',
    name: 'Risk Assessment and Portfolio Rebalance',
    description: 'Monitor assesses portfolio risk, then trader rebalances portfolio if needed',
    steps: [
      {
        stepNumber: 1,
        role: 'INITIATOR',
        agentType: 'MONITOR',
        workflowType: 'RISK_ASSESSMENT',
        action: 'Evaluate portfolio risk metrics and identify imbalances',
        waitForApproval: false,
        timeout: 30
      },
      {
        stepNumber: 2,
        role: 'REVIEWER',
        agentType: 'ANALYST',
        action: 'Review risk assessment and provide recommendations',
        waitForApproval: true,
        timeout: 60
      },
      {
        stepNumber: 3,
        role: 'EXECUTOR',
        agentType: 'TRADER',
        workflowType: 'PORTFOLIO_REBALANCE',
        action: 'Rebalance portfolio based on risk assessment',
        waitForApproval: true,
        timeout: 45
      }
    ]
  },
  'MULTI_ASSET_ANALYSIS': {
    id: 'multi_asset_analysis',
    name: 'Multi-Asset Analysis',
    description: 'Multiple analysts analyze different assets and compile a comprehensive report',
    steps: [
      {
        stepNumber: 1,
        role: 'INITIATOR',
        agentType: 'ANALYST',
        workflowType: 'MARKET_ANALYSIS',
        action: 'Coordinate asset distribution and analysis parameters',
        waitForApproval: false,
        timeout: 15
      },
      {
        stepNumber: 2,
        role: 'EXECUTOR',
        agentType: 'ANALYST',
        workflowType: 'MARKET_ANALYSIS',
        action: 'Perform analysis on assigned assets',
        waitForApproval: false,
        timeout: 45
      },
      {
        stepNumber: 3,
        role: 'EXECUTOR',
        agentType: 'ANALYST',
        action: 'Compile individual analyses into comprehensive report',
        waitForApproval: false,
        timeout: 30
      },
      {
        stepNumber: 4,
        role: 'REVIEWER',
        agentType: 'TRADER',
        action: 'Review final report and determine actionable insights',
        waitForApproval: true,
        timeout: 30
      }
    ]
  }
};

/**
 * AgentCollaborationService - Enables multi-agent workflows and collaborations within a farm
 */
class AgentCollaborationService {
  private static instance: AgentCollaborationService;
  private collaborationTasks: CollaborationTask[] = [];

  // Private constructor for singleton pattern
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AgentCollaborationService {
    if (!AgentCollaborationService.instance) {
      AgentCollaborationService.instance = new AgentCollaborationService();
    }
    return AgentCollaborationService.instance;
  }

  /**
   * Get available collaboration flows
   */
  public getCollaborationFlows(): CollaborationFlow[] {
    return Object.values(COLLABORATION_FLOWS);
  }

  /**
   * Get a specific collaboration flow by ID
   * @param flowId The ID of the flow to retrieve
   */
  public getCollaborationFlowById(flowId: string): CollaborationFlow | undefined {
    return COLLABORATION_FLOWS[flowId];
  }

  /**
   * Create a new collaboration task
   * @param farmId The ID of the farm
   * @param flowId The ID of the collaboration flow
   * @param initiatorAgentId The ID of the agent initiating the collaboration
   * @param params Additional parameters for the collaboration
   */
  public async createCollaborationTask(
    farmId: string | number,
    flowId: string,
    initiatorAgentId: string | number,
    params: {
      name?: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      deadline?: Date;
      metadata?: Record<string, any>;
      agentAssignments?: Partial<Record<number, AgentRole>>;
    }
  ): Promise<CollaborationTask> {
    // Get the collaboration flow
    const flow = this.getCollaborationFlowById(flowId);
    
    if (!flow) {
      throw new Error(`Collaboration flow with ID ${flowId} not found`);
    }
    
    // Create a new collaboration task
    const newTask: CollaborationTask = {
      id: crypto.randomUUID(),
      name: params.name || flow.name,
      description: params.description || flow.description,
      farmId,
      collaborationType: flowId,
      status: 'PENDING',
      agentAssignments: [],
      initiatedBy: initiatorAgentId,
      initiatedAt: new Date(),
      priority: params.priority || 'MEDIUM',
      metadata: params.metadata || {},
    };
    
    // Add agent assignments based on flow steps
    // In a real implementation, we would query the farm for agents of the required types
    // For now, we'll use the provided agent assignments if available
    
    // Add the initiator agent
    newTask.agentAssignments.push({
      agentId: initiatorAgentId,
      role: 'INITIATOR',
      status: 'PENDING'
    });
    
    // Add other agent assignments if provided
    if (params.agentAssignments) {
      for (const [agentId, role] of Object.entries(params.agentAssignments)) {
        if (parseInt(agentId) !== initiatorAgentId && role) { // Skip initiator and undefined roles
          newTask.agentAssignments.push({
            agentId: parseInt(agentId),
            role: role,
            status: 'PENDING'
          });
        }
      }
    }
    
    // Store the task
    this.collaborationTasks.push(newTask);
    
    return newTask;
  }

  /**
   * Get all collaboration tasks for a farm
   * @param farmId The ID of the farm
   */
  public getCollaborationTasksByFarm(farmId: string | number): CollaborationTask[] {
    return this.collaborationTasks.filter(task => task.farmId === farmId);
  }

  /**
   * Get collaboration tasks for a specific agent
   * @param agentId The ID of the agent
   */
  public getCollaborationTasksByAgent(agentId: string | number): CollaborationTask[] {
    return this.collaborationTasks.filter(task => 
      task.agentAssignments.some(assignment => assignment.agentId === agentId)
    );
  }

  /**
   * Get a specific collaboration task by ID
   * @param taskId The ID of the task to retrieve
   */
  public getCollaborationTaskById(taskId: string): CollaborationTask | undefined {
    return this.collaborationTasks.find(task => task.id === taskId);
  }

  /**
   * Start a collaboration task
   * @param taskId The ID of the task to start
   */
  public async startCollaborationTask(taskId: string): Promise<CollaborationTask> {
    const task = this.getCollaborationTaskById(taskId);
    
    if (!task) {
      throw new Error(`Collaboration task with ID ${taskId} not found`);
    }
    
    if (task.status !== 'PENDING') {
      throw new Error(`Cannot start task with status ${task.status}`);
    }
    
    // Update task status
    task.status = 'IN_PROGRESS';
    
    // Update agent assignments for the first step
    const flow = this.getCollaborationFlowById(task.collaborationType);
    
    if (!flow) {
      throw new Error(`Collaboration flow for task ${taskId} not found`);
    }
    
    const firstStep = flow.steps[0];
    
    // Find the agent with the role required for the first step
    const firstStepAgent = task.agentAssignments.find(
      assignment => assignment.role === firstStep.role
    );
    
    if (!firstStepAgent) {
      throw new Error(`No agent assigned for role ${firstStep.role} in step 1`);
    }
    
    // Update agent status
    firstStepAgent.status = 'IN_PROGRESS';
    
    // In a real implementation, we would notify the agent to start their workflow
    // For now, we'll just return the updated task
    
    return task;
  }

  /**
   * Execute the current step of a collaboration task
   * @param taskId The ID of the task
   * @param agentId The ID of the agent executing the step
   * @param input Input data for the step
   */
  public async executeCollaborationStep(
    taskId: string,
    agentId: string | number,
    input: string
  ): Promise<{
    success: boolean;
    result?: any;
    nextStep?: number;
    error?: string;
  }> {
    const task = this.getCollaborationTaskById(taskId);
    
    if (!task) {
      throw new Error(`Collaboration task with ID ${taskId} not found`);
    }
    
    const flow = this.getCollaborationFlowById(task.collaborationType);
    
    if (!flow) {
      throw new Error(`Collaboration flow for task ${taskId} not found`);
    }
    
    // Find the current step
    const currentStepIndex = flow.steps.findIndex(step => {
      const stepAgent = task.agentAssignments.find(
        assignment => assignment.role === step.role && assignment.status === 'IN_PROGRESS'
      );
      return stepAgent !== undefined;
    });
    
    if (currentStepIndex === -1) {
      throw new Error(`No active step found for task ${taskId}`);
    }
    
    const currentStep = flow.steps[currentStepIndex];
    
    // Verify the agent is assigned to the current step
    const stepAgent = task.agentAssignments.find(
      assignment => assignment.agentId === agentId && assignment.role === currentStep.role
    );
    
    if (!stepAgent) {
      throw new Error(`Agent ${agentId} is not assigned to the current step of task ${taskId}`);
    }
    
    try {
      let result: any;
      
      // Execute the step based on the action type
      if (currentStep.workflowType) {
        // Execute a workflow
        // In a real implementation, we would fetch the agent and execute its workflow
        // For now, we'll mock the workflow execution
        
        result = {
          success: true,
          message: `Simulated execution of ${currentStep.workflowType} workflow by agent ${agentId}`,
          data: {
            workflowResult: `Result of ${currentStep.workflowType} workflow with input: ${input}`,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        // Execute a manual action (e.g., review, coordination)
        result = {
          success: true,
          message: `Executed manual action: ${currentStep.action}`,
          data: {
            notes: input,
            timestamp: new Date().toISOString()
          }
        };
      }
      
      // Update step agent status
      stepAgent.status = 'COMPLETED';
      stepAgent.notes = `Completed step ${currentStep.stepNumber}: ${result.message}`;
      
      // Determine if collaboration is complete or moves to next step
      if (currentStepIndex === flow.steps.length - 1) {
        // Last step completed, collaboration is complete
        task.status = 'COMPLETED';
        task.completedAt = new Date();
        task.results = {
          summary: `Collaboration ${task.name} completed successfully`,
          details: {
            steps: flow.steps.map((step, index) => {
              const agent = task.agentAssignments.find(a => a.role === step.role);
              return {
                step: step.stepNumber,
                action: step.action,
                agent: agent?.agentId,
                status: agent?.status,
                notes: agent?.notes
              };
            }),
            finalOutput: result.data
          }
        };
        
        return {
          success: true,
          result,
          nextStep: -1 // Indicates completion
        };
      } else {
        // Move to next step
        const nextStep = flow.steps[currentStepIndex + 1];
        const nextStepAgent = task.agentAssignments.find(
          assignment => assignment.role === nextStep.role
        );
        
        if (!nextStepAgent) {
          throw new Error(`No agent assigned for role ${nextStep.role} in step ${nextStep.stepNumber}`);
        }
        
        // Update next step agent status
        nextStepAgent.status = 'IN_PROGRESS';
        
        return {
          success: true,
          result,
          nextStep: nextStep.stepNumber
        };
      }
    } catch (error: any) {
      // Update step agent status
      stepAgent.status = 'FAILED';
      stepAgent.notes = `Failed step ${currentStep.stepNumber}: ${error.message}`;
      
      // Update task status
      task.status = 'FAILED';
      
      return {
        success: false,
        error: error.message || `Failed to execute step ${currentStep.stepNumber}`
      };
    }
  }

  /**
   * Approve a collaboration step that requires approval
   * @param taskId The ID of the task
   * @param stepNumber The step number to approve
   * @param approverAgentId The ID of the agent approving the step
   * @param notes Optional notes for the approval
   */
  public async approveCollaborationStep(
    taskId: string,
    stepNumber: number,
    approverAgentId: string | number,
    notes?: string
  ): Promise<boolean> {
    const task = this.getCollaborationTaskById(taskId);
    
    if (!task) {
      throw new Error(`Collaboration task with ID ${taskId} not found`);
    }
    
    const flow = this.getCollaborationFlowById(task.collaborationType);
    
    if (!flow) {
      throw new Error(`Collaboration flow for task ${taskId} not found`);
    }
    
    // Find the step
    const stepIndex = flow.steps.findIndex(step => step.stepNumber === stepNumber);
    
    if (stepIndex === -1) {
      throw new Error(`Step ${stepNumber} not found in task ${taskId}`);
    }
    
    const step = flow.steps[stepIndex];
    
    if (!step.waitForApproval) {
      throw new Error(`Step ${stepNumber} does not require approval`);
    }
    
    // Find the agent assigned to the step
    const stepAgent = task.agentAssignments.find(
      assignment => assignment.role === step.role
    );
    
    if (!stepAgent) {
      throw new Error(`No agent assigned for role ${step.role} in step ${stepNumber}`);
    }
    
    // Verify the step is completed (waiting for approval)
    if (stepAgent.status !== 'COMPLETED') {
      throw new Error(`Step ${stepNumber} is not completed and ready for approval`);
    }
    
    // Verify the approver agent is assigned to the next step or has a reviewer role
    const approverIsValid = task.agentAssignments.some(
      assignment => 
        assignment.agentId === approverAgentId && 
        (assignment.role === 'REVIEWER' || 
          (stepIndex < flow.steps.length - 1 && 
            assignment.role === flow.steps[stepIndex + 1].role))
    );
    
    if (!approverIsValid) {
      throw new Error(`Agent ${approverAgentId} is not authorized to approve step ${stepNumber}`);
    }
    
    // Update step agent notes with approval
    if (notes) {
      stepAgent.notes = `${stepAgent.notes || ''}\nApproved by ${approverAgentId}: ${notes}`;
    }
    
    // If there's a next step, update its agent status
    if (stepIndex < flow.steps.length - 1) {
      const nextStep = flow.steps[stepIndex + 1];
      const nextStepAgent = task.agentAssignments.find(
        assignment => assignment.role === nextStep.role
      );
      
      if (nextStepAgent) {
        nextStepAgent.status = 'IN_PROGRESS';
      }
    } else {
      // Last step approved, collaboration is complete
      task.status = 'COMPLETED';
      task.completedAt = new Date();
    }
    
    return true;
  }

  /**
   * Cancel a collaboration task
   * @param taskId The ID of the task to cancel
   * @param reason Optional reason for cancellation
   */
  public async cancelCollaborationTask(
    taskId: string,
    reason?: string
  ): Promise<boolean> {
    const task = this.getCollaborationTaskById(taskId);
    
    if (!task) {
      throw new Error(`Collaboration task with ID ${taskId} not found`);
    }
    
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      throw new Error(`Cannot cancel task with status ${task.status}`);
    }
    
    // Update task status
    task.status = 'CANCELLED';
    
    // Update all in-progress agent assignments
    task.agentAssignments.forEach(assignment => {
      if (assignment.status === 'IN_PROGRESS') {
        assignment.status = 'CANCELLED';
        assignment.notes = `Cancelled: ${reason || 'No reason provided'}`;
      }
    });
    
    return true;
  }

  /**
   * Generate a collaboration summary using LLM
   * @param taskId The ID of the task to summarize
   */
  public async generateCollaborationSummary(taskId: string): Promise<string> {
    const task = this.getCollaborationTaskById(taskId);
    
    if (!task) {
      throw new Error(`Collaboration task with ID ${taskId} not found`);
    }
    
    if (task.status !== 'COMPLETED') {
      throw new Error(`Cannot generate summary for incomplete task with status ${task.status}`);
    }
    
    const flow = this.getCollaborationFlowById(task.collaborationType);
    
    if (!flow) {
      throw new Error(`Collaboration flow for task ${taskId} not found`);
    }
    
    // Format the task data for LLM input
    const collaborationData = {
      name: task.name,
      description: task.description,
      type: flow.name,
      steps: flow.steps.map((step, index) => {
        const agent = task.agentAssignments.find(a => a.role === step.role);
        return {
          number: step.stepNumber,
          action: step.action,
          role: step.role,
          agentId: agent?.agentId,
          status: agent?.status,
          notes: agent?.notes
        };
      }),
      results: task.results
    };
    
    // In a real implementation, we would use the LLM service to generate a summary
    // For now, we'll return a mock summary
    
    let summary = `# Collaboration Summary: ${task.name}\n\n`;
    summary += `## Overview\n`;
    summary += `- **Type**: ${flow.name}\n`;
    summary += `- **Status**: ${task.status}\n`;
    summary += `- **Initiated**: ${task.initiatedAt.toLocaleString()}\n`;
    summary += `- **Completed**: ${task.completedAt?.toLocaleString() || 'N/A'}\n\n`;
    
    summary += `## Participants\n`;
    task.agentAssignments.forEach(assignment => {
      summary += `- Agent ${assignment.agentId} (${assignment.role}): ${assignment.status}\n`;
    });
    
    summary += `\n## Process\n`;
    flow.steps.forEach(step => {
      const agent = task.agentAssignments.find(a => a.role === step.role);
      summary += `### Step ${step.stepNumber}: ${step.action}\n`;
      summary += `- Role: ${step.role}\n`;
      summary += `- Agent: ${agent?.agentId || 'Not assigned'}\n`;
      summary += `- Status: ${agent?.status || 'Unknown'}\n`;
      
      if (agent?.notes) {
        summary += `- Notes: ${agent.notes}\n`;
      }
      
      summary += `\n`;
    });
    
    if (task.results) {
      summary += `## Results\n`;
      summary += `${task.results.summary}\n\n`;
      
      if (task.results.details.finalOutput) {
        summary += `### Final Output\n`;
        summary += `${JSON.stringify(task.results.details.finalOutput, null, 2)}\n\n`;
      }
    }
    
    return summary;
  }
}

// Export singleton instance
export const agentCollaborationService = AgentCollaborationService.getInstance(); 