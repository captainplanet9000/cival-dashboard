"use client";

import React, { useState, useEffect } from 'react';
import { farmService, Farm } from '@/services/farm-service';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

export default function TestPersistencePage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmName, setFarmName] = useState('');
  const [farmDescription, setFarmDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch farms on load
  useEffect(() => {
    fetchFarms();
  }, []);

  // Function to fetch farms
  const fetchFarms = async () => {
    setLoading(true);
    try {
      const response = await farmService.getFarms();
      if (response.data) {
        setFarms(response.data);
      }
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch farms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new farm
  const createFarm = async () => {
    if (!farmName) {
      toast({
        title: 'Error',
        description: 'Farm name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await farmService.createFarm({
        name: farmName,
        description: farmDescription,
      });

      if (response.data) {
        toast({
          title: 'Success',
          description: 'Farm created successfully',
        });
        setFarmName('');
        setFarmDescription('');
        fetchFarms();
      } else if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating farm:', error);
      toast({
        title: 'Error',
        description: 'Failed to create farm',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Function to delete a farm
  const deleteFarm = async (id: string) => {
    try {
      const response = await farmService.deleteFarm(id);
      if (!response.error) {
        toast({
          title: 'Success',
          description: 'Farm deleted successfully',
        });
        fetchFarms();
      } else {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting farm:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete farm',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Farm Data Persistence Test</h1>
      
      <div className="flex space-x-4 mb-8">
        <Card className="w-1/2">
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
            <CardDescription>
              This page demonstrates that farm data persists when navigating between tabs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Create a farm using the form on the right</li>
              <li>Navigate to another page using the links below</li>
              <li>Come back to this page</li>
              <li>Verify that the farm data is still displayed</li>
            </ol>
            
            <div className="mt-4 space-y-2">
              <p className="font-semibold">Navigation Links:</p>
              <div className="space-x-2">
                <Link href="/dashboard" passHref>
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Link href="/dashboard/farms" passHref>
                  <Button variant="outline">Farms</Button>
                </Link>
                <Link href="/dashboard/agents" passHref>
                  <Button variant="outline">Agents</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-1/2">
          <CardHeader>
            <CardTitle>Create a Farm</CardTitle>
            <CardDescription>
              Add a new farm to test persistence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Farm Name</label>
                <Input
                  placeholder="Enter farm name"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  placeholder="Enter description"
                  value={farmDescription}
                  onChange={(e) => setFarmDescription(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={createFarm} disabled={isCreating || !farmName}>
              {isCreating ? 'Creating...' : 'Create Farm'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Farms List</CardTitle>
          <CardDescription>
            These farms should persist when navigating away and coming back
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading farms...</div>
          ) : farms.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No farms found. Create one using the form above.
            </div>
          ) : (
            <Table>
              <TableCaption>List of your farms</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="font-mono text-xs">{farm.id}</TableCell>
                    <TableCell className="font-medium">{farm.name}</TableCell>
                    <TableCell>{farm.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={farm.status === 'active' ? 'default' : 'secondary'}>
                        {farm.status || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(farm.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteFarm(farm.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={fetchFarms} variant="outline">
            Refresh Farms
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
