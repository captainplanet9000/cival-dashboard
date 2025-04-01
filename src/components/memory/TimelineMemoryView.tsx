'use client';

import React, { useState, useEffect } from 'react';
import { MemoryItem } from '../../repositories/memory-item-repository';
import { EnhancedMemoryService } from '../../services/enhanced-memory-service';

interface TimelineMemoryViewProps {
  agentId: string;
  initialTimeRange?: [Date, Date];
  maxItems?: number;
  onMemorySelect?: (memory: MemoryItem) => void;
}

export const TimelineMemoryView: React.FC<TimelineMemoryViewProps> = ({
  agentId,
  initialTimeRange,
  maxItems = 50,
  onMemorySelect
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<[Date, Date]>(initialTimeRange || [
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    new Date()
  ]);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    observation: true,
    decision: true,
    insight: true,
    feedback: true,
    fact: true
  });
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  
  // Initialize memory service
  const memoryService = new EnhancedMemoryService();
  
  // Load memories in time range
  useEffect(() => {
    async function loadMemories() {
      try {
        setLoading(true);
        setError(null);
        
        // Get memories by time range
        const items = await memoryService.getMemoriesByTimeRange(
          agentId,
          timeRange[0].toISOString(),
          timeRange[1].toISOString(),
          maxItems
        );
        
        setMemories(items);
      } catch (error: any) {
        console.error('Error loading memories:', error);
        setError(error.message || 'Failed to load memories');
      } finally {
        setLoading(false);
      }
    }
    
    loadMemories();
  }, [agentId, timeRange, maxItems]);
  
  // Filter memories by selected types
  const filteredMemories = memories.filter(mem => selectedTypes[mem.type]);
  
  // Sort memories by timestamp
  const sortedMemories = [...filteredMemories].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Group memories by date
  const groupedMemories = sortedMemories.reduce((groups, memory) => {
    const date = new Date(memory.created_at).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(memory);
    return groups;
  }, {} as Record<string, MemoryItem[]>);
  
  // Handle memory click
  const handleMemoryClick = (memory: MemoryItem) => {
    setSelectedMemory(memory);
    if (onMemorySelect) {
      onMemorySelect(memory);
    }
  };
  
  // Get color for memory type
  const getMemoryTypeColor = (type: string): string => {
    switch (type) {
      case 'observation':
        return '#3498db';
      case 'decision':
        return '#e74c3c';
      case 'insight':
        return '#9b59b6';
      case 'feedback':
        return '#2ecc71';
      case 'fact':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };
  
  // Handle toggle memory type filter
  const toggleMemoryType = (type: string) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // Adjust time range
  const adjustTimeRange = (days: number) => {
    const newEndDate = new Date();
    const newStartDate = new Date(newEndDate.getTime() - days * 24 * 60 * 60 * 1000);
    setTimeRange([newStartDate, newEndDate]);
  };
  
  return (
    <div className="timeline-memory-view">
      <div className="timeline-controls">
        <h3 className="text-lg font-semibold mb-2">Memory Timeline</h3>
        
        <div className="time-range-controls mb-4">
          <span className="mr-2">Time Range:</span>
          <button 
            onClick={() => adjustTimeRange(7)}
            className={`px-2 py-1 rounded mr-1 ${timeRange[0].getTime() === new Date().getTime() - 7 * 24 * 60 * 60 * 1000 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => adjustTimeRange(30)}
            className={`px-2 py-1 rounded mr-1 ${timeRange[0].getTime() === new Date().getTime() - 30 * 24 * 60 * 60 * 1000 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            30 Days
          </button>
          <button 
            onClick={() => adjustTimeRange(90)}
            className={`px-2 py-1 rounded mr-1 ${timeRange[0].getTime() === new Date().getTime() - 90 * 24 * 60 * 60 * 1000 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            90 Days
          </button>
        </div>
        
        <div className="memory-type-filters mb-4">
          <span className="mr-2">Filter By Type:</span>
          {Object.keys(selectedTypes).map(type => (
            <button
              key={type}
              onClick={() => toggleMemoryType(type)}
              className={`px-2 py-1 rounded mr-1 capitalize ${
                selectedTypes[type] 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-200'
              }`}
              style={{
                borderLeft: `4px solid ${getMemoryTypeColor(type)}`
              }}
            >
              {type}
            </button>
          ))}
        </div>
        
        {error && (
          <div className="error-message p-2 bg-red-100 text-red-700 rounded mb-4">
            {error}
          </div>
        )}
      </div>
      
      <div className="timeline-container">
        {loading ? (
          <div className="loading-indicator p-4 text-center">
            Loading memories...
          </div>
        ) : sortedMemories.length === 0 ? (
          <div className="empty-state p-4 text-center text-gray-500">
            No memories found in the selected time range and filters.
          </div>
        ) : (
          <div className="timeline">
            {Object.entries(groupedMemories).map(([date, dayMemories]) => (
              <div key={date} className="timeline-day mb-6">
                <div className="timeline-date-header bg-gray-100 p-2 rounded mb-2 font-semibold">
                  {date}
                </div>
                
                <div className="timeline-memories">
                  {dayMemories.map(memory => (
                    <div 
                      key={memory.id}
                      className={`timeline-memory-item p-3 mb-2 border rounded cursor-pointer ${
                        selectedMemory?.id === memory.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => handleMemoryClick(memory)}
                      style={{
                        borderLeft: `4px solid ${getMemoryTypeColor(memory.type)}`
                      }}
                    >
                      <div className="memory-header flex justify-between items-center">
                        <span className="memory-type text-sm capitalize px-2 py-0.5 rounded" style={{ backgroundColor: getMemoryTypeColor(memory.type), color: 'white' }}>
                          {memory.type}
                        </span>
                        <span className="memory-time text-xs text-gray-500">
                          {new Date(memory.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="memory-content mt-2">
                        {memory.content}
                      </div>
                      
                      <div className="memory-metadata flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span className="memory-importance">
                          Importance: {memory.importance}/10
                        </span>
                        {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                          <span className="memory-has-metadata">
                            + Additional Data
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedMemory && (
        <div className="memory-detail mt-4 p-4 border rounded">
          <h4 className="text-lg font-semibold mb-2">Memory Details</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2">
                <span className="font-semibold">Type:</span> 
                <span className="ml-2 capitalize">{selectedMemory.type}</span>
              </p>
              <p className="mb-2">
                <span className="font-semibold">Importance:</span> 
                <span className="ml-2">{selectedMemory.importance}/10</span>
              </p>
              <p className="mb-2">
                <span className="font-semibold">Created:</span> 
                <span className="ml-2">{new Date(selectedMemory.created_at).toLocaleString()}</span>
              </p>
              {selectedMemory.expires_at && (
                <p className="mb-2">
                  <span className="font-semibold">Expires:</span> 
                  <span className="ml-2">{new Date(selectedMemory.expires_at).toLocaleString()}</span>
                </p>
              )}
            </div>
            
            <div>
              <p className="font-semibold mb-1">Content:</p>
              <p className="p-2 bg-gray-50 rounded">{selectedMemory.content}</p>
            </div>
          </div>
          
          {selectedMemory.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
            <div className="mt-4">
              <p className="font-semibold mb-1">Metadata:</p>
              <pre className="p-2 bg-gray-50 rounded text-xs overflow-auto">
                {JSON.stringify(selectedMemory.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 