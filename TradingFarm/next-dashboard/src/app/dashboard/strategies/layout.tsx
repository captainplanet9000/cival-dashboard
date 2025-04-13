import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trading Strategies | Trading Farm Dashboard',
  description: 'Create, manage, and deploy trading strategies with the Trading Farm platform',
}

export default function StrategiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
