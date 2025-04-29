/**
 * API route for retrying a failed job
 */
import { NextResponse } from 'next/server';
import { QueueService } from '@/services/queue/queue-service';
import { getServerSession } from '@/lib/next-auth-stubs';
// No need for authOptions when using stubs

export async function POST(
  request: Request,
  { params }: { params: { queue: string; jobId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { queue, jobId } = params;
    
    // Get the queue instance
    const queueInstance = QueueService.getQueue(queue);
    
    if (!queueInstance) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    // Get the job
    const job = await queueInstance.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Retry the job
    await job.retry();
    
    return NextResponse.json({ success: true, message: 'Job retry initiated' });
  } catch (error: any) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry job' },
      { status: 500 }
    );
  }
}
