/**
 * Stub implementation for Pusher client
 * This is a temporary solution until the actual Pusher client is implemented
 */

// Define the interface for Pusher client
export interface PusherClient {
  subscribe: (channel: string) => PusherChannel;
  unsubscribe: (channel: string) => void;
  connect: () => void;
  disconnect: () => void;
}

// Define the interface for Pusher channel
export interface PusherChannel {
  bind: (event: string, callback: (data: any) => void) => void;
  unbind: (event: string, callback?: (data: any) => void) => void;
}

// Stub implementation of Pusher client
class PusherStub implements PusherClient {
  private channels: Map<string, PusherChannelStub> = new Map();

  subscribe(channel: string): PusherChannel {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new PusherChannelStub(channel));
    }
    return this.channels.get(channel)!;
  }

  unsubscribe(channel: string): void {
    this.channels.delete(channel);
  }

  connect(): void {
    console.log('[PusherStub] Connected');
  }

  disconnect(): void {
    console.log('[PusherStub] Disconnected');
  }
}

// Stub implementation of Pusher channel
class PusherChannelStub implements PusherChannel {
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private channelName: string) {}

  bind(event: string, callback: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  unbind(event: string, callback?: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) return;

    if (callback) {
      this.eventHandlers.get(event)!.delete(callback);
    } else {
      this.eventHandlers.delete(event);
    }
  }

  // Method to manually trigger events (for testing)
  trigger(event: string, data: any): void {
    if (!this.eventHandlers.has(event)) return;

    this.eventHandlers.get(event)!.forEach(callback => {
      callback(data);
    });
  }
}

// Export a singleton instance
export const pusherClient = new PusherStub();
// --- TEMPORARY: Mock pusherServer for build unblock ---
export const pusherServer = {};
// --- END TEMPORARY ---

// Server-side Pusher functions
export async function triggerPusherEvent(channel: string, event: string, data: any): Promise<void> {
  console.log(`[PusherStub] Triggered event on channel ${channel}: ${event}`, data);
  return Promise.resolve();
}

export default pusherClient;
