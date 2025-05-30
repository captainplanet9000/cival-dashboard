'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// CrewAgentConfigInterface is not directly used in props here, but good for context
// import { CrewAgentConfigInterface } from '@/types/generated/py_models'; 

interface CrewAgentConfigFormFieldsProps {
  form: UseFormReturn<any>; 
  availableLlms: string[]; // Prop to pass the list of LLM identifiers
}

export function CrewAgentConfigFormFields({ form, availableLlms }: CrewAgentConfigFormFieldsProps) {
  const basePath = "configuration_parameters"; // Base path for these nested fields

  // Prepare LLM options for the Select component
  const llmSelectOptions = availableLlms.map(llmId => ({ value: llmId, label: llmId }));

  return (
    <div className="space-y-6 p-4 border rounded-md bg-muted/30 dark:bg-muted/20">
      <h3 className="text-lg font-medium text-foreground">Agent Persona & Configuration</h3>
      <FormField
        control={form.control}
        name={`${basePath}.role`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Senior Market Analyst" {...field} />
            </FormControl>
            <FormDescription>The primary role of this agent within the crew.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.goal`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Goal</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., To analyze market data for AAPL and provide actionable insights for short-term trading." {...field} rows={3} />
            </FormControl>
            <FormDescription>The main objective or goal this agent is trying to achieve.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.backstory`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Backstory</FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., An experienced analyst with a PhD in Finance, specialized in tech stocks and familiar with SEC filings and market sentiment analysis."
                {...field}
                rows={5}
              />
            </FormControl>
            <FormDescription>Provide context or background for this agent.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.llm_identifier`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>LLM Identifier (Optional)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an LLM (or use crew default)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">
                  <em>Use Crew Default LLM</em>
                </SelectItem>
                {llmSelectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {/* Show a message if no dynamic LLMs are loaded but form is used */}
                {availableLlms.length === 0 && (
                    <SelectItem value="no-llms" disabled>No specific LLMs loaded from backend.</SelectItem>
                )}
              </SelectContent>
            </Select>
            <FormDescription>
              Select a specific LLM for this agent, or leave blank to use the crew's default LLM.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
            control={form.control}
            name={`${basePath}.allow_delegation`}
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                <div className="space-y-0.5">
                <FormLabel>Allow Delegation</FormLabel>
                <FormDescription>
                    Can this agent delegate tasks to other agents?
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
            name={`${basePath}.verbose`}
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                <div className="space-y-0.5">
                <FormLabel>Verbose Mode</FormLabel>
                <FormDescription>
                    Enable detailed logging for this agent's actions?
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
      </div>

      <FormField
        control={form.control}
        name={`${basePath}.strategy_specific_params`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Strategy Specific Parameters (JSON)</FormLabel>
            <FormControl>
              <Textarea
                placeholder='e.g., {"param_name": "value", "another_param": 123}'
                {...field}
                rows={4}
                onChange={(e) => { // Ensure field.onChange is called with the value
                  field.onChange(e.target.value);
                }}
              />
            </FormControl>
            <FormDescription>
              Enter as a valid JSON string. These parameters might be used by the agent's assigned strategy.
              Leave empty if not needed. Example: {`{"sma_window": 20, "rsi_threshold": 70}`}
            </FormDescription>
            <FormMessage /> {/* For Zod validation errors on this field */}
          </FormItem>
        )}
      />

      {/* Tools field is Optional[List[Dict[str, Any]]] which is complex for a form.
          For now, it's omitted from direct form input. Could be a JSON textarea if needed.
          If you need to configure tools, consider how they are defined (e.g. string name, or full spec).
          For this iteration, tools are not included in this specific form component.
          The Pydantic model defaults it to None.
      */}

    </div>
  );
}
