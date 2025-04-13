'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFarmSchema, CreateFarmInput } from '@/schemas/farm-schemas';
import { useCreateFarm } from '@/hooks/use-farms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateFarmPage() {
  const router = useRouter();
  const createFarmMutation = useCreateFarm();

  const form = useForm<CreateFarmInput>({
    resolver: zodResolver(createFarmSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true, // Default to active
    },
  });

  const onSubmit = async (values: CreateFarmInput) => {
    try {
      const newFarm = await createFarmMutation.mutateAsync(values);
      // On success, hook handles toast & cache. Redirect to the new farm's detail page.
      router.push(`/dashboard/farms/${newFarm.id}`);
    } catch (error) {
      // Error handled by hook toast
      console.error("Create farm submission failed:", error);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Farms List
      </Button>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Farm</CardTitle>
              <CardDescription>
Enter the details for your new trading farm.
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
                    <FormDescription>
A unique name for your farm.
                    </FormDescription>
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

             {/* TODO: Add field for is_active if needed, or set default in DB/hook */}
             {/* Example using Checkbox:
             <FormField
               control={form.control}
               name="is_active"
               render={({ field }) => (
                 <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                   <FormControl>
                     <Checkbox
                       checked={field.value}
                       onCheckedChange={field.onChange}
                     />
                   </FormControl>
                   <div className="space-y-1 leading-none">
                     <FormLabel>Activate Farm</FormLabel>
                     <FormDescription>
                       Allow agents and strategies within this farm to operate.
                     </FormDescription>
                   </div>
                 </FormItem>
               )}
             />
             */}

            </CardContent>
            <CardFooter className="flex justify-end">
               <Button type="submit" disabled={createFarmMutation.isPending}>
                 {createFarmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Create Farm
               </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
} 