/**
 * Queue Monitor Dashboard Page
 * Provides a real-time view of all background jobs and queue health
 */
import { QueueMonitorDashboard } from '@/components/dashboard/queue-monitor-dashboard';

export const metadata = {
  title: 'Queue Monitor - Trading Farm Dashboard',
  description: 'Monitor and manage background job processing queues',
};

export default function QueueMonitorPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Queue Monitor</h1>
      </div>
      
      <QueueMonitorDashboard />
    </div>
  );
}
