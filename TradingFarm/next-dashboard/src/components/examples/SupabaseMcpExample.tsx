'use client';

import { useState, useEffect } from 'react';
import { getSupabaseMcpClient } from '@/utils/mcp/supabase-mcp-client';
import type { Database } from '@/types/database.types';

// Typed Farm data
type Farm = Database['public']['Tables']['farms']['Row'];

export default function SupabaseMcpExample() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFarmName, setNewFarmName] = useState('');
  
  // Get MCP client
  const mcpClient = getSupabaseMcpClient();
  
  // Load farms on mount
  useEffect(() => {
    async function loadFarms() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await mcpClient.runQuery<Farm>({
          table: 'farms',
          select: '*',
          order: 'created_at.desc',
          limit: 10
        });
        
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load farms');
        }
        
        setFarms(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    
    loadFarms();
  }, []);
  
  // Create a new farm
  async function handleCreateFarm(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newFarmName.trim()) {
      setError('Farm name is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await mcpClient.createFarm({
        name: newFarmName,
        description: `Created via MCP at ${new Date().toISOString()}`
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create farm');
      }
      
      // Add the new farm to the list
      setFarms([response.data, ...farms]);
      
      // Clear the input
      setNewFarmName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }
  
  // Delete a farm
  async function handleDeleteFarm(id: number) {
    if (!confirm('Are you sure you want to delete this farm?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await mcpClient.deleteRecord({
        table: 'farms',
        where: { id },
        returning: '*'
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete farm');
      }
      
      // Remove the farm from the list
      setFarms(farms.filter(farm => farm.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="space-y-8 p-6 border rounded-lg shadow-sm bg-card">
      <div>
        <h2 className="text-2xl font-bold mb-4">Supabase MCP Example</h2>
        <p className="text-muted-foreground">
          This example demonstrates using the Supabase MCP client to interact with your Trading Farm database.
        </p>
      </div>
      
      {/* Create Farm Form */}
      <div className="border-t pt-4">
        <h3 className="text-xl font-semibold mb-4">Create a Farm</h3>
        <form onSubmit={handleCreateFarm} className="flex space-x-2">
          <input
            type="text"
            value={newFarmName}
            onChange={(e) => setNewFarmName(e.target.value)}
            placeholder="Enter farm name"
            className="flex-1 px-3 py-2 border rounded-md"
            disabled={loading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Farm'}
          </button>
        </form>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Farm List */}
      <div className="border-t pt-4">
        <h3 className="text-xl font-semibold mb-4">Your Farms</h3>
        {loading && farms.length === 0 ? (
          <p className="text-muted-foreground">Loading farms...</p>
        ) : farms.length === 0 ? (
          <p className="text-muted-foreground">No farms found. Create one above!</p>
        ) : (
          <div className="space-y-4">
            {farms.map((farm) => (
              <div key={farm.id} className="border p-4 rounded-md flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{farm.name}</h4>
                  <p className="text-sm text-muted-foreground">{farm.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(farm.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteFarm(farm.id)}
                  className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground border-t pt-4">
        <p>Using Supabase MCP client to connect to project: bgvlzvswzpfoywfxehis</p>
      </div>
    </div>
  );
}
