/**
 * API route for retrieving jobs from a specific queue
 */
import { NextRequest, NextResponse } from 'next/server';
import { QueueService } from '@/services/queue/queue-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Number(searchParams.get('limit') || '20');
    
    // Get the queue instance
    const queueInstance = QueueService.getQueue(queue);
    
    if (!queueInstance) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    // Fetch jobs based on status or get all
    let jobs = [];
    
    if (status) {
      switch (status) {
        case 'active':
          jobs = await queueInstance.getActive(0, limit);
          break;
        case 'waiting':
          jobs = await queueInstance.getWaiting(0, limit);
          break;
        case 'completed':
          jobs = await queueInstance.getCompleted(0, limit);
          break;
        case 'failed':
          jobs = await queueInstance.getFailed(0, limit);
          break;
        case 'delayed':
          jobs = await queueInstance.getDelayed(0, limit);
          break;
        default:
          return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 });
      }
    } else {
      // Get all jobs (combine different states)
      const [active, waiting, completed, failed, delayed] = await Promise.all([
        queueInstance.getActive(0, limit / 5 || 4),
        queueInstance.getWaiting(0, limit / 5 || 4),
        queueInstance.getCompleted(0, limit / 5 || 4),
        queueInstance.getFailed(0, limit / 5 || 4),
        queueInstance.getDelayed(0, limit / 5 || 4)
      ]);
      
      jobs = [...active, ...waiting, ...completed, ...failed, ...delayed];
    }
    
    // Process job data for API response
    const processedJobs = jobs.map(job => {
      // Convert job to a more consumable format
      return {
        id: job.id,
        name: job.name,
        data: job.data,
        queue: queue,
        timestamp: job.timestamp ? new Date(parseInt(job.timestamp)).toISOString() : null,
        processedOn: job.processedOn ? new Date(parseInt(job.processedOn)).toISOString() : null,
        finishedOn: job.finishedOn ? new Date(parseInt(job.finishedOn)).toISOString() : null,
        status: getJobStatus(job),
        progress: job.progress || 0,
        returnvalue: job.returnvalue,
        stacktrace: job.stacktrace || [],
        attemptsMade: job.attemptsMade || 0
      };
    });
    
    return NextResponse.json(processedJobs);
  } catch (error: any) {
    console.error('Error getting jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get jobs' },
      { status: 500 }
    );
  }
}

/**
 * Determine job status based on Bull job properties
 */
function getJobStatus(job: any) {
  if (job.finishedOn) {
    return job.failedReason ? 'failed' : 'completed';
  }
  
  if (job.processedOn) {
    return 'active';
  }
  
  if (job.delay && Date.now() < job.delay) {
    return 'delayed';
  }
  
  return 'waiting';
}
