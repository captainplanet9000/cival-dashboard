/**
 * API route for retrieving queue statistics
 */
import { NextRequest, NextResponse } from 'next/server';
import { QueueService, QueueNames } from '@/services/queue/queue-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stats for each queue
    const queueStats = await Promise.all(
      Object.values(QueueNames).map(async (queueName) => {
        const queue = QueueService.getQueue(queueName);
        
        if (!queue) {
          return {
            name: queueName,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: false,
            totalJobs: 0
          };
        }
        
        // Get queue counts
        const [
          waiting,
          active,
          completed,
          failed,
          delayed,
          isPaused
        ] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused()
        ]);
        
        const totalJobs = waiting + active + completed + failed + delayed;
        
        return {
          name: queueName,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused: isPaused,
          totalJobs
        };
      })
    );

    return NextResponse.json(queueStats);
  } catch (error: any) {
    console.error('Error getting queue stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue stats' },
      { status: 500 }
    );
  }
}
