import dynamic from 'next/dynamic';

// Dynamically import the RiskDashboard to avoid SSR issues with client hooks
const RiskDashboard = dynamic(() => import('@/components/risk/RiskDashboard').then(m => m.RiskDashboard), {
  ssr: false,
});

export default function RiskPage() {
  return <RiskDashboard />;
}
