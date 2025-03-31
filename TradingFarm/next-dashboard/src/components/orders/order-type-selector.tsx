'use client';

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { OrderType } from '@/services/advanced-order-service';
import { 
  TrendingUp, 
  ArrowDownToLine, 
  PauseCircle, 
  BarChartHorizontal, 
  Layers, 
  Clock, 
  BarChart3, 
  Shuffle, 
  ArrowRightLeft, 
  Target 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderTypeSelectorProps {
  value: OrderType;
  onChange: (value: OrderType) => void;
  className?: string;
}

export default function OrderTypeSelector({
  value,
  onChange,
  className
}: OrderTypeSelectorProps) {
  const orderTypes = [
    {
      value: 'market',
      label: 'Market',
      description: 'Execute immediately at current market price',
      icon: <ArrowDownToLine className="h-4 w-4" />
    },
    {
      value: 'limit',
      label: 'Limit',
      description: 'Execute at specified price or better',
      icon: <PauseCircle className="h-4 w-4" />
    },
    {
      value: 'stop',
      label: 'Stop',
      description: 'Market order when price reaches stop level',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      value: 'stop_limit',
      label: 'Stop Limit',
      description: 'Limit order when price reaches stop level',
      icon: <BarChartHorizontal className="h-4 w-4" />
    },
    {
      value: 'trailing_stop',
      label: 'Trailing Stop',
      description: 'Stop that follows price movement',
      icon: <ArrowRightLeft className="h-4 w-4" />
    },
    {
      value: 'oco',
      label: 'OCO',
      description: 'One-Cancels-Other (take profit & stop loss)',
      icon: <Shuffle className="h-4 w-4" />
    },
    {
      value: 'bracket',
      label: 'Bracket',
      description: 'Entry + Stop Loss + Take Profit',
      icon: <Target className="h-4 w-4" />
    },
    {
      value: 'iceberg',
      label: 'Iceberg',
      description: 'Large order with partial visible quantity',
      icon: <Layers className="h-4 w-4" />
    },
    {
      value: 'twap',
      label: 'TWAP',
      description: 'Time-Weighted Average Price',
      icon: <Clock className="h-4 w-4" />
    },
    {
      value: 'vwap',
      label: 'VWAP',
      description: 'Volume-Weighted Average Price',
      icon: <BarChart3 className="h-4 w-4" />
    }
  ];

  return (
    <RadioGroup 
      value={value} 
      onValueChange={(val) => onChange(val as OrderType)}
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2', className)}
    >
      {orderTypes.map((type) => (
        <div key={type.value}>
          <RadioGroupItem
            value={type.value}
            id={`order-type-${type.value}`}
            className="peer sr-only"
          />
          <Label
            htmlFor={`order-type-${type.value}`}
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
          >
            <div className="flex flex-col items-center gap-2">
              {type.icon}
              <div className="font-semibold">{type.label}</div>
            </div>
            <div className="text-xs text-center text-muted-foreground">{type.description}</div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
