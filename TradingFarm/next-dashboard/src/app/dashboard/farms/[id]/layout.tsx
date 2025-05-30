"use client";

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { FARM_NAVIGATION } from '@/config/navigation';
import { cn } from '@/lib/utils';

export default function FarmLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const farmId = params.id as string;
  
  // Mock farm data - replace with actual data fetch
  const farm = {
    id: farmId,
    name: `Farm ${farmId}`,
    description: 'Farm description',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  // Create paths by replacing :farmId with actual farmId
  const navItems = FARM_NAVIGATION.map(item => ({
    ...item,
    href: item.href.replace(':farmId', farmId)
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">{farm.name}</h1>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex h-2 w-2 rounded-full",
                farm.status === 'active' ? "bg-green-500" : "bg-yellow-500"
              )} />
              <span className="text-sm capitalize">{farm.status}</span>
            </div>
          </div>
          <p className="text-muted-foreground">{farm.description}</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={pathname} className="w-full">
            <TabsList className="mb-4 w-full justify-start">
              {navItems.map(item => (
                <TabsTrigger
                  key={item.href}
                  value={item.href}
                  className="relative h-9"
                  asChild
                >
                  <Link href={item.href} className="flex items-center gap-1">
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
