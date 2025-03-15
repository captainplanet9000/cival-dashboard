import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  HelpCircle,
  RefreshCw,
  Link as LinkIcon,
  Settings,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ExchangeConnectionStatus } from './types';

interface ExchangeConnectionsProps {
  connections: ExchangeConnectionStatus[];
  onToggleTrading: (exchangeId: string, enabled: boolean) => void;
  onReconnect: (exchangeId: string) => void;
  onSettings: (exchangeId: string) => void;
}

const ExchangeConnections: React.FC<ExchangeConnectionsProps> = ({
  connections,
  onToggleTrading,
  onReconnect,
  onSettings
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>;
      case 'disconnected':
        return <span className="h-2 w-2 rounded-full bg-gray-500 mr-1.5"></span>;
      case 'error':
        return <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>;
      case 'reconnecting':
        return <RefreshCw className="h-3 w-3 animate-spin mr-1.5 text-yellow-600" />;
      default:
        return <span className="h-2 w-2 rounded-full bg-gray-500 mr-1.5"></span>;
    }
  };

  const getApiStatusDot = (isActive: boolean) => {
    return (
      <span 
        className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}>
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <LinkIcon className="h-5 w-5 mr-2 text-primary" />
          Exchange Connections
        </CardTitle>
        <CardDescription>
          Manage your exchange connections and trading status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No exchange connections configured</p>
              <Button variant="outline" className="mt-4">
                Add Exchange
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {connections.map((connection) => (
                <div 
                  key={connection.id}
                  className={`rounded-lg border p-4 ${
                    connection.status === 'connected' ? 'bg-green-50/30 dark:bg-green-950/10' : 
                    connection.status === 'error' ? 'bg-red-50/30 dark:bg-red-950/10' : 
                    'bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-base font-medium">{connection.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 flex items-center ${getStatusColor(connection.status)}`}
                        >
                          {getStatusIcon(connection.status)}
                          {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                        </Badge>
                      </div>
                      
                      {connection.errorMessage && (
                        <div className="flex items-center mt-1.5 text-sm text-red-600">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          {connection.errorMessage}
                        </div>
                      )}
                      
                      {connection.lastConnected && connection.status !== 'connected' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last connected: {new Date(connection.lastConnected).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => onReconnect(connection.id)}
                              disabled={connection.status === 'reconnecting'}
                            >
                              <RefreshCw className={`h-4 w-4 ${connection.status === 'reconnecting' ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reconnect</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => onSettings(connection.id)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Settings</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visit exchange</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>Public API</span>
                        {getApiStatusDot(connection.api.publicEndpoint)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Private API</span>
                        {getApiStatusDot(connection.api.privateEndpoint)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>WebSocket</span>
                        {getApiStatusDot(connection.api.websocket)}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-2 max-w-xs">
                              <p><strong>Public API</strong>: For market data</p>
                              <p><strong>Private API</strong>: For account/orders</p>
                              <p><strong>WebSocket</strong>: For real-time updates</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Trading</span>
                      <Switch
                        checked={connection.tradingEnabled}
                        onCheckedChange={(checked) => onToggleTrading(connection.id, checked)}
                        disabled={connection.status !== 'connected'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Button variant="outline" className="w-full mt-2">
            <LinkIcon className="h-4 w-4 mr-2" />
            Add Exchange Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExchangeConnections;
