'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle } from 'lucide-react';
import { farmService, Farm } from '@/services/farm-service';

// Form schema validation
const farmFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Farm name must be at least 2 characters.',
  }).max(50, {
    message: 'Farm name cannot exceed 50 characters.'
  }),
  description: z.string().max(500, {
    message: 'Description cannot exceed 500 characters.'
  }).optional(),
});

type FarmFormValues = z.infer<typeof farmFormSchema>;

interface FarmCreationDialogProps {
  onSuccess?: (farm: Farm) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function FarmCreationDialog({
  onSuccess,
  trigger,
  className,
}: FarmCreationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Define form with validation schema
  const form = useForm<FarmFormValues>({
    resolver: zodResolver(farmFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Form submission handler
  async function onSubmit(values: FarmFormValues) {
    setIsSubmitting(true);
    try {
      // First try direct API route with mock mode enabled
      try {
        const apiResponse = await fetch('/api/farms?mock=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: values.name,
            description: values.description || null,
          }),
        });
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          
          toast({
            title: "Farm created",
            description: "Your new trading farm has been created successfully.",
          });
          
          // Close the dialog and call success callback
          setOpen(false);
          form.reset();
          
          if (onSuccess && data.farm) {
            onSuccess(data.farm);
          }
          
          return;
        }
      } catch (apiError) {
        console.error('API route error, falling back to service:', apiError);
      }
      
      // Fallback to the service approach
      const response = await farmService.createFarm({
        name: values.name,
        description: values.description || null,
      });

      if (response.error) {
        toast({
          variant: "destructive",
          title: "Failed to create farm",
          description: response.error,
        });
      } else if (response.data) {
        toast({
          title: "Farm created",
          description: "Your new trading farm has been created successfully.",
        });

        // Close the dialog and call success callback
        setOpen(false);
        form.reset();
        
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (error) {
      console.error('Error creating farm:', error);
      toast({
        variant: "destructive",
        title: "Failed to create farm",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    form.reset();
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root 
      open={open}
      onOpenChange={(value: boolean) => setOpen(value)}
    >
      <DialogPrimitive.Trigger asChild>
        {trigger || (
          <Button className={className}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Farm
          </Button>
        )}
      </DialogPrimitive.Trigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Trading Farm</DialogTitle>
          <DialogDescription>
            Create a new farm to organize your trading agents and strategies.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Trading Farm" {...field} />
                  </FormControl>
                  <FormDescription>
                    A meaningful name to identify your trading farm.
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose and goals of this trading farm..."
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Add details about the purpose and goals of this trading farm.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Farm'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
