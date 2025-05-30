'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useFarmStore, FarmSort } from '@/stores';
import { cn } from '@/lib/utils';

/**
 * Farm filter form schema
 */
const formSchema = z.object({
  searchQuery: z.string().optional(),
  status: z.array(z.string()).default([]),
  dateRange: z.object({
    from: z.date().optional().nullable(),
    to: z.date().optional().nullable(),
  }).default({
    from: null,
    to: null,
  }),
  sortField: z.enum(['name', 'created_at', 'updated_at', 'roi', 'profit']).default('created_at'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  view: z.enum(['grid', 'list']).default('grid'),
});

/**
 * Farm filter component using Zustand store
 */
export function FarmFilters() {
  const statusOptions = useFarmStore(state => state.filterOptions.status);
  const filters = useFarmStore(state => state.filters);
  const sort = useFarmStore(state => state.sort);
  const view = useFarmStore(state => state.view);
  
  // Store actions
  const setStatusFilter = useFarmStore(state => state.setStatusFilter);
  const setSearchQuery = useFarmStore(state => state.setSearchQuery);
  const setDateRange = useFarmStore(state => state.setDateRange);
  const resetFilters = useFarmStore(state => state.resetFilters);
  const setSort = useFarmStore(state => state.setSort);
  const setView = useFarmStore(state => state.setView);
  
  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.status.length > 0) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  }, [filters]);
  
  // Create form with React Hook Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      searchQuery: filters.searchQuery,
      status: filters.status,
      dateRange: filters.dateRange,
      sortField: sort.field,
      sortDirection: sort.direction,
      view: view,
    },
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Update the Zustand store with the new filter values
    setSearchQuery(values.searchQuery || '');
    setStatusFilter(values.status);
    setDateRange(values.dateRange.from, values.dateRange.to);
    setSort(values.sortField, values.sortDirection);
    setView(values.view);
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    resetFilters();
    form.reset({
      searchQuery: '',
      status: [],
      dateRange: {
        from: null,
        to: null,
      },
      sortField: 'created_at',
      sortDirection: 'desc',
      view: 'grid',
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filter Farms</CardTitle>
          {activeFilterCount > 0 && (
            <Badge variant="outline" className="ml-2">
              {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="searchQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Search by name or description..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <Separator />
            
            <FormField
              control={form.control}
              name="status"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Status</FormLabel>
                    <FormDescription>
                      Select the farm status to filter by
                    </FormDescription>
                  </div>
                  {statusOptions.map((option) => (
                    <FormField
                      key={option.id}
                      control={form.control}
                      name="status"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={option.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, option.value])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== option.value
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </FormItem>
              )}
            />
            
            <Separator />
            
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Range</FormLabel>
                  <div className={cn("grid gap-2", field.value?.from ? "grid-cols-2" : "grid-cols-1")}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value?.from && "text-muted-foreground"
                            )}
                          >
                            {field.value?.from ? (
                              format(field.value.from, "PPP")
                            ) : (
                              <span>Start date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value?.from || undefined}
                          onSelect={(date) => {
                            field.onChange({
                              ...field.value,
                              from: date,
                            });
                          }}
                          disabled={(date) =>
                            (field.value?.to && date > field.value.to) ||
                            date > new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {field.value?.from && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value?.to && "text-muted-foreground"
                              )}
                            >
                              {field.value?.to ? (
                                format(field.value.to, "PPP")
                              ) : (
                                <span>End date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value?.to || undefined}
                            onSelect={(date) => {
                              field.onChange({
                                ...field.value,
                                to: date,
                              });
                            }}
                            disabled={(date) =>
                              (field.value?.from && date < field.value.from) ||
                              date > new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  
                  {(field.value?.from || field.value?.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 self-start"
                      onClick={() => {
                        field.onChange({
                          from: null,
                          to: null,
                        });
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear dates
                    </Button>
                  )}
                </FormItem>
              )}
            />
            
            <Separator />
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sortField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort By</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value === 'name' && "Name"}
                            {field.value === 'created_at' && "Date Created"}
                            {field.value === 'updated_at' && "Date Updated"}
                            {field.value === 'roi' && "ROI"}
                            {field.value === 'profit' && "Profit"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search field..." />
                          <CommandEmpty>No field found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="name"
                              onSelect={() => {
                                field.onChange("name");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === "name" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Name
                            </CommandItem>
                            <CommandItem
                              value="created_at"
                              onSelect={() => {
                                field.onChange("created_at");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === "created_at" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Date Created
                            </CommandItem>
                            <CommandItem
                              value="updated_at"
                              onSelect={() => {
                                field.onChange("updated_at");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === "updated_at" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Date Updated
                            </CommandItem>
                            <CommandItem
                              value="roi"
                              onSelect={() => {
                                field.onChange("roi");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === "roi" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              ROI
                            </CommandItem>
                            <CommandItem
                              value="profit"
                              onSelect={() => {
                                field.onChange("profit");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === "profit" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Profit
                            </CommandItem>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sortDirection"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Sort Direction</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="asc" />
                          </FormControl>
                          <FormLabel className="font-normal">Ascending</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="desc" />
                          </FormControl>
                          <FormLabel className="font-normal">Descending</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <FormField
              control={form.control}
              name="view"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>View Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="grid" />
                        </FormControl>
                        <FormLabel className="font-normal">Grid</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="list" />
                        </FormControl>
                        <FormLabel className="font-normal">List</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
            >
              Reset
            </Button>
            <Button type="submit">Apply Filters</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
