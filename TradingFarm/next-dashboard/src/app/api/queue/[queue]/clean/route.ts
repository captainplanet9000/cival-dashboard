/**
 * API route for cleaning a queue (removing completed and failed jobs)
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
    const url = new URL(request.url);
    const { searchParams } = url;
    const grace = parseInt(searchParams.get('grace') || '3600');  // Default 1 hour
    const status = searchParams.get('status') || 'completed';  // Default clean completed jobs
    const limit = parseInt(searchParams.get('limit') || '1000');  // Default limit
    
    // Get the queue instance
    const queueInstance = QueueService.getQueue(queue);
    
    if (!queueInstance) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    let result;
    
    // Clean the queue based on status
    if (status === 'both' || status === 'all') {
      // Clean both completed and failed
      const completedCount = await queueInstance.clean(grace, 'completed', limit);
      const failedCount = await queueInstance.clean(grace, 'failed', limit);
      
      result = {
        completedCount,
        failedCount,
        totalRemoved: completedCount + failedCount
      };
    } else {
      // Clean based on specified status (completed or failed)
      const count = await queueInstance.clean(
        grace, 
        status as 'completed' | 'failed', 
        limit
      );
      
      result = {
        [`${status}Count`]: count,
        totalRemoved: count
      };
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Queue ${queue} cleaned successfully`,
      result
    });
  } catch (error: any) {
    console.error(`Error cleaning queue ${params.queue}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to clean queue' },
      { status: 500 }
    );
  }
}
