/**
 * WebSocket Connection Status Component
 * 
 * Displays the current status of a WebSocket connection with appropriate styling.
 * 
 * @module components/websocket
 */

import React from 'react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Clock, MinusCircle, XCircle } from 'lucide-react';
import { WebSocketConnectionStatus } from '@/lib/websocket/types';

/**
 * Props for the ConnectionStatus component
 */
interface ConnectionStatusProps {
  /**
   * The current status of the WebSocket connection
   */
  status: WebSocketConnectionStatus;
}

/**
 * Mapping of status to badge variant and icon
 */
const statusConfig: Record<WebSocketConnectionStatus, {
  label: string;
  variant: BadgeProps['variant'];
  icon: React.ReactNode;
  description: string;
}> = {
  'connected': {
    label: 'Connected',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3 text-green-500" />,
    description: 'Connection is established and healthy'
  },
  'connecting': {
    label: 'Connecting',
    variant: 'outline',
    icon: <Clock className="h-3 w-3 animate-spin" />,
    description: 'Connection is being established'
  },
  'disconnected': {
    label: 'Disconnected',
    variant: 'secondary',
    icon: <MinusCircle className="h-3 w-3" />,
    description: 'Connection is closed'
  },
  'error': {
    label: 'Error',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    description: 'Connection encountered an error'
  },
  'reconnecting': {
    label: 'Reconnecting',
    variant: 'outline',
    icon: <AlertCircle className="h-3 w-3 text-amber-500" />,
    description: 'Connection lost, attempting to reconnect'
  },
};

/**
 * ConnectionStatus component
 * 
 * Displays the current status of a WebSocket connection with appropriate styling.
 */
export function ConnectionStatus({ status }: ConnectionStatusProps): React.ReactElement {
  const config = statusConfig[status] || statusConfig.disconnected;
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="ml-2 px-2 py-1 flex items-center gap-1">
            {config.icon}
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
