'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UseFormReturn } from 'react-hook-form';

interface BasicOrderFieldsProps {
  form: UseFormReturn<any>;
  exchanges: { value: string; label: string }[];
  symbols: { value: string; label: string }[];
  exchangeAccounts: { value: string; label: string }[];
}

export default function BasicOrderFields({
  form,
  exchanges,
  symbols,
  exchangeAccounts
}: BasicOrderFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Symbol Selection */}
      <FormField
        control={form.control}
        name="symbol"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Symbol</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a symbol" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Exchange Selection */}
      <FormField
        control={form.control}
        name="exchange"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Exchange</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an exchange" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {exchanges.map((exchange) => (
                  <SelectItem key={exchange.value} value={exchange.value}>
                    {exchange.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Exchange Account (if available) */}
      {exchangeAccounts.length > 0 && (
        <FormField
          control={form.control}
          name="exchange_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exchange Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {exchangeAccounts.map((account) => (
                    <SelectItem key={account.value} value={account.value}>
                      {account.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Order Side */}
      <FormField
        control={form.control}
        name="side"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Side</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex space-x-1"
              >
                <FormItem className="flex items-center space-x-3 space-y-0 w-1/2">
                  <FormControl>
                    <RadioGroupItem value="buy" id="side-buy" className="peer sr-only" />
                  </FormControl>
                  <Label
                    htmlFor="side-buy"
                    className="flex-1 cursor-pointer rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-500/10 peer-data-[state=checked]:text-green-500 text-center font-medium"
                  >
                    Buy
                  </Label>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0 w-1/2">
                  <FormControl>
                    <RadioGroupItem value="sell" id="side-sell" className="peer sr-only" />
                  </FormControl>
                  <Label
                    htmlFor="side-sell"
                    className="flex-1 cursor-pointer rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10 peer-data-[state=checked]:text-red-500 text-center font-medium"
                  >
                    Sell
                  </Label>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Quantity */}
      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter quantity" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Time in Force */}
      <FormField
        control={form.control}
        name="time_in_force"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Time in Force</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select time in force" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="gtc">Good Till Canceled (GTC)</SelectItem>
                <SelectItem value="ioc">Immediate or Cancel (IOC)</SelectItem>
                <SelectItem value="fok">Fill or Kill (FOK)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
