'use client';

/**
 * Client-safe Farm Management utilities
 * 
 * These functions provide a client-safe interface to farm management data
 * by making fetch requests to API endpoints rather than directly using
 * database clients in client components.
 * 
 * During development, this uses mock data directly for faster prototyping.
 */

import { Farm, FarmStatus } from '@/types/farm-management';
import { mockFarms, mockFarmStats } from './mock-farm-data';

/**
 * Get all farms
 */
export async function getFarms(): Promise<Farm[]> {
  // Development mode: Return mock data directly
  if (process.env.NODE_ENV === 'development') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockFarms];
  }
  
  // Production mode: Use API
  const response = await fetch('/api/farm-management/farms');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch farms: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get farm management statistics
 */
export async function getFarmStats() {
  // Development mode: Return mock data directly
  if (process.env.NODE_ENV === 'development') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {...mockFarmStats};
  }
  
  // Production mode: Use API
  const response = await fetch('/api/farm-management/stats');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch farm stats: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Update farm status
 */
export async function updateFarmStatus(farmId: string, status: FarmStatus) {
  // Development mode: Update mock data
  if (process.env.NODE_ENV === 'development') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app we would update the mock data here
    console.log(`[DEV] Updating farm ${farmId} status to ${status}`);
    return { success: true };
  }
  
  // Production mode: Use API
  const response = await fetch(`/api/farm-management/farms/${farmId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update farm status: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create a new farm
 */
export async function createFarm(data: {
  name: string;
  status?: FarmStatus;
  bossman?: {
    model: string;
    status: string;
  };
}) {
  // Development mode: Create in mock data
  if (process.env.NODE_ENV === 'development') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('[DEV] Creating new farm:', data);
    return {
      id: `new-${Date.now()}`,
      name: data.name,
      status: data.status || 'initializing',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      agents: 0,
      performance: 0,
      bossman: data.bossman || {
        model: 'ElizaOS-Basic',
        status: 'idle'
      },
      resources: {
        cpu: 10,
        memory: 15
      }
    };
  }
  
  // Production mode: Use API
  const response = await fetch('/api/farm-management/farms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create farm: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
