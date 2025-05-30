'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Farm, CreateFarmInput, UpdateFarmInput } from '@/schemas/farm-schemas';
import { useCreateFarm, useUpdateFarm } from '@/hooks';
import { FormError, FormSuccess } from '@/forms';

interface FarmFormProps {
  initialData?: Farm;
  isEditMode?: boolean;
}

/**
 * Form schema for creating/editing a farm
 * Derives from the Zod schemas but customizes validation messages
 */
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Farm name must be at least 3 characters long',
  }).max(50, {
    message: 'Farm name must be less than 50 characters',
  }),
  description: z.string().max(500, {
    message: 'Description must be less than 500 characters',
  }).optional(),
  user_id: z.string().min(1, {
    message: 'User ID is required',
  }),
  is_active: z.boolean().default(true),
  status: z.enum(['active', 'inactive', 'paused'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
  risk_level: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Please select a valid risk level' }),
  }).default('medium'),
});

/**
 * Farm form component for creating and editing farms
 */
export function FarmForm({ initialData, isEditMode = false }: FarmFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  
  // Use the appropriate mutation hook
  const createFarm = useCreateFarm();
  const updateFarm = initialData ? useUpdateFarm(initialData.id) : null;
  
  // Create form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || '',
      user_id: initialData.user_id,
      is_active: initialData.is_active,
      status: initialData.status,
      risk_level: initialData.risk_profile?.risk_level || 'medium',
    } : {
      name: '',
      description: '',
      user_id: '', // This would typically come from the auth context
      is_active: true,
      status: 'active',
      risk_level: 'medium',
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(undefined);
    setSuccess(undefined);
    
    try {
      if (isEditMode && initialData) {
        // Update existing farm
        await updateFarm?.mutateAsync(values as UpdateFarmInput);
        setSuccess("Farm updated successfully!");
        
        // Redirect after a brief delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/farms/${initialData.id}`);
        }, 1500);
      } else {
        // Create new farm
        const newFarm = await createFarm.mutateAsync(values as CreateFarmInput);
        setSuccess("Farm created successfully!");
        
        // Redirect after a brief delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/farms/${newFarm.id}`);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Farm" : "Create New Farm"}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter farm name" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your farm a descriptive name
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
                      placeholder="Enter farm description" 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Briefly describe the purpose and goals of this farm
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The current operational status of this farm
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The trading risk profile for this farm
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Enable or disable farm operations
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormError message={error} />
            <FormSuccess message={success} />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createFarm.isPending || (updateFarm?.isPending ?? false)}
            >
              {createFarm.isPending || (updateFarm?.isPending ?? false)
                ? "Saving..."
                : isEditMode ? "Update Farm" : "Create Farm"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
