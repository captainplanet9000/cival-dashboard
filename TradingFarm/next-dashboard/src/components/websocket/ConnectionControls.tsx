/**
 * WebSocket Connection Controls Component
 * 
 * Provides controls for managing WebSocket connections.
 * 
 * @module components/websocket
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlayCircle, Power, PowerOff, RefreshCw, Settings } from 'lucide-react';
import { WebSocketConnection, WebSocketConnectionStatus } from '@/lib/websocket/types';

/**
 * Props for the ConnectionControls component
 */
interface ConnectionControlsProps {
  /**
   * The connection to control
   */
  connection: WebSocketConnection;
  
  /**
   * Callback when connect is clicked
   */
  onConnect: () => void;
  
  /**
   * Callback when disconnect is clicked
   */
  onDisconnect: () => void;
  
  /**
   * Optional callback when settings is clicked
   */
  onSettings?: () => void;
}

/**
 * ConnectionControls component
 * 
 * Provides controls for managing WebSocket connections.
 */
export function ConnectionControls({
  connection,
  onConnect,
  onDisconnect,
  onSettings,
}: ConnectionControlsProps): React.ReactElement {
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Handle connect button click
  const handleConnect = async () => {
    try {
      setIsLoading(true);
      await onConnect();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle disconnect button click
  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await onDisconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Connection control actions */}
        {(connection.status === 'disconnected' || connection.status === 'error') && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Power className="mr-2 h-4 w-4 text-green-500" />
            )}
            Connect
          </Button>
        )}
        
        {(connection.status === 'connected' || connection.status === 'connecting') && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PowerOff className="mr-2 h-4 w-4 text-red-500" />
            )}
            Disconnect
          </Button>
        )}
      </div>
      
      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Connection Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {(connection.status === 'disconnected' || connection.status === 'error') && (
            <DropdownMenuItem onClick={handleConnect} disabled={isLoading}>
              <Power className="mr-2 h-4 w-4 text-green-500" />
              <span>Connect</span>
            </DropdownMenuItem>
          )}
          
          {(connection.status === 'connected' || connection.status === 'connecting') && (
            <DropdownMenuItem onClick={handleDisconnect} disabled={isLoading}>
              <PowerOff className="mr-2 h-4 w-4 text-red-500" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          )}
          
          {/* Show settings option if handler is provided */}
          {onSettings && (
            <DropdownMenuItem onClick={onSettings}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
