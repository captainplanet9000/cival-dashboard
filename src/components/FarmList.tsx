import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Farm, Activity, Database } from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { Farm as FarmType } from '@/types';

interface FarmListProps {
  ownerId?: string;
}

export function FarmList({ ownerId }: FarmListProps) {
  const [farms, setFarms] = useState<FarmType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        setLoading(true);
        const farmsData = await api.farms.getAll(ownerId);
        setFarms(farmsData);
        setLoading(false);
      } catch (error) {
        handleApiError(error, setError);
        setLoading(false);
      }
    };

    fetchFarms();
  }, [ownerId]);

  const handleViewFarm = (farmId: string) => {
    router.push(`/farms/${farmId}`);
  };

  const handleCreateFarm = () => {
    router.push('/farms/new');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
        <p className="font-medium">Error loading farms</p>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Your Farms</h2>
        <Button onClick={handleCreateFarm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Farm
        </Button>
      </div>

      {farms.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-3 py-8">
              <Farm className="h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium">No farms found</h3>
              <p className="text-sm text-gray-500">Get started by creating your first farm</p>
              <Button onClick={handleCreateFarm} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Farm
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Card 
              key={farm.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewFarm(farm.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Farm className="mr-2 h-5 w-5" />
                  {farm.name}
                </CardTitle>
                <CardDescription>{farm.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <Activity className="mr-1 h-4 w-4" />
                      Status
                    </span>
                    <span className={`font-medium ${farm.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                      {farm.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <Database className="mr-1 h-4 w-4" />
                      Settings
                    </span>
                    <span className="font-medium">
                      {Object.keys(farm.settings || {}).length} configured
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-gray-500">
                Created on {new Date(farm.created_at).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 