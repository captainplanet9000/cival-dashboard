import dynamic from 'next/dynamic';

// Dynamically import the MonitoringDashboard to avoid SSR issues with client hooks
const MonitoringDashboard = dynamic(() => import('@/components/monitoring/MonitoringDashboard').then(m => m.MonitoringDashboard), {
  ssr: false,
});

export default function MonitoringPage() {
  return <MonitoringDashboard />;
}
