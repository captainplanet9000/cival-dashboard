"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { addMonths } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

// Define validation schema
const goalSchema = z.object({
  name: z.string().min(3, { message: "Goal name must be at least 3 characters" }).max(50),
  description: z.string().optional(),
  type: z.enum(["profit", "roi", "trade_count", "win_rate", "custom"]),
  target_value: z.coerce.number().positive({ message: "Target value must be positive" }),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  deadline: z.date().optional(),
  assigned_strategy: z.string().optional(),
  notifications: z.enum(["none", "daily", "weekly", "on_milestone"]).default("on_milestone"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  onSuccess?: () => void;
  strategies?: { id: string; name: string }[]; // Optional list of available strategies
}

export default function CreateGoalModal({ 
  isOpen, 
  onClose, 
  farmId, 
  onSuccess,
  strategies = [] // Default to empty array if not provided
}: CreateGoalModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();

  // Default deadline to 1 month from now
  const defaultDeadline = addMonths(new Date(), 1);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "profit",
      target_value: 0,
      priority: "medium",
      deadline: defaultDeadline,
      assigned_strategy: undefined,
      notifications: "on_milestone",
    }
  });

  // Watch the goal type to show different UI elements
  const goalType = form.watch("type");

  const onSubmit = async (values: GoalFormValues) => {
    if (!farmId) {
      toast({
        title: "Error",
        description: "Farm ID is required to create a goal",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In a real application, this would use a proper table name based on your database schema
      const { data, error } = await supabase
        .from('goals')
        .insert({
          name: values.name,
          description: values.description || null,
          type: values.type,
          target_value: values.target_value,
          priority: values.priority,
          deadline: values.deadline?.toISOString() || null,
          assigned_strategy: values.assigned_strategy || null,
          notifications: values.notifications,
          status: "not_started",
          progress: 0,
          farm_id: farmId
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Goal Created",
        description: `${values.name} has been created successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['goals', farmId] });
      
      // Reset form and close modal
      form.reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error Creating Goal",
        description: error.message || "Failed to create goal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get appropriate label and placeholder based on goal type
  const getTargetLabel = () => {
    switch (goalType) {
      case "profit":
        return { label: "Target Profit", placeholder: "1000", prefix: "$" };
      case "roi":
        return { label: "Target ROI", placeholder: "10", prefix: "%" };
      case "trade_count":
        return { label: "Target Trades", placeholder: "100", prefix: "" };
      case "win_rate":
        return { label: "Target Win Rate", placeholder: "60", prefix: "%" };
      case "custom":
        return { label: "Target Value", placeholder: "Value", prefix: "" };
      default:
        return { label: "Target Value", placeholder: "Value", prefix: "" };
    }
  };

  const targetInfo = getTargetLabel();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a new Goal</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Monthly Profit Target" {...field} />
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
                      placeholder="Describe the goal and why it matters..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Goal Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="profit" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Profit Goal ($ Amount)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="roi" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          ROI Goal (% Return)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="trade_count" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Trade Count (Number of trades)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="win_rate" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Win Rate (% Successful trades)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="custom" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Custom Goal
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{targetInfo.label}</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      {targetInfo.prefix && (
                        <span className="mr-2 text-muted-foreground">{targetInfo.prefix}</span>
                      )}
                      <Input 
                        type="number" 
                        placeholder={targetInfo.placeholder}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Deadline (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={field.value ? new Date(field.value).toISOString().substring(0, 10) : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          field.onChange(date);
                        }}
                        min={new Date().toISOString().substring(0, 10)}
                      />
                    </FormControl>
                    <FormDescription>
                      When should this goal be achieved?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            
            {strategies.length > 0 && (
              <FormField
                control={form.control}
                name="assigned_strategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Strategy (Optional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-strategy">No specific strategy</SelectItem>
                        {strategies.map((strategy) => (
                          <SelectItem key={strategy.id} value={strategy.id}>
                            {strategy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this goal to a specific strategy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="notifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notifications</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Notification frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No notifications</SelectItem>
                      <SelectItem value="daily">Daily updates</SelectItem>
                      <SelectItem value="weekly">Weekly updates</SelectItem>
                      <SelectItem value="on_milestone">Only on milestones</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How often do you want to receive progress updates?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
