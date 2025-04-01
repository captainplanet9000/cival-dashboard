import React, { useState } from 'react';
import { useFarmEvents } from '@/hooks/useFarmEvents';
import { FarmEvent } from '@/services/farm/farm-mcp-service';

interface FarmEventsProps {
  supabaseUrl: string;
  supabaseKey: string;
  farmId: string;
}

export function FarmEvents({ supabaseUrl, supabaseKey, farmId }: FarmEventsProps) {
  const [selectedTypes, setSelectedTypes] = useState<FarmEvent['type'][]>([]);
  const {
    events,
    isLoading,
    error,
    broadcastEvent,
    refreshEvents
  } = useFarmEvents({
    supabaseUrl,
    supabaseKey,
    farmId,
    eventTypes: selectedTypes
  });

  const eventTypes: FarmEvent['type'][] = [
    'market_update',
    'risk_alert',
    'performance_update',
    'agent_status',
    'wallet_update'
  ];

  const handleTypeToggle = (type: FarmEvent['type']) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const formatEventData = (data: any) => {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  };

  const getEventColor = (type: FarmEvent['type']) => {
    switch (type) {
      case 'risk_alert':
        return 'text-red-600';
      case 'market_update':
        return 'text-blue-600';
      case 'performance_update':
        return 'text-green-600';
      case 'agent_status':
        return 'text-purple-600';
      case 'wallet_update':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Farm Events</h2>

      {/* Event Type Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {eventTypes.map(type => (
          <button
            key={type}
            onClick={() => handleTypeToggle(type)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTypes.includes(type)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="text-center py-4">Loading events...</div>
      ) : error ? (
        <div className="text-red-500 py-4">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-gray-500 py-4">No events found</div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={index}
              className="border rounded p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`font-semibold ${getEventColor(event.type)}`}>
                    {event.type.replace('_', ' ')}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
                {formatEventData(event.data)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={refreshEvents}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        disabled={isLoading}
      >
        Refresh Events
      </button>
    </div>
  );
} 