/**
 * API route for resuming a paused queue
 */
import { NextResponse } from 'next/server';
import { QueueService } from '@/services/queue/queue-service';
import { getServerSession } from '@/lib/next-auth-stubs';
// No need for authOptions when using stubs

export async function POST(
  request: Request,
  { params }: { params: { queue: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { queue } = params;
    
    // Get the queue instance
    const queueInstance = QueueService.getQueue(queue);
    
    if (!queueInstance) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    // Resume the queue
    await queueInstance.resume();
    
    return NextResponse.json({ 
      success: true, 
      message: `Queue ${queue} resumed successfully` 
    });
  } catch (error: any) {
    console.error(`Error resuming queue ${params.queue}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume queue' },
      { status: 500 }
    );
  }
}
