'use client';

import React, { useState, useEffect } from 'react';
import { TimelineMemoryView } from './TimelineMemoryView';
import { GraphMemoryView } from './GraphMemoryView';
import { TableMemoryView } from './TableMemoryView';
import { MemoryItem, MemorySearchResult } from '../../repositories/memory-item-repository';
import { EnhancedMemoryService } from '../../services/enhanced-memory-service';

interface MemoryExplorerProps {
  agentId: string;
  initialView?: 'graph' | 'timeline' | 'table';
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  agentId,
  initialView = 'graph'
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'timeline' | 'table'>(initialView);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<[Date, Date]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    new Date()
  ]);
  
  // Memory service
  const memoryService = new EnhancedMemoryService();
  
  // Handle memory search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }
    
    try {
      setIsSearching(true);
      setError(null);
      
      // Perform semantic search
      const results = await memoryService.searchMemories(
        agentId,
        searchQuery,
        20, // Get more results
        {
          minImportance: 3, // Only get meaningful memories
          recency: 'medium' // Apply medium recency bias
        }
      );
      
      setSearchResults(results);
      
      // Automatically switch to table view for search results
      if (results.length > 0 && viewMode === 'graph') {
        setViewMode('table');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setError(`Search failed: ${error.message || 'Unknown error'}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Clear search results
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };
  
  // Handle selecting a memory
  const handleMemorySelect = (memory: MemoryItem) => {
    setSelectedMemory(memory);
    // Record that this memory was accessed
    memoryService.recordAccess(memory.id);
  };
  
  // Handle changing timerange
  const handleTimeRangeChange = (range: [Date, Date]) => {
    setTimeRange(range);
  };
  
  return (
    <div className="memory-explorer">
      <div className="memory-explorer-header mb-4">
        <h2 className="text-xl font-bold mb-2">Agent Memory Explorer</h2>
        
        <div className="view-controls flex space-x-2 mb-4">
          <button 
            onClick={() => setViewMode('graph')}
            className={`px-3 py-2 rounded ${viewMode === 'graph' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Graph View
          </button>
          <button 
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-2 rounded ${viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Timeline View
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Table View
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="search-form mb-4 flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="flex-grow px-3 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              className="ml-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </form>
        
        {error && (
          <div className="error-message p-2 bg-red-100 text-red-700 rounded mb-4">
            {error}
          </div>
        )}
        
        {searchResults.length > 0 && (
          <div className="search-results-info mb-4">
            <p className="text-sm text-gray-600">
              Found {searchResults.length} memories matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>
      
      <div className="memory-explorer-content">
        {/* Graph View */}
        {viewMode === 'graph' && (
          <GraphMemoryView
            agentId={agentId}
            onMemorySelect={handleMemorySelect}
            searchResults={searchResults.length > 0 ? searchResults : undefined}
          />
        )}
        
        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <TimelineMemoryView
            agentId={agentId}
            onMemorySelect={handleMemorySelect}
            initialTimeRange={timeRange}
            maxItems={50}
          />
        )}
        
        {/* Table View */}
        {viewMode === 'table' && (
          <TableMemoryView
            agentId={agentId}
            onMemorySelect={handleMemorySelect}
            memories={searchResults.length > 0 ? searchResults : undefined}
          />
        )}
      </div>
      
      {/* Selected Memory Details */}
      {selectedMemory && (
        <div className="selected-memory-details mt-6 p-4 border rounded bg-white shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold">Memory Details</h3>
            <button 
              onClick={() => setSelectedMemory(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="memory-properties">
              <div className="mb-2">
                <span className="font-semibold text-gray-700">Type:</span> 
                <span className="ml-2 capitalize">{selectedMemory.type}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold text-gray-700">Importance:</span> 
                <span className="ml-2">{selectedMemory.importance}/10</span>
                <button 
                  onClick={() => memoryService.updateImportance(selectedMemory.id, Math.min(10, selectedMemory.importance + 1))} 
                  className="ml-2 text-sm px-1 bg-gray-100 hover:bg-gray-200 rounded"
                  title="Increase importance"
                >
                  ▲
                </button>
                <button 
                  onClick={() => memoryService.updateImportance(selectedMemory.id, Math.max(1, selectedMemory.importance - 1))} 
                  className="ml-1 text-sm px-1 bg-gray-100 hover:bg-gray-200 rounded"
                  title="Decrease importance"
                >
                  ▼
                </button>
              </div>
              <div className="mb-2">
                <span className="font-semibold text-gray-700">Created:</span> 
                <span className="ml-2">{new Date(selectedMemory.created_at).toLocaleString()}</span>
              </div>
              {selectedMemory.expires_at && (
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Expires:</span> 
                  <span className="ml-2">{new Date(selectedMemory.expires_at).toLocaleString()}</span>
                </div>
              )}
              {selectedMemory.last_accessed_at && (
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Last Accessed:</span> 
                  <span className="ml-2">{new Date(selectedMemory.last_accessed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
            
            <div className="memory-content">
              <div className="font-semibold text-gray-700 mb-1">Content:</div>
              <div className="p-3 bg-gray-50 rounded text-gray-800">
                {selectedMemory.content}
              </div>
            </div>
          </div>
          
          {selectedMemory.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
            <div className="memory-metadata mt-4">
              <div className="font-semibold text-gray-700 mb-1">Metadata:</div>
              <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto text-gray-800">
                {JSON.stringify(selectedMemory.metadata, null, 2)}
              </pre>
            </div>
          )}
          
          {'relevance_score' in selectedMemory && (
            <div className="memory-relevance mt-4">
              <div className="font-semibold text-gray-700 mb-1">Search Relevance:</div>
              <div className="p-2 bg-blue-50 rounded text-blue-800">
                Relevance Score: {(selectedMemory as MemorySearchResult).relevance_score.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 