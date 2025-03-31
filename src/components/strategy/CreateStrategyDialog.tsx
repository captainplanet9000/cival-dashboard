import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CreateStrategyDto } from '@/lib/api/strategies';

const strategySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.string().min(1, 'Please select a strategy type'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  parameters: z.record(z.any()),
  tradingPairs: z.array(z.string()).min(1, 'Select at least one trading pair'),
});

type FormData = z.infer<typeof strategySchema>;

const strategyTypes = [
  'Trend Following',
  'Mean Reversion',
  'Momentum',
  'Breakout',
  'Pattern Recognition',
  'Statistical Arbitrage',
  'Market Making',
];

const tradingPairs = [
  'BTC/USD',
  'ETH/USD',
  'SOL/USD',
  'BNB/USD',
  'ADA/USD',
  'XRP/USD',
];

export function CreateStrategyDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      name: '',
      type: '',
      description: '',
      riskLevel: 'Medium',
      parameters: {},
      tradingPairs: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      // TODO: Replace with actual API call
      console.log('Creating strategy:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating strategy:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Strategy</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Strategy</DialogTitle>
          <DialogDescription>
            Create a new trading strategy with custom parameters and risk settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Moving Average Crossover" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a strategy type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {strategyTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      placeholder="Describe your strategy's approach and objectives..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Determines the strategy's risk tolerance and position sizing
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tradingPairs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Pairs</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange([...field.value, value])
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Add trading pairs" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tradingPairs.map((pair) => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((pair) => (
                      <Button
                        key={pair}
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          field.onChange(field.value.filter((p) => p !== pair))
                        }
                      >
                        {pair} ×
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Strategy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 