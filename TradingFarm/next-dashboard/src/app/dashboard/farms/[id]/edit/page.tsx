'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateFarmSchema, UpdateFarmInput } from '@/schemas/farm-schemas';
import { useFarm, useUpdateFarm } from '@/hooks/use-farms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function EditFarmPage() {
  const params = useParams();
  const router = useRouter();
  
  const farmId = React.useMemo(() => {
    const id = params.id as string;
    const parsedId = parseInt(id, 10);
    return isNaN(parsedId) ? null : parsedId;
  }, [params.id]);

  const { data: farm, isLoading: isFetchingFarm, error: fetchError } = useFarm(farmId);
  const updateFarmMutation = useUpdateFarm(farmId!); // Non-null assertion OK due to checks below

  const form = useForm<UpdateFarmInput>({
    resolver: zodResolver(updateFarmSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  // Populate form with fetched data
  useEffect(() => {
    if (farm) {
      form.reset({
        name: farm.name || '',
        description: farm.description || '',
        is_active: farm.is_active !== undefined ? farm.is_active : true,
        // TODO: Add settings if needed
      });
    }
  }, [farm, form.reset]);

  const onSubmit = async (values: UpdateFarmInput) => {
    if (!farmId) return; // Should not happen if page rendered
    try {
      await updateFarmMutation.mutateAsync(values);
      router.push(`/dashboard/farms/${farmId}`);
    } catch (error) {
      console.error("Update farm submission failed:", error);
    }
  };

  // --- Render Logic ---

  if (farmId === null) { 
    // Handle invalid ID case early
    return (
       <div className="p-4 md:p-6 max-w-2xl mx-auto">
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Invalid Farm ID</AlertTitle>
           <AlertDescription>
             The Farm ID provided in the URL is not valid.
             <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/farms')} className="mt-4 ml-auto block">Back to Farms</Button>
           </AlertDescription>
         </Alert>
       </div>
     );
  }

  if (isFetchingFarm) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto animate-pulse">
         <Skeleton className="h-9 w-32 mb-4" />
         <Skeleton className="h-[350px] w-full" /> {/* Card placeholder */}
      </div>
    );
  }

  if (fetchError) {
    return (
       <div className="p-4 md:p-6 max-w-2xl mx-auto">
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Farm Data</AlertTitle>
          <AlertDescription>
            {fetchError || "Could not load farm data for editing."}
             <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/farms')} className="mt-4 ml-auto block">Back to Farms</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!farm) {
     return (
       <div className="p-4 md:p-6 max-w-2xl mx-auto">
         <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Farm Not Found</AlertTitle>
          <AlertDescription>
            Could not find the farm with ID '{farmId}' to edit.
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/farms')} className="mt-4 ml-auto block">Back to Farms</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- Form Rendering ---
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/farms/${farmId}`)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Farm Details
      </Button>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Edit Farm</CardTitle>
              <CardDescription>
                Update the details for farm <code className="font-mono bg-muted px-1 rounded">{farm.name}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farm Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Quant Farm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose or strategy of this farm (optional)"
                        className="resize-none"
                        {...field}
                        value={field.value || ''} // Handle null
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm space-x-3">
                     <div className="space-y-0.5">
                       <FormLabel>Farm Active</FormLabel>
                       <FormDescription>
                         Enable or disable all operations within this farm.
                       </FormDescription>
                     </div>
                    <FormControl>
                       {/* Using Checkbox - ensure field.value is boolean */}
                      <Checkbox
                        checked={!!field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* TODO: Add settings field if needed */}

            </CardContent>
            <CardFooter className="flex justify-end">
               <Button type="submit" disabled={updateFarmMutation.isPending || !form.formState.isDirty}>
                 {updateFarmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Save Changes
               </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
} 