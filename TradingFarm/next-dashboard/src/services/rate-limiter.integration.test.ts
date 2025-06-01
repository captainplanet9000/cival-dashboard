import { RateLimiter } from './rate-limiter';

describe('RateLimiter Integration', () => {
  it('should enforce rate limits', async () => {
    const limiter = new RateLimiter({ maxRequests: 2, intervalMs: 100 });
    await limiter.acquire();
    await limiter.acquire();
    const start = Date.now();
    await limiter.acquire();
    expect(Date.now() - start).toBeGreaterThanOrEqual(100);
  });
});
