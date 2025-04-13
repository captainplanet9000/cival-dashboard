/**
 * Goal Details Page
 * Displays detailed information for a specific trading goal
 */
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GoalDetailsPage } from '@/components/goals/GoalDetailsPage';
import { PageHeader } from '@/components/page-header';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ChevronLeft, PlusCircle } from 'lucide-react';

export const metadata = {
  title: 'Trading Farm - Goal Details',
  description: 'View and manage trading goal details',
};

export default function GoalPage({ params }: { params: { id: string } }) {
  // If no ID provided, return 404
  if (!params.id) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/goals">Goals</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>Details</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <div className="flex items-center justify-between">
        <Link href="/goals">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Goals</span>
          </Button>
        </Link>
        
        <Link href="/goals/create">
          <Button size="sm" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>New Goal</span>
          </Button>
        </Link>
      </div>
      
      <GoalDetailsPage goalId={params.id} />
    </div>
  );
}
