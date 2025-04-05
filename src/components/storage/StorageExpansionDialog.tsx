"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { HardDrive, Info } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface StorageExpansionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCapacity: number;
  onExpand: (additionalCapacity: number) => void;
  minExpansion?: number;
  maxExpansion?: number;
}

export default function StorageExpansionDialog({
  open,
  onOpenChange,
  currentCapacity,
  onExpand,
  minExpansion = 100 * 1024 * 1024, // 100 MB minimum
  maxExpansion = 100 * 1024 * 1024 * 1024 // 100 GB maximum
}: StorageExpansionDialogProps) {
  const [expansionSize, setExpansionSize] = useState(minExpansion);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cost calculation (example rate: $0.01 per GB)
  const costPerGb = 0.01;
  const expansionCostUsd = (expansionSize / (1024 * 1024 * 1024)) * costPerGb;

  const handleSliderChange = (value: number[]) => {
    setExpansionSize(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert input to bytes (input is in GB)
    const gbValue = parseFloat(e.target.value);
    if (!isNaN(gbValue)) {
      const byteValue = gbValue * 1024 * 1024 * 1024;
      setExpansionSize(Math.min(Math.max(byteValue, minExpansion), maxExpansion));
    }
  };

  const handleExpand = async () => {
    try {
      setIsSubmitting(true);
      await onExpand(expansionSize);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Expand Storage Capacity</DialogTitle>
          <DialogDescription>
            Add more storage space to your volume. This will increase your monthly billing amount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid items-center gap-1.5">
            <Label htmlFor="current-capacity">Current Storage Capacity</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              {formatBytes(currentCapacity)}
            </div>
          </div>
          
          <div className="grid items-center gap-1.5">
            <Label htmlFor="expansion-amount">Additional Capacity</Label>
            <div className="flex items-center gap-2">
              <Input
                id="expansion-amount"
                type="number"
                min={minExpansion / (1024 * 1024 * 1024)}
                max={maxExpansion / (1024 * 1024 * 1024)}
                step={0.1}
                value={(expansionSize / (1024 * 1024 * 1024)).toFixed(1)}
                onChange={handleInputChange}
                className="flex-grow"
              />
              <span className="text-sm text-muted-foreground">GB</span>
            </div>
            <Slider
              value={[expansionSize]}
              min={minExpansion}
              max={maxExpansion}
              step={100 * 1024 * 1024}
              onValueChange={handleSliderChange}
              className="py-4"
            />
          </div>
          
          <div className="grid items-center gap-1.5">
            <Label>New Total Capacity</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm font-semibold">
              {formatBytes(currentCapacity + expansionSize)}
            </div>
          </div>
          
          <div className="bg-secondary/30 rounded-md p-3 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium mb-1">Billing Impact</div>
              <p className="text-muted-foreground">
                This expansion will add <span className="font-medium">${expansionCostUsd.toFixed(2)}</span> to your monthly bill.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExpand} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Expand Storage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 