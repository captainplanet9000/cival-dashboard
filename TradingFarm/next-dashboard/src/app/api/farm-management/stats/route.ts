import { NextRequest, NextResponse } from 'next/server';
import neonFarmClient from '@/utils/database/neon-farm-client';
import { mockFarmStats } from '@/utils/database/mock-farm-data';
import { MessageBus, StrategyDocument, Farm } from '@/types/farm-management';

/**
 * GET /api/farm-management/stats
 * Retrieves aggregated statistics for farm management dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // In development mode, return mock stats directly
    if (process.env.NODE_ENV === 'development') {
      // Simulate a network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return NextResponse.json(mockFarmStats);
    }

    // Production mode - use database
    try {
      // Get all farms to calculate farm-related stats
      const farms: Farm[] = await neonFarmClient.getAllFarms();
      
      // Calculate farm stats
      const activeFarms = farms.filter(farm => farm.status === 'active').length;
      const pausedFarms = farms.filter(farm => farm.status === 'paused').length;
      const errorFarms = farms.filter(farm => farm.status === 'error').length;
      const totalFarms = farms.length;
      
      // Get message bus activity data with error handling
      let messageActivity: MessageBus[] = [];
      try {
        messageActivity = await neonFarmClient.getMessageBusActivity();
      } catch (activityError) {
        console.error('Error fetching message bus activity:', activityError);
        // Continue with empty activity data
      }
      
      // Calculate message bus load (this could be more sophisticated in production)
      const messageBusLoad = messageActivity.length > 0 
        ? Math.min(Math.floor(messageActivity.length / 2), 100) 
        : Math.floor(Math.random() * 80); // Fallback to random for demo purposes
      
      // Get strategy documents summary with error handling
      let documentsSummary: {
        totalCount: number;
        typeDistribution: Record<string, number>;
        recentDocuments: StrategyDocument[];
      } = {
        totalCount: 0,
        typeDistribution: {},
        recentDocuments: []
      };
      
      try {
        documentsSummary = await neonFarmClient.getStrategyDocumentsSummary();
      } catch (documentsError) {
        console.error('Error fetching strategy documents summary:', documentsError);
        // Continue with empty documents data
      }
      
      // Compile stats response
      const stats = {
        farms: {
          activeFarms,
          pausedFarms,
          errorFarms,
          totalFarms
        },
        messageBus: {
          load: messageBusLoad,
          recentActivity: messageActivity.slice(0, 5)
        },
        strategyDocuments: {
          totalCount: documentsSummary.totalCount,
          typeDistribution: documentsSummary.typeDistribution,
          recentDocuments: documentsSummary.recentDocuments.slice(0, 5)
        },
        // Additional statistics could be added here as the system grows
        performance: {
          averagePerformance: farms.length > 0 
            ? farms.reduce((sum, farm) => sum + (farm.performance || 0), 0) / farms.length
            : 0,
          topPerformer: farms.length > 0
            ? farms.reduce((best, farm) => (farm.performance || 0) > (best.performance || 0) ? farm : best, farms[0])
            : null,
          worstPerformer: farms.length > 0
            ? farms.reduce((worst, farm) => (farm.performance || 0) < (worst.performance || 0) ? farm : worst, farms[0])
            : null
        },
        // System health metrics
        system: {
          status: 'healthy',
          lastUpdated: new Date().toISOString(),
          apiLatency: Math.floor(Math.random() * 200) + 50, // Simulated response time (ms)
          cpuLoad: Math.floor(Math.random() * 60) + 10, // Simulated CPU load (%)
          memoryUsage: Math.floor(Math.random() * 70) + 20 // Simulated memory usage (%)
        },
        bossman: {
          coordinating: farms.filter(farm => farm.bossman?.status === 'coordinating').length,
          models: {
            'ElizaOS-Basic': farms.filter(farm => farm.bossman?.model === 'ElizaOS-Basic').length,
            'ElizaOS-Advanced': farms.filter(farm => farm.bossman?.model === 'ElizaOS-Advanced').length,
            'ElizaOS-Expert': farms.filter(farm => farm.bossman?.model === 'ElizaOS-Expert').length
          }
        }
      };
      
      return NextResponse.json(stats);
    } catch (dbError) {
      console.error('Database error fetching farm stats:', dbError);
      
      // In production, provide generic error
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Unable to retrieve farm statistics. Please try again later.' },
          { status: 500 }
        );
      }
      
      // In development, fall back to mock data with warning
      console.warn('Falling back to mock stats data due to database error');
      return NextResponse.json({
        ...mockFarmStats,
        _warning: 'Using mock data due to database error'
      });
    }
  } catch (error) {
    console.error('Unexpected error in stats API route:', error);
    
    // Graceful error handling with fallback for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock data as fallback due to API error');
      return NextResponse.json({
        ...mockFarmStats,
        _warning: 'Using mock data due to API error'
      });
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving farm statistics.' },
      { status: 500 }
    );
  }
}
