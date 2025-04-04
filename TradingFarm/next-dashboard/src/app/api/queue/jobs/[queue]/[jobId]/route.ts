/**
 * API route for managing specific jobs (delete, retry)
 */
import { NextRequest, NextResponse } from 'next/server';
import { QueueService } from '@/services/queue/queue-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE endpoint for removing a job
export async function DELETE(
  req: NextRequest,
  { params }: { params: { queue: string; jobId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { queue, jobId } = params;
    
    // Get the queue instance
    const queueInstance = QueueService.getQueue(queue);
    
    if (!queueInstance) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    // Remove the job
    const job = await queueInstance.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    await job.remove();
    
    return NextResponse.json({ success: true, message: 'Job removed successfully' });
  } catch (error: any) {
    console.error('Error removing job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove job' },
      { status: 500 }
    );
  }
}
