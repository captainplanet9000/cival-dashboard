'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  CircleDollarSign, 
  CreditCard, 
  ArrowLeftRight, 
  Shield, 
  Settings,
  ChevronRight
} from 'lucide-react';

interface VaultNavigationProps {
  farmId: string;
}

export function VaultNavigation({ farmId }: VaultNavigationProps) {
  const pathname = usePathname();
  
  const routes = [
    {
      name: 'Overview',
      href: `/dashboard/${farmId}/vault`,
      icon: CircleDollarSign
    },
    {
      name: 'Accounts',
      href: `/dashboard/${farmId}/vault/accounts`,
      icon: CreditCard
    },
    {
      name: 'Transactions',
      href: `/dashboard/${farmId}/vault/transactions`,
      icon: ArrowLeftRight
    },
    {
      name: 'Approvals',
      href: `/dashboard/${farmId}/vault/approvals`,
      icon: Shield
    },
    {
      name: 'Settings',
      href: `/dashboard/${farmId}/vault/settings`,
      icon: Settings
    }
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/dashboard/${farmId}`} className="hover:text-foreground">
          Farm {farmId}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">Vault Banking</span>
      </div>
      
      <div className="flex space-x-1 border-b pb-1">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-t-lg transition-colors hover:bg-primary/10",
              pathname === route.href
                ? "bg-background text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground"
            )}
          >
            <route.icon className="h-4 w-4 mr-2" />
            {route.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
