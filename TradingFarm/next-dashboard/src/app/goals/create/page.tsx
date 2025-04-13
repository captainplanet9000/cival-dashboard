/**
 * Goal Creation Page
 * Allows users to create new trading goals for the Trading Farm
 */
import React from 'react';
import Link from 'next/link';
import { GoalCreationForm } from '@/components/goals/GoalCreationForm';
import { PageHeader } from '@/components/page-header';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Target } from 'lucide-react';

export const metadata = {
  title: 'Trading Farm - Create Goal',
  description: 'Create a new trading goal for the Trading Farm',
};

export default function CreateGoalPage() {
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
          <BreadcrumbLink>Create</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <PageHeader
        title="Create Trading Goal"
        description="Set up a new trading goal for autonomous execution by ElizaOS agents"
        actions={
          <Link href="/goals">
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Goals</span>
            </Button>
          </Link>
        }
      />
      
      <GoalCreationForm />
    </div>
  );
}
