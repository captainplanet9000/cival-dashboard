import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/services/redis-service';

/**
 * Cache Clear API endpoint
 * POST /api/cache/clear - Clear all cache entries
 * POST /api/cache/clear?namespace=market-data - Clear specific namespace
 * POST /api/cache/clear?pattern=trading-farm:market-data:BTC* - Clear by pattern
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace');
    const pattern = url.searchParams.get('pattern');
    
    const redis = getRedisClient();
    let deletedKeysCount = 0;
    
    if (pattern) {
      // Delete keys matching a specific pattern
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        deletedKeysCount = await redis.del(...keys);
      }
    } else if (namespace) {
      // Delete keys in a specific namespace
      const namespacePattern = `trading-farm:${namespace}:*`;
      const keys = await redis.keys(namespacePattern);
      if (keys.length > 0) {
        deletedKeysCount = await redis.del(...keys);
      }
    } else {
      // Delete all trading-farm cache keys
      const allKeys = await redis.keys('trading-farm:*');
      if (allKeys.length > 0) {
        deletedKeysCount = await redis.del(...allKeys);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${deletedKeysCount} cache entries`,
      deleted: deletedKeysCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache'
      },
      { status: 500 }
    );
  }
}
