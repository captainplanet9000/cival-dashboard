import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AgentProvider } from '../contexts/AgentContext';
import * as React from 'react';
import { Providers } from './providers';
import { ToastContainer } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Farm Dashboard',
  description: 'Intelligent trading farm management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AgentProvider>
            {children}
          </AgentProvider>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
} 