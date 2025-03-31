import { useEffect } from 'react';
import wsClient from '@/lib/websocket/client';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  useEffect(() => {
    // Connect to WebSocket when component mounts
    wsClient.connect();

    // Add custom event listeners if provided
    if (options.onConnect) {
      wsClient.on('open', options.onConnect);
    }
    if (options.onDisconnect) {
      wsClient.on('close', options.onDisconnect);
    }
    if (options.onError) {
      wsClient.on('error', options.onError);
    }

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
      
      // Remove custom event listeners
      if (options.onConnect) {
        wsClient.off('open', options.onConnect);
      }
      if (options.onDisconnect) {
        wsClient.off('close', options.onDisconnect);
      }
      if (options.onError) {
        wsClient.off('error', options.onError);
      }
    };
  }, []); // Empty dependency array since we want to connect only once

  return {
    send: wsClient.send.bind(wsClient),
    disconnect: wsClient.disconnect.bind(wsClient),
    connect: wsClient.connect.bind(wsClient),
  };
} 