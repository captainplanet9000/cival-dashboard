/**
 * API Routes for Message Bus functionality
 * Provides data for the inter-farm communication visualization
 */
import { NextRequest, NextResponse } from 'next/server';
import neonFarmClient from '@/utils/database/neon-farm-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    
    // Get message bus activity
    const messages = await neonFarmClient.getMessageBusActivity(limit);
    
    // Generate message flow aggregation for visualization
    const messageFlowData = aggregateMessageFlow(messages);
    
    return NextResponse.json({
      messages,
      messageFlowData
    });
  } catch (error) {
    console.error('Error fetching message bus data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message bus data' },
      { status: 500 }
    );
  }
}

/**
 * Aggregate message flow data for visualization
 * Groups messages by source and target farms
 */
function aggregateMessageFlow(messages: any[]) {
  const flowMap = new Map();
  
  messages.forEach(message => {
    if (!message.sourceFarmId || !message.targetFarmId) return;
    
    const key = `${message.sourceFarmId}-${message.targetFarmId}-${message.messageType}`;
    if (!flowMap.has(key)) {
      flowMap.set(key, {
        source: message.sourceFarmName || 'Unknown',
        target: message.targetFarmName || 'Unknown',
        value: 0,
        type: message.messageType
      });
    }
    
    const flow = flowMap.get(key);
    flow.value += 1;
  });
  
  return Array.from(flowMap.values());
}
