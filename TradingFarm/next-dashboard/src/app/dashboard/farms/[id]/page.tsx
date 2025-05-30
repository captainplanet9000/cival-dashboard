"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFarm, Farm } from '@/hooks/use-farms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Edit, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";

// Simple status badge reused
const FarmStatusBadge = ({ isActive }: { isActive: boolean }) => (
  <Badge variant={isActive ? 'default' : 'outline'}
         className={`${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-300'} flex items-center w-fit`}>
    {isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
    {isActive ? 'Active' : 'Inactive'}
  </Badge>
);

export default function FarmDetailPageClean() {
  const params = useParams();
  const router = useRouter();
  
  // --- Data Fetching ---
  const farmId = React.useMemo(() => {
    const id = params.id as string;
    const parsedId = parseInt(id, 10);
    return isNaN(parsedId) ? null : parsedId;
  }, [params.id]);

  const { data: farm, isLoading, error } = useFarm(farmId);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 animate-pulse">
         <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
         </div>
        <Skeleton className="h-48 w-full" /> {/* Card placeholder */}
        <Skeleton className="h-32 w-full" /> {/* Placeholder for future sections */}
      </div>
    );
  }

  // --- Error State ---
  if (error || farmId === null) {
    return (
       <div className="p-4 md:p-6">
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Farm</AlertTitle>
          <AlertDescription>
            {error?.message || (farmId === null ? "Invalid Farm ID in URL." : "Could not load farm details.")}
             <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/farms')} className="mt-4 ml-auto block">Back to Farms</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- Not Found State ---
  if (!farm) {
     return (
       <div className="p-4 md:p-6">
         <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Farm Not Found</AlertTitle>
          <AlertDescription>
            The farm with ID '{farmId}' could not be found.
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/farms')} className="mt-4 ml-auto block">Back to Farms</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- Render Farm Details ---
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/farms')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Farms List
        </Button>
        <Link href={`/dashboard/farms/${farm.id}/edit`} passHref>
           <Button variant="default" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit Farm
           </Button>
        </Link>
      </div>

      {/* Farm Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{farm.name}</CardTitle>
          <CardDescription>{farm.description || 'No description provided.'}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
           <div><span className="font-medium text-muted-foreground">ID:</span> {farm.id}</div>
           <div><span className="font-medium text-muted-foreground">Status:</span> <FarmStatusBadge isActive={farm.is_active} /></div>
           <div><span className="font-medium text-muted-foreground">Created:</span> {formatDistanceToNow(new Date(farm.created_at), { addSuffix: true })}</div>
           <div><span className="font-medium text-muted-foreground">Owner ID:</span> <span className="font-mono text-xs">{farm.owner_id}</span></div>
           {/* Display settings if they exist and are simple enough */}
           {farm.settings && (
             <div className="md:col-span-2"><span className="font-medium text-muted-foreground">Settings:</span> 
               <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto mt-1">{JSON.stringify(farm.settings, null, 2)}</pre>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Placeholder for Associated Components */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Components</CardTitle>
        </CardHeader>
         <CardContent>
          <p className="text-muted-foreground">
            Sections for agents, strategies, wallets, goals, etc., associated with this farm will be added here later.
          </p>
          {/* Example: <FarmAgentList farmId={farm.id} /> */}
        </CardContent>
      </Card>

    </div>
  );
}