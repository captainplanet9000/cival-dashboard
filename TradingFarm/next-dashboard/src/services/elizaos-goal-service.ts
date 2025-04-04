/**
 * ElizaOS Goal Service
 * Handles AI-specific functionality for goals with ElizaOS integration
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Goal } from '@/services/goal-service';

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// Define interfaces
export interface AIGoalSettings {
  allowed_models: string[];
  prompt_template: string;
  evaluation_criteria: string;
  use_knowledge_base: boolean;
  max_autonomous_steps: number;
}

export interface AIGoalEvaluation {
  goal_id: string;
  evaluation_id: string;
  timestamp: string;
  model: string;
  score: number;
  reasoning: string;
  recommendations: string[];
  next_actions: string[];
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  suitable_for: string[];
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const elizaosGoalService = {
  /**
   * Get AI settings for a goal
   */
  async getAISettings(goalId: string): Promise<ApiResponse<AIGoalSettings>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .select('ai_settings')
        .eq('id', goalId)
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      // If no AI settings, return default values
      if (!data.ai_settings) {
        return {
          data: {
            allowed_models: ["gpt-4", "claude-3", "gemini-pro"],
            prompt_template: "",
            evaluation_criteria: "",
            use_knowledge_base: false,
            max_autonomous_steps: 5
          }
        };
      }
      
      return { data: data.ai_settings as AIGoalSettings };
    } catch (error) {
      console.error('Error getting AI settings for goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Update AI settings for a goal
   */
  async updateAISettings(goalId: string, settings: Partial<AIGoalSettings>): Promise<ApiResponse<Goal>> {
    try {
      // First get existing settings
      const { data: currentSettings, error: settingsError } = await this.getAISettings(goalId);
      
      if (settingsError) {
        return { error: settingsError };
      }
      
      // Merge existing settings with new settings
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      // Update the goal
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .update({
          ai_settings: updatedSettings
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error updating AI settings for goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get available prompt templates
   */
  async getPromptTemplates(): Promise<ApiResponse<AIPromptTemplate[]>> {
    try {
      // First try API endpoint
      const url = `${getApiUrl('goals/prompt-templates')}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Return default templates
      return {
        data: [
          {
            id: "trading-strategy",
            name: "Trading Strategy Analysis",
            description: "Analyze trading strategy performance and suggest improvements",
            template: "Analyze the following trading strategy performance data:\n\n{{performance_data}}\n\nProvide recommendations for improvement focusing on:\n1. Risk management\n2. Entry/exit timing\n3. Position sizing\n4. Market conditions\n\nCurrent goal: {{goal_description}}",
            variables: ["performance_data", "goal_description"],
            suitable_for: ["strategy-improvement", "risk-management"],
            created_at: new Date().toISOString()
          },
          {
            id: "market-analysis",
            name: "Market Condition Analysis",
            description: "Analyze current market conditions and predict trends",
            template: "Analyze the following market data:\n\n{{market_data}}\n\nProvide insights on:\n1. Current market sentiment\n2. Key support/resistance levels\n3. Potential trend changes\n4. Risk factors to monitor\n\nRelevant goal context: {{goal_description}}",
            variables: ["market_data", "goal_description"],
            suitable_for: ["market-analysis", "trend-prediction"],
            created_at: new Date().toISOString()
          },
          {
            id: "goal-decomposition",
            name: "Goal Decomposition",
            description: "Break down a complex trading goal into actionable steps",
            template: "Decompose the following trading goal into actionable steps:\n\n{{goal_description}}\n\nConsider the following constraints:\n1. Available capital: {{available_capital}}\n2. Risk tolerance: {{risk_tolerance}}\n3. Time horizon: {{time_horizon}}\n\nProvide a detailed step-by-step plan with clear metrics for each step.",
            variables: ["goal_description", "available_capital", "risk_tolerance", "time_horizon"],
            suitable_for: ["goal-setting", "planning"],
            created_at: new Date().toISOString()
          }
        ]
      };
    } catch (error) {
      console.error('Error getting prompt templates:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Create a custom prompt template
   */
  async createPromptTemplate(template: Omit<AIPromptTemplate, 'id' | 'created_at'>): Promise<ApiResponse<AIPromptTemplate>> {
    try {
      // Only create through API - this requires custom storage
      const url = `${getApiUrl('goals/prompt-templates')}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      return { error: 'Failed to create prompt template' };
    } catch (error) {
      console.error('Error creating prompt template:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Evaluate a goal using AI
   */
  async evaluateGoal(goalId: string, model?: string): Promise<ApiResponse<AIGoalEvaluation>> {
    try {
      // Evaluate goal with AI (supports GPT-4, Claude, Gemini)
      const url = `${getApiUrl(`goals/${goalId}/evaluate`)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model })
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // If API is not available, return a mock evaluation
      return {
        data: {
          goal_id: goalId,
          evaluation_id: `eval-${Date.now()}`,
          timestamp: new Date().toISOString(),
          model: model || 'gpt-4',
          score: 0.75,
          reasoning: "This is a mock evaluation since the AI evaluation API is not available. In a real implementation, this would contain detailed reasoning from the AI model about the goal's progress, challenges, and potential improvements.",
          recommendations: [
            "Consider breaking down this goal into smaller sub-goals",
            "Align agent strategies more closely with this goal's metrics",
            "Add more quantitative measurement criteria to better track progress"
          ],
          next_actions: [
            "Review current progress metrics",
            "Adjust target value based on recent market conditions",
            "Assign additional agents to accelerate progress"
          ]
        }
      };
    } catch (error) {
      console.error('Error evaluating goal with AI:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Assign an ElizaOS agent to autonomously work on a goal
   */
  async assignAutonomousAgent(goalId: string, agentId: string, autonomyLevel: number = 3): Promise<ApiResponse<any>> {
    try {
      // Set up autonomous agent via API
      const url = `${getApiUrl(`elizaos/agents/${agentId}/assign-goal`)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goal_id: goalId,
          autonomy_level: autonomyLevel
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // If the API is not available, handle through standard goal assignment
      const supabase = createBrowserClient();
      
      // First check if the agent exists
      const { data: agent, error: agentError } = await supabase
        .from('elizaos_agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agent) {
        return { error: agentError?.message || 'ElizaOS agent not found' };
      }
      
      // Update the agent with the goal_id
      const { error } = await supabase
        .from('elizaos_agents')
        .update({
          goal_id: goalId,
          metadata: {
            ...agent.metadata,
            autonomy_level: autonomyLevel,
            autonomous_mode: true
          }
        })
        .eq('id', agentId);
      
      if (error) {
        return { error: error.message };
      }
      
      return { data: { success: true } };
    } catch (error) {
      console.error('Error assigning autonomous agent to goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Generate new sub-goals using AI
   */
  async generateSubGoals(parentGoalId: string, count: number = 3, model: string = 'gpt-4'): Promise<ApiResponse<Goal[]>> {
    try {
      // Generate sub-goals via API
      const url = `${getApiUrl(`goals/${parentGoalId}/generate-subgoals`)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count,
          model
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // If API is not available, return a mock result with error
      return { 
        error: 'Subgoal generation requires the ElizaOS AI API which is not currently available. In a production environment, this would use the AI to analyze the parent goal and generate appropriate sub-goals.' 
      };
    } catch (error) {
      console.error('Error generating sub-goals:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
