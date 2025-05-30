import { createServerClient } from '@/utils/supabase/server';
import { 
  WorkflowContext, 
  WorkflowResult, 
  StepResult,
  CollaborationMessage 
} from '@/types/workflows';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';
import { ToolService } from './tool.service';
import { ElizaCommandService } from './eliza-command-service';
import { WorkflowService } from './workflow.service';
import { AgentService } from './agent.service';

export class WorkflowExecutionService {
  private supabase: SupabaseClient<Database>;
  private toolService: ToolService;
  private elizaCommandService: ElizaCommandService;
  private workflowService: WorkflowService;
  private agentService: AgentService;

  constructor(supabase?: SupabaseClient<Database>) {
    // Allow dependency injection for testing
    this.supabase = supabase || createServerClient();
    this.toolService = new ToolService();
    this.elizaCommandService = new ElizaCommandService();
    this.workflowService = new WorkflowService(this.supabase);
    this.agentService = new AgentService(this.supabase);
  }

  /**
   * Execute a workflow by ID
   */
  async executeWorkflow(workflowId: string, parameters: Record<string, any> = {}): Promise<WorkflowResult> {
    console.log(`Starting execution of workflow: ${workflowId}`);
    
    try {
      // Get the workflow with its steps
      const workflow = await this.workflowService.getWorkflow(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow with ID ${workflowId} not found`);
      }
      
      // Check if workflow is active
      if (workflow.status !== 'active') {
        throw new Error(`Workflow with ID ${workflowId} is not active (status: ${workflow.status})`);
      }
      
      // Initialize workflow context
      const context: WorkflowContext = {
        workflowId,
        parameters: { ...workflow.parameters, ...parameters },
        results: {},
        startTime: new Date(),
        endTime: null,
        status: 'running'
      };
      
      // Create execution record in the database
      const { data: executionRecord, error: executionError } = await this.supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          triggered_by: parameters.triggerType || 'manual',
          reference_id: parameters.referenceId,
          status: 'running',
          parameters: { ...workflow.parameters, ...parameters },
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (executionError) {
        console.error('Error creating workflow execution record:', executionError);
        throw new Error(`Failed to create workflow execution record: ${executionError.message}`);
      }
      
      const executionId = executionRecord.id;
      
      // Execute steps in sequence
      for (const step of workflow.steps) {
        // Create execution step record
        const { data: executionStep, error: stepError } = await this.supabase
          .from('workflow_execution_steps')
          .insert({
            execution_id: executionId,
            step_id: step.id,
            status: 'running',
            started_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (stepError) {
          console.error('Error creating workflow execution step record:', stepError);
          // Continue executing despite the error
        }
        
        // Execute the step
        try {
          await this.executeStep(step, context);
          
          // Update execution step record
          if (executionStep) {
            await this.supabase
              .from('workflow_execution_steps')
              .update({
                status: 'completed',
                result: context.results[step.id]?.result || null,
                completed_at: new Date().toISOString()
              })
              .eq('id', executionStep.id);
          }
        } catch (error: any) {
          console.error(`Error executing step ${step.id}:`, error);
          
          // Update execution step record with error
          if (executionStep) {
            await this.supabase
              .from('workflow_execution_steps')
              .update({
                status: 'failed',
                error: error.message,
                completed_at: new Date().toISOString()
              })
              .eq('id', executionStep.id);
          }
          
          // Update context status
          context.status = 'failed';
          
          // Store step result in context with error
          context.results[step.id] = {
            status: 'failed',
            error: error.message
          };
          
          // Break execution if step failed
          break;
        }
      }
      
      // Finalize workflow execution
      context.endTime = new Date();
      context.status = context.status === 'running' ? 'completed' : context.status;
      
      // Update execution record
      await this.supabase
        .from('workflow_executions')
        .update({
          status: context.status,
          results: context.results,
          completed_at: context.endTime.toISOString()
        })
        .eq('id', executionId);
      
      // Revalidate paths
      revalidatePath(`/dashboard/workflows/${workflowId}`);
      revalidatePath(`/dashboard/workflows/${workflowId}/executions`);
      revalidatePath(`/dashboard/workflows/${workflowId}/executions/${executionId}`);
      
      // Return result
      return {
        workflowId,
        status: context.status,
        results: context.results,
        startTime: context.startTime,
        endTime: context.endTime
      };
    } catch (error: any) {
      console.error(`Error executing workflow ${workflowId}:`, error);
      
      return {
        workflowId,
        status: 'failed',
        error: error.message,
        startTime: new Date(),
        endTime: new Date()
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: any, context: WorkflowContext): Promise<void> {
    console.log(`Executing step ${step.id} of type ${step.type}`);
    
    try {
      // Get the agent for this step if an agent_id is provided
      let agent = null;
      if (step.agent_id) {
        agent = await this.agentService.getAgentById(step.agent_id);
        if (!agent) {
          throw new Error(`Agent with ID ${step.agent_id} not found`);
        }
      }
      
      // Process the step based on its type
      switch (step.type) {
        case 'llm_analysis':
          await this.executeLLMAnalysisStep(step, agent, context);
          break;
        case 'tool_execution':
          await this.executeToolStep(step, agent, context);
          break;
        case 'decision':
          await this.executeDecisionStep(step, agent, context);
          break;
        case 'collaboration':
          await this.executeCollaborationStep(step, agent, context);
          break;
        case 'notification':
          await this.executeNotificationStep(step, agent, context);
          break;
        case 'system':
          await this.executeSystemStep(step, context);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      // Store step result in context
      context.results[step.id] = {
        status: 'completed',
        result: step.result
      };
      
      console.log(`Step ${step.id} completed`);
    } catch (error: any) {
      console.error(`Error executing step ${step.id}:`, error);
      
      // Store step result in context with error
      context.results[step.id] = {
        status: 'failed',
        error: error.message
      };
      
      // Re-throw the error to be caught by the caller
      throw error;
    }
  }

  /**
   * Execute an LLM analysis step
   */
  private async executeLLMAnalysisStep(step: any, agent: any, context: WorkflowContext): Promise<void> {
    const { prompt, model, options } = step.parameters;
    
    // Process the prompt with context variables
    const processedPrompt = this.processVariables(prompt, context);
    
    // Get the agent model from parameters or use a default
    const agentModel = agent?.parameters?.defaultModel || 'gpt-4';
    
    // Execute LLM analysis through ElizaOS
    const response = await this.elizaCommandService.executeCommand({
      agentId: agent?.id,
      command: 'analyze',
      parameters: {
        prompt: processedPrompt,
        model: model || agentModel,
        options: options || {}
      }
    });
    
    // Update step with result
    step.result = response;
  }

  /**
   * Execute a tool execution step
   */
  private async executeToolStep(step: any, agent: any, context: WorkflowContext): Promise<void> {
    const { toolName, parameters } = step.parameters;
    
    // Check if agent has permission to use this tool
    if (agent && !await this.agentService.hasToolPermission(agent.id, toolName)) {
      throw new Error(`Agent ${agent.name} does not have permission to use tool: ${toolName}`);
    }
    
    // Process parameters with context variables
    const processedParameters = this.processObjectVariables(parameters, context);
    
    // Execute the tool
    const result = await this.toolService.executeTool(toolName, processedParameters);
    
    // Update step with result
    step.result = result;
  }

  /**
   * Execute a decision step
   */
  private async executeDecisionStep(step: any, agent: any, context: WorkflowContext): Promise<void> {
    const { condition, options } = step.parameters;
    
    // Evaluate the condition against the context
    const decision = await this.evaluateCondition(condition, context);
    
    // Find the matching option
    const selectedOption = options.find((opt: any) => opt.value === decision) || 
      options.find((opt: any) => opt.isDefault);
    
    if (!selectedOption) {
      throw new Error(`No matching option found for decision: ${decision}`);
    }
    
    // Update step with result
    step.result = {
      decision,
      selectedOption: selectedOption.value,
      nextStep: selectedOption.nextStep
    };
  }

  /**
   * Execute a collaboration step
   */
  private async executeCollaborationStep(step: any, agent: any, context: WorkflowContext): Promise<void> {
    const { collaborators, topic, maxRounds = 3 } = step.parameters;
    
    if (!agent) {
      throw new Error('Collaboration step requires an agent');
    }
    
    // Retrieve all collaborator agents
    const collaboratorAgents = await Promise.all(
      collaborators.map((id: string) => this.agentService.getAgentById(id))
    );
    
    // Initialize collaboration
    const collaboration: {
      topic: string;
      agents: any[];
      messages: CollaborationMessage[];
      status: string;
    } = {
      topic,
      agents: [agent, ...collaboratorAgents.filter(a => a !== null)],
      messages: [],
      status: 'active'
    };
    
    // Process the collaboration for the specified number of rounds
    let currentRound = 0;
    while (currentRound < maxRounds && collaboration.status === 'active') {
      // Process each agent's turn in the collaboration
      for (const currentAgent of collaboration.agents) {
        const message = await this.generateCollaborationMessage(
          currentAgent,
          collaboration.messages,
          topic,
          context
        );
        
        collaboration.messages.push({
          agentId: currentAgent.id,
          message,
          timestamp: new Date()
        });
        
        // Check if collaboration should end
        if (message.toLowerCase().includes('[end collaboration]')) {
          collaboration.status = 'completed';
          break;
        }
      }
      
      currentRound++;
    }
    
    // Extract final conclusion
    const conclusion = this.extractCollaborationConclusion(collaboration.messages);
    
    // Update step with result
    step.result = {
      messages: collaboration.messages,
      conclusion,
      rounds: currentRound
    };
  }

  /**
   * Execute a notification step
   */
  private async executeNotificationStep(step: any, agent: any, context: WorkflowContext): Promise<void> {
    const { channel, recipient, subject, message } = step.parameters.parameters;
    
    // Process message variables
    const processedSubject = this.processVariables(subject, context);
    const processedMessage = this.processVariables(message, context);
    
    // Execute notification through tool service
    const result = await this.toolService.executeTool('send_notification', {
      channel: this.processVariables(channel, context),
      recipient: this.processVariables(recipient, context),
      subject: processedSubject,
      message: processedMessage
    });
    
    // Update step with result
    step.result = result;
  }

  /**
   * Execute a system step
   */
  private async executeSystemStep(step: any, context: WorkflowContext): Promise<void> {
    const { action, parameters } = step.parameters;
    
    // Process parameters
    const processedParameters = this.processObjectVariables(parameters, context);
    
    let result;
    
    switch (action) {
      case 'wait':
        // Wait for specified duration
        const duration = processedParameters.duration || 5000; // Default 5 seconds
        await new Promise(resolve => setTimeout(resolve, duration));
        result = { waited: duration };
        break;
      
      case 'log':
        // Log message to console
        console.log(`[Workflow ${context.workflowId}] ${processedParameters.message}`);
        result = { logged: processedParameters.message };
        break;
      
      case 'set_variable':
        // Set variable in context
        if (!processedParameters.name) {
          throw new Error('Variable name is required for set_variable action');
        }
        
        context.parameters[processedParameters.name] = processedParameters.value;
        result = { 
          variableName: processedParameters.name, 
          variableValue: processedParameters.value 
        };
        break;
      
      default:
        throw new Error(`Unknown system action: ${action}`);
    }
    
    // Update step with result
    step.result = result;
  }

  /**
   * Generate a collaboration message
   */
  private async generateCollaborationMessage(
    agent: any,
    messages: CollaborationMessage[],
    topic: string,
    context: WorkflowContext
  ): Promise<string> {
    // Create prompt for the agent to generate next message
    const prompt = this.createCollaborationPrompt(agent, messages, topic, context);
    
    // Generate message using ElizaOS
    const message = await this.elizaCommandService.executeCommand({
      agentId: agent.id,
      command: 'generate',
      parameters: {
        prompt,
        role: agent.role
      }
    });
    
    return message;
  }

  /**
   * Create a prompt for collaboration
   */
  private createCollaborationPrompt(
    agent: any,
    messages: CollaborationMessage[],
    topic: string,
    context: WorkflowContext
  ): string {
    // Create conversation history
    const history = messages.map(msg => {
      const msgAgent = msg.agentId === agent.id ? 'You' : `Agent ${msg.agentId}`;
      return `${msgAgent}: ${msg.message}`;
    }).join('\n\n');
    
    // Create prompt with context
    return `
You are ${agent.name}, a ${agent.role} agent.
You are participating in a collaboration on the topic: ${topic}.

Context:
${JSON.stringify(context.parameters, null, 2)}
${Object.keys(context.results).length > 0 ? JSON.stringify(context.results, null, 2) : 'No previous results yet.'}

Previous messages:
${history || 'No previous messages.'}

Based on your role (${agent.description || agent.role}) and the conversation so far, provide your contribution.
If you believe the collaboration has reached a conclusion, include [END COLLABORATION] in your response.
    `.trim();
  }

  /**
   * Extract a conclusion from collaboration messages
   */
  private extractCollaborationConclusion(messages: CollaborationMessage[]): string {
    // Get the last few messages to extract conclusion
    const recentMessages = messages.slice(-3);
    
    // Look for explicit conclusion markers
    for (const message of recentMessages.reverse()) { // Check from latest first
      const content = message.message;
      
      if (content.includes('Conclusion:') || content.includes('Summary:')) {
        const parts = content.split(/(?:Conclusion:|Summary:)/);
        return parts[parts.length - 1].trim();
      }
      
      if (content.toLowerCase().includes('[end collaboration]')) {
        // Try to extract the text before the marker as conclusion
        const conclusionPart = content.substring(0, content.toLowerCase().indexOf('[end collaboration]')).trim();
        if (conclusionPart) return conclusionPart;
      }
    }
    
    // If no explicit marker, use the last message as a fallback
    return messages[messages.length - 1]?.message || 'No conclusion reached.';
  }

  /**
   * Process variables in a string
   */
  private processVariables(text: string, context: WorkflowContext): string {
    return text.replace(/\$\{(.+?)\}/g, (match, varPath) => {
      const value = this.getValueFromPath(context, varPath.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Process variables in an object
   */
  private processObjectVariables(obj: Record<string, any>, context: WorkflowContext): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.processVariables(value, context);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.processObjectVariables(value, context);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item => 
          typeof item === 'string' ? this.processVariables(item, context) :
          typeof item === 'object' && item !== null ? this.processObjectVariables(item, context) :
          item
        );
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Get a value from a path in an object
   */
  private getValueFromPath(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (part.includes('[')) { // Handle array indexing like results.step1.items[0]
        const arrayPart = part.substring(0, part.indexOf('['));
        const indexMatch = part.match(/\[(\d+)\]/);
        
        if (!indexMatch) {
          return undefined;
        }
        
        const index = parseInt(indexMatch[1], 10);
        
        if (current && typeof current === 'object' && arrayPart in current && Array.isArray(current[arrayPart]) && index < current[arrayPart].length) {
          current = current[arrayPart][index];
        } else {
          return undefined;
        }
      } else {
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(condition: string, context: WorkflowContext): Promise<string> {
    // Process the condition string with context variables
    const processedCondition = this.processVariables(condition, context);
    
    // Use LLM to evaluate the condition if it contains variables
    if (condition.includes('${') && condition.includes('}')) {
      try {
        // Create a prompt for the LLM to evaluate the condition
        const prompt = `
Evaluate the following condition based on the provided context:

Condition: ${processedCondition}

Context:
${JSON.stringify(context.parameters, null, 2)}
${Object.keys(context.results).length > 0 ? JSON.stringify(context.results, null, 2) : 'No results yet.'}

Return ONLY "true" or "false" based on your evaluation of the condition.
        `;
        
        const result = await this.elizaCommandService.executeCommand({
          command: 'evaluate',
          parameters: {
            prompt,
            format: 'boolean'
          }
        });
        
        return String(result).toLowerCase() === 'true' ? 'true' : 'false';
      } catch (error) {
        console.warn('LLM evaluation failed for condition, trying direct evaluation:', error);
      }
    }
    
    // For simple conditions, try to evaluate directly (safely)
    try {
      // IMPORTANT: Direct eval is inherently unsafe, but we'll use it for this example
      // In a production environment, you should use a safer evaluation method
      const safeContext = {
        parameters: context.parameters,
        results: context.results
      };
      
      // Use Function constructor for slightly safer evaluation than eval
      const result = new Function(
        'context', 
        `with(context) { try { return Boolean(${processedCondition}); } catch (e) { return false; } }`
      )(safeContext);
      
      return result ? 'true' : 'false';
    } catch (error) {
      console.error(`Error evaluating condition directly: "${processedCondition}"`, error);
      return 'false'; // Default to false on error
    }
  }
}
