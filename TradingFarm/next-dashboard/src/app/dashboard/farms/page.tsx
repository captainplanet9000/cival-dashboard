"use client";

import * as React from "react";
// Fix default import issue by using dynamic import
const CreateFarmModal = React.lazy(() => import('@/components/farms/CreateFarmModal'));
import { FarmForm } from '@/components/farms/farm-form';
import { FarmAgentAssignment } from '@/components/farms/farm-agent-assignment';
import Link from "next/link";
import { useFarms, Farm } from "@/hooks/use-farms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, PlusCircle, ArrowRight, CheckCircle, XCircle, Users } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, RefreshCcw } from "lucide-react";

// Simple status badge for farms
const FarmStatusBadge = ({ isActive }: { isActive: boolean }) => (
  <Badge variant={isActive ? 'default' : 'outline'}
         className={`${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-300'} flex items-center w-fit`}>
    {isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
    {isActive ? 'Active' : 'Inactive'}
  </Badge>
);

export default function FarmsPage() {
  // Create a fallback for Suspense
  const CreateFarmModalWithFallback = React.useMemo(() => {
    return React.forwardRef((props: any, ref) => (
      <React.Suspense fallback={<div className="p-4">Loading...</div>}>
        <CreateFarmModal {...props} />
      </React.Suspense>
    ));
  }, []);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editFarm, setEditFarm] = React.useState<any>(null);
  const [assignFarmId, setAssignFarmId] = React.useState<string | null>(null);
  // Fetch farms owned by the current user using the hook
  const { data: allFarms = [], isLoading, error, refetch } = useFarms(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter farms based on search query
  const filteredFarms = React.useMemo(() => {
    if (!searchQuery) return allFarms;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allFarms.filter(farm => 
      farm.name?.toLowerCase().includes(lowerCaseQuery) ||
      farm.description?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [allFarms, searchQuery]);

  // --- Render Functions ---
  const renderLoading = () => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(4)].map((_, i) => <TableHead key={i}><Skeleton className="h-4 w-24" /></TableHead>)}
            <TableHead className="text-right"><Skeleton className="h-4 w-20" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="text-right space-x-2">
                 <Skeleton className="h-8 w-24 inline-block" />
                 <Skeleton className="h-8 w-16 inline-block" />
               </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Farms</AlertTitle>
      <AlertDescription>
        {error?.message || "Could not load your farms. Please try refreshing the page."}
      </AlertDescription>
      <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Retry</Button>
      <Button className="ml-auto" onClick={() => setShowCreateModal(true)}>Create Farm</Button>
    </Alert>
  );

  const renderFarmTable = () => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredFarms.map((farm: Farm) => ( 
            <TableRow key={farm.id}>
              <TableCell className="font-medium">{farm.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {farm.description || '-'}
              </TableCell>
              <TableCell>
                <FarmStatusBadge isActive={farm.status === 'active'} />
              </TableCell>
              <TableCell className="text-xs">
                {farm.created_at ? formatDistanceToNow(new Date(farm.created_at), { addSuffix: true }) : '-'}
              </TableCell>
              <TableCell className="text-right space-x-2 whitespace-nowrap">
                <Link href={`/dashboard/farms/${farm.id}`} passHref>
                  <Button variant="outline" size="sm">
                    <ArrowRight className="mr-1 h-3.5 w-3.5" /> View
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => setEditFarm(farm)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAssignFarmId(farm.id)}>
                  <Users className="mr-1 h-3.5 w-3.5" /> Agents
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // --- Main Component Return ---
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 space-y-0 pb-2">
          <div>
             <CardTitle className="text-2xl font-semibold">Manage Farms</CardTitle>
             <CardDescription className="mt-1">
               Oversee and configure your trading farms.
             </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Farm
          </Button>
        </CardHeader>
        
        <CardContent>
          {/* Search and Refresh Controls */} 
          <div className="flex items-center gap-2 mt-4 mb-4">
             <div className="relative flex-1">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input
                 type="text"
                 placeholder="Search farms by name or description..."
                 className="pl-8"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
               <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
             </Button>
           </div>

          {/* Content Area: Loading, Error, Empty, or Table */}
          {isLoading && renderLoading()}
          {error && renderError()}
          {!isLoading && !error && allFarms.length === 0 && (
            <div className="text-center py-12 text-gray-500 border border-dashed rounded-md">
              <p className="mb-2">You haven't created any farms yet.</p>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Farm
              </Button>
            </div>
          )}
           {!isLoading && !error && allFarms.length > 0 && filteredFarms.length === 0 && (
             <div className="text-center py-12 text-gray-500">
              <p>No farms match your search "{searchQuery}".</p>
            </div>
          )}
          {!isLoading && !error && filteredFarms.length > 0 && renderFarmTable()}
        </CardContent>
      </Card>
      {/* Create Farm Modal */}
      {showCreateModal && (
        <CreateFarmModalWithFallback
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
      {/* Edit Farm Modal (reuse FarmForm) */}
      {editFarm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-lg shadow-lg">
            <FarmForm initialData={editFarm} isEditMode />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setEditFarm(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {/* Agent Assignment UI */}
      {assignFarmId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-2xl shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Assign Agents to Farm</h2>
            <FarmAgentAssignment farmId={assignFarmId} onAgentsUpdated={() => setAssignFarmId(null)} />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setAssignFarmId(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Helper function to calculate farm health percentage (demo only)
function calculateFarmHealth(farm: Farm): number {
  // In a real app, this would be based on more sophisticated metrics
  return Math.floor(Math.random() * 40) + 60;
}
