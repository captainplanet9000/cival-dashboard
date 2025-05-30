'use client';

import React, { useState, useEffect } from 'react';
import { MemoryItem, MemorySearchResult, MemoryItemRepository } from '../../repositories/memory-item-repository';
import { EnhancedMemoryService } from '../../services/enhanced-memory-service';

interface TableMemoryViewProps {
  agentId: string;
  onMemorySelect?: (memory: MemoryItem) => void;
  memories?: MemoryItem[] | MemorySearchResult[];
  maxItems?: number;
}

export const TableMemoryView: React.FC<TableMemoryViewProps> = ({
  agentId,
  onMemorySelect,
  memories: initialMemories,
  maxItems = 50
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'importance' | 'type'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Initialize memory service
  const memoryService = new EnhancedMemoryService();
  // Initialize repository directly for operations not available through service
  const memoryRepository = new MemoryItemRepository();
  
  // Load memories if not provided
  useEffect(() => {
    async function loadMemories() {
      if (initialMemories) {
        setMemories(initialMemories);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Get memories from repository
        const fetchedMemories = await memoryRepository.getByAgentId(agentId, {
          maxResults: maxItems,
          orderBy: 'created_at',
          orderDirection: 'desc',
          notExpired: true
        });
        
        setMemories(fetchedMemories);
      } catch (error: any) {
        console.error('Error loading memories:', error);
        setError(error.message || 'Failed to load memories');
        setMemories([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadMemories();
  }, [agentId, initialMemories, maxItems]);
  
  // Handle memory selection
  const handleMemorySelect = (memory: MemoryItem) => {
    if (onMemorySelect) {
      onMemorySelect(memory);
      
      // Record access
      memoryService.recordAccess(memory.id);
    }
  };
  
  // Handle sort change
  const handleSortChange = (field: 'created_at' | 'importance' | 'type') => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : field === 'importance' ? 'desc' : 'asc');
    }
  };
  
  // Apply sorting and filtering
  const sortedAndFilteredMemories = [...memories]
    // Apply type filter
    .filter(memory => !typeFilter || memory.type === typeFilter)
    // Apply sorting
    .sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortField === 'importance') {
        return sortDirection === 'asc'
          ? a.importance - b.importance
          : b.importance - a.importance;
      } else {
        // Sort by type
        return sortDirection === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }
    });
  
  // Paginate memories
  const totalPages = Math.ceil(sortedAndFilteredMemories.length / itemsPerPage);
  const paginatedMemories = sortedAndFilteredMemories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  // Get color for memory type
  const getTypeColor = (type: string): string => {
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
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  return (
    <div className="table-memory-view">
      <div className="memory-filters mb-4 flex flex-wrap gap-2 items-center">
        <div className="filter-label mr-2 font-semibold">Filter by Type:</div>
        <button
          onClick={() => setTypeFilter(null)}
          className={`px-2 py-1 rounded ${typeFilter === null ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        {['observation', 'decision', 'insight', 'feedback', 'fact'].map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-2 py-1 rounded capitalize ${
              typeFilter === type ? 'bg-gray-800 text-white' : 'bg-gray-200'
            }`}
            style={{
              borderLeft: `4px solid ${getTypeColor(type)}`
            }}
          >
            {type}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="loading-indicator p-4 text-center">
          Loading memories...
        </div>
      ) : error ? (
        <div className="error-message p-2 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      ) : memories.length === 0 ? (
        <div className="empty-state p-4 text-center text-gray-500">
          No memories found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left border-b border-gray-200">
                    <button 
                      className="font-semibold flex items-center"
                      onClick={() => handleSortChange('type')}
                    >
                      Type
                      {sortField === 'type' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-2 text-left border-b border-gray-200">Content</th>
                  <th className="p-2 text-left border-b border-gray-200">
                    <button 
                      className="font-semibold flex items-center"
                      onClick={() => handleSortChange('importance')}
                    >
                      Importance
                      {sortField === 'importance' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-2 text-left border-b border-gray-200">
                    <button 
                      className="font-semibold flex items-center"
                      onClick={() => handleSortChange('created_at')}
                    >
                      Created At
                      {sortField === 'created_at' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  {'relevance_score' in memories[0] && (
                    <th className="p-2 text-left border-b border-gray-200">
                      Relevance
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedMemories.map(memory => (
                  <tr 
                    key={memory.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleMemorySelect(memory)}
                  >
                    <td className="p-2 border-b border-gray-200">
                      <span 
                        className="inline-block px-2 py-1 rounded text-xs capitalize text-white" 
                        style={{backgroundColor: getTypeColor(memory.type)}}
                      >
                        {memory.type}
                      </span>
                    </td>
                    <td className="p-2 border-b border-gray-200">
                      <div className="line-clamp-2">{memory.content}</div>
                    </td>
                    <td className="p-2 border-b border-gray-200">
                      {memory.importance}/10
                    </td>
                    <td className="p-2 border-b border-gray-200">
                      {formatDate(memory.created_at)}
                    </td>
                    {'relevance_score' in memory && (
                      <td className="p-2 border-b border-gray-200">
                        {(memory as MemorySearchResult).relevance_score.toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="pagination flex justify-center mt-4 gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
              >
                «
              </button>
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
              >
                ‹
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNumber;
                if (totalPages <= 5) {
                  // If 5 or fewer pages, show all
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  // Show first 5 pages
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  // Show last 5 pages
                  pageNumber = totalPages - 4 + i;
                } else {
                  // Show 2 before and 2 after current
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNumber ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
              >
                ›
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
              >
                »
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 