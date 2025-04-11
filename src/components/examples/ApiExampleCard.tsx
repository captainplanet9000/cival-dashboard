import React, { useState } from 'react';
import { useQuery } from '../../hooks/use-query';
import { useOptimisticMutation } from '../../hooks/use-optimistic-mutation';
import { ApiGateway, ApiServiceType } from '../../services/api-gateway';
import { ApiInspector } from '../../utils/api-inspector';
import { MonitoringService } from '../../services/monitoring-service';

/**
 * Example data types for the component
 */
interface ExampleItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

/**
 * API Example Card Component
 * Demonstrates the advanced API features implemented
 */
export const ApiExampleCard: React.FC = () => {
  const apiGateway = ApiGateway.getInstance();
  const apiInspector = ApiInspector.getInstance();
  
  // Local state for new item
  const [newItemTitle, setNewItemTitle] = useState('');
  const [showInspector, setShowInspector] = useState(false);
  const [logCount, setLogCount] = useState(0);
  
  // Use our query hook to fetch items
  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<ExampleItem[]>(
    'example-items',
    async () => {
      return apiGateway.serviceRequest(
        ApiServiceType.SIMULATION,
        '/examples'
      );
    },
    {
      staleTime: 30000, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: true
    }
  );
  
  // Use optimistic mutation for adding items
  const {
    mutate: addItem,
    isPending: isAdding
  } = useOptimisticMutation<ExampleItem[], { title: string }>(
    items,
    async (params) => {
      return apiGateway.serviceRequest(
        ApiServiceType.SIMULATION,
        '/examples',
        {
          method: 'POST',
          body: {
            title: params.title,
            completed: false
          }
        }
      );
    },
    {
      // Optimistically update the UI before the API call completes
      optimisticUpdate: (currentItems) => {
        const newItem: ExampleItem = {
          id: `temp-${Date.now()}`,
          title: newItemTitle,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        return [...(currentItems || []), newItem];
      },
      // Custom rollback logic
      rollback: (_, originalItems) => {
        // Just revert to the original state
        return originalItems;
      },
      // Success callback
      onSuccess: (data) => {
        setNewItemTitle('');
        MonitoringService.logEvent({
          type: 'info',
          message: 'Item added successfully',
          data: { count: data.length }
        });
      }
    }
  );
  
  // Use optimistic mutation for toggling item completion
  const {
    mutate: toggleItem
  } = useOptimisticMutation<ExampleItem[], { id: string, completed: boolean }>(
    items,
    async (params) => {
      return apiGateway.serviceRequest(
        ApiServiceType.SIMULATION,
        `/examples/${params.id}`,
        {
          method: 'PATCH',
          body: {
            completed: params.completed
          }
        }
      );
    },
    {
      // Optimistically update the UI
      optimisticUpdate: (currentItems) => {
        if (!currentItems) return [];
        
        return currentItems.map(item => 
          item.id === toggleParams.current.id 
            ? { ...item, completed: toggleParams.current.completed }
            : item
        );
      }
    }
  );
  
  // Keep track of the most recent toggle params
  const toggleParams = React.useRef({ id: '', completed: false });
  
  // Handle add item form submission
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    
    addItem({ title: newItemTitle });
  };
  
  // Handle toggle item completion
  const handleToggleItem = (id: string, completed: boolean) => {
    toggleParams.current = { id, completed: !completed };
    toggleItem(toggleParams.current);
  };
  
  // Toggle API inspector
  const handleToggleInspector = () => {
    const newState = apiInspector.toggle();
    setShowInspector(newState);
    setLogCount(apiInspector.getLogs().length);
  };
  
  // Download inspector logs
  const handleDownloadLogs = () => {
    apiInspector.downloadLogs();
  };
  
  return (
    <div className="rounded-lg border border-gray-200 shadow-sm p-6 max-w-2xl mx-auto my-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Advanced API Integration Example</h2>
      <p className="text-gray-600 mb-4">Demonstrates optimistic updates, validation, caching, and monitoring features</p>
      
      {/* API Inspector Controls */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded">
        <div>
          <h3 className="font-medium">API Inspector</h3>
          <p className="text-sm text-gray-500">
            {showInspector 
              ? `Active - ${logCount} request logs` 
              : 'Inactive'}
          </p>
        </div>
        <div className="space-x-2">
          <button
            onClick={handleToggleInspector}
            className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700"
          >
            {showInspector ? 'Disable' : 'Enable'} Inspector
          </button>
          {showInspector && (
            <button
              onClick={handleDownloadLogs}
              className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700"
            >
              Download Logs
            </button>
          )}
        </div>
      </div>
      
      {/* Error display */}
      {isError && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      {/* Item list */}
      <div className="mb-4">
        <h3 className="font-medium mb-2">Items</h3>
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading items...</p>
          </div>
        ) : (
          <>
            {items && items.length > 0 ? (
              <ul className="border rounded overflow-hidden divide-y">
                {items.map((item) => (
                  <li 
                    key={item.id} 
                    className={`p-3 flex items-center justify-between ${
                      item.id.startsWith('temp-') ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleItem(item.id, item.completed)}
                        className="mr-3 h-5 w-5 rounded"
                      />
                      <span className={item.completed ? 'line-through text-gray-400' : ''}>
                        {item.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.id.startsWith('temp-') ? 'Adding...' : new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-4 text-gray-500">No items found. Add one below!</p>
            )}
          </>
        )}
      </div>
      
      {/* Add item form */}
      <form onSubmit={handleAddItem} className="flex items-center space-x-2">
        <input
          type="text"
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder="Add new item..."
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isAdding}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          disabled={isAdding || !newItemTitle.trim()}
        >
          {isAdding ? 'Adding...' : 'Add Item'}
        </button>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          title="Refresh"
        >
          🔄
        </button>
      </form>
      
      {/* Feature list */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="font-medium mb-1">Implemented features:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Optimistic UI updates with automatic rollback on errors</li>
          <li>Request validation and schema checking</li>
          <li>Smart caching with TTL and invalidation</li>
          <li>API request inspector for debugging</li>
          <li>Performance monitoring and metrics</li>
          <li>Automatic retries with exponential backoff</li>
        </ul>
      </div>
    </div>
  );
}; 