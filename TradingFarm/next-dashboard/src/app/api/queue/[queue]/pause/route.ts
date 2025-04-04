/**
 * API route for pausing a queue
 */
import { NextRequest, NextResponse } from 'next/server';
import { QueueService } from '@/services/queue/queue-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { queue: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { queue } = params;
    
    // Get the queue instance
    const queueInstance = QueueService.getQueue(queue);
    
    if (!queueInstance) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    // Pause the queue
    await queueInstance.pause();
    
    return NextResponse.json({ 
      success: true, 
      message: `Queue ${queue} paused successfully` 
    });
  } catch (error: any) {
    console.error(`Error pausing queue ${params.queue}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to pause queue' },
      { status: 500 }
    );
  }
}
