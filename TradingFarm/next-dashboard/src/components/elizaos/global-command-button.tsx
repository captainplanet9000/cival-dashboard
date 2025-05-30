'use client';

import React, { useState } from 'react';
import { CommandConsole } from '@/components/elizaos/command-console';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalCommandButtonProps {
  defaultFarmId?: string | number;
  className?: string;
  showLabel?: boolean;
}

export function GlobalCommandButton({
  defaultFarmId = '1',
  className,
  showLabel = false,
}: GlobalCommandButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [farmId, setFarmId] = useState<string>(String(defaultFarmId));
  
  const toggleConsole = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <>
      <Button
        onClick={toggleConsole}
        variant="default"
        size={showLabel ? "default" : "icon"}
        className={cn(
          "fixed bottom-4 right-4 shadow-lg z-50",
          className
        )}
      >
        <Bot className={cn("h-5 w-5", showLabel && "mr-2")} />
        {showLabel && "Command Console"}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5 text-primary" />
              ElizaOS Command Console
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)} 
              className="absolute right-2 top-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="max-h-[calc(80vh-4rem)] overflow-hidden">
            <CommandConsole 
              farmId={farmId} 
              height="normal"
              autoScroll={true} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
