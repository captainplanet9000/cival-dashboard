import { ExchangeConnectionManager } from '@/components/exchanges/ExchangeConnectionManager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exchange Connections | Trading Farm Dashboard',
  description: 'Manage your cryptocurrency exchange connections',
};

export default function ExchangesPage() {
  return (
    <div className="container py-6">
      <ExchangeConnectionManager />
    </div>
  );
}
