import React, { useState } from 'react';
import { useAgentMemory } from '@/hooks/useAgentMemory';

interface AgentMemoryProps {
  supabaseUrl: string;
  supabaseKey: string;
  agentId: string;
}

export function AgentMemory({ supabaseUrl, supabaseKey, agentId }: AgentMemoryProps) {
  const {
    memories,
    isLoading,
    error,
    searchMemories,
    clearMemories,
    deleteMemory
  } = useAgentMemory({
    supabaseUrl,
    supabaseKey,
    agentId
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'conversation' | 'document' | 'knowledge' | 'state'>('all');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchMemories({
      query: searchQuery,
      memoryType: selectedType === 'all' ? undefined : selectedType
    });
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear these memories?')) {
      await clearMemories(selectedType === 'all' ? undefined : selectedType);
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory(memoryId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Agent Memory</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="flex-1 p-2 border rounded"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="p-2 border rounded"
          >
            <option value="all">All Types</option>
            <option value="conversation">Conversations</option>
            <option value="document">Documents</option>
            <option value="knowledge">Knowledge</option>
            <option value="state">State</option>
          </select>
        </div>
        <div className="flex space-x-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            disabled={isLoading}
          >
            Clear {selectedType === 'all' ? 'All' : selectedType} Memories
          </button>
        </div>
      </form>

      {/* Memory List */}
      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : error ? (
        <div className="text-red-500 py-4">{error}</div>
      ) : memories.length === 0 ? (
        <div className="text-gray-500 py-4">No memories found</div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div key={memory.id} className="border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold">
                    {memory.memory_type.charAt(0).toUpperCase() + memory.memory_type.slice(1)}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    {formatDate(memory.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(memory.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>

              <div className="prose max-w-none">
                {typeof memory.content === 'string' ? (
                  <p>{memory.content}</p>
                ) : (
                  <pre className="bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(memory.content, null, 2)}
                  </pre>
                )}
              </div>

              {Object.keys(memory.metadata).length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  <details>
                    <summary>Metadata</summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(memory.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 