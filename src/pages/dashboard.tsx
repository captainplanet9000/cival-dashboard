import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FarmList } from '@/components/FarmList';
import { api, handleApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Farm } from 'lucide-react';

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would come from authentication
        // For now, we'll use a mock user ID
        setUserId('current-user-id');
        
        setLoading(false);
      } catch (error) {
        handleApiError(error, setError);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleCreateFarm = () => {
    router.push('/farms/new');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p className="font-medium">Error loading dashboard</p>
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Trading Farm Dashboard</h1>
        <Button onClick={handleCreateFarm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Farm
        </Button>
      </div>

      <div className="space-y-10">
        <section>
          <FarmList ownerId={userId || undefined} />
        </section>
      </div>
    </div>
  );
} 