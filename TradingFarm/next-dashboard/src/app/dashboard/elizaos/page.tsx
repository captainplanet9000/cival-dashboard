
/**
 * ElizaOS Dashboard Page
 *
 * Simplified version that doesn't depend on any ElizaOS services
 * to unblock the production build
 */

export const metadata = {
  title: 'ElizaOS - Trading Farm Dashboard',
  description: 'ElizaOS AI Trading System',
};

export default function ElizaOSPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">ElizaOS Dashboard</h3>
        </div>
        <div className="p-6">
          <p>The ElizaOS Trading System is currently under maintenance. Please check back later.</p>
        </div>
      </div>
    </div>
  );
}
