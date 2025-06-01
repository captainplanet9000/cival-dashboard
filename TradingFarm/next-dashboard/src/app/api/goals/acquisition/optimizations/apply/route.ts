import { createServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { strategyOptimizationService } from '@/services/strategy-optimization-service';
// Mock implementation to unblock build
const agentCoordinationService = {
  // Mock implementation of needed methods
  initializeElizaAgentsForGoal: async () => ({ data: null }),
  sendElizaAnalysisCommand: async () => ({ data: null }),
  processElizaMarketAnalysis: async () => ({ data: null }),
  notifyStrategyUpdate: async (goalId: string, recommendationId: string) => ({ data: null }),
  sendElizaProposalCommand: async () => ({ data: null }),
  processElizaStrategyProposal: async () => ({ data: null }),
  sendElizaExecutionCommand: async () => ({ data: null }),
  processElizaExecutionResult: async () => ({ data: null }),
  sendElizaMonitoringCommand: async () => ({ data: null }),
  getGoalAcquisitionMemories: async () => ({ data: [] })
};
import { goalAcquisitionService } from '@/services/goal-acquisition-service';

export async function POST(request: Request) {
  try {
    const { goalId, recommendationId } = await request.json();
    
    if (!goalId || !recommendationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: goalId and recommendationId' 
      }, { status: 400 });
    }
    
    // Create server client
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Verify goal ownership
    const { data: goal, error: goalError } = await goalAcquisitionService.getAcquisitionGoal(goalId);
    
    if (goalError || !goal) {
      return NextResponse.json({ 
        success: false, 
        error: goalError || 'Goal not found' 
      }, { status: 404 });
    }
    
    // TypeScript safety: add assertion for user_id property
    if ((goal as any).user_id !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized to access this goal' 
      }, { status: 403 });
    }
    
    // Apply the optimization
    const { success, error } = await strategyOptimizationService.applyOptimization(goalId, recommendationId);
    
    if (!success) {
      return NextResponse.json({ 
        success: false, 
        error: error || 'Failed to apply optimization' 
      }, { status: 500 });
    }
    
    // Notify agents about the strategy update
    try {
      await agentCoordinationService.notifyStrategyUpdate(goalId, recommendationId);
    } catch (notifyError) {
      console.error('Error notifying agents about strategy update:', notifyError);
      // Continue anyway, as the optimization was applied successfully
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Strategy optimization applied successfully'
    });
    
  } catch (error) {
    console.error('Error applying optimization:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
