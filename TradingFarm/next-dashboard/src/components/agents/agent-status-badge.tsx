'use client';

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle, PauseCircle, Loader2, AlertTriangle, Info } from 'lucide-react';

interface AgentStatusBadgeProps {
  status: string;
  tooltipText?: string;
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ status, tooltipText }) => {
  // Normalize status for case-insensitive comparison
  const normalizedStatus = status?.toLowerCase() || 'unknown';

  const getStatusProps = () => {
    switch (normalizedStatus) {
      case 'active':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'paused':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <PauseCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'inactive':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'initializing':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> };
      case 'error':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" /> };
      default: // Handle unknown or other statuses
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Info className="h-3.5 w-3.5 mr-1" /> };
    }
  };

  const { color, icon } = getStatusProps();
  const displayStatus = status || 'Unknown';

  const content = (
    <Badge className={`${color} flex items-center px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap`}>
      {icon}
      <span className="capitalize">{displayStatus}</span>
    </Badge>
  );

  if (tooltipText) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}; 