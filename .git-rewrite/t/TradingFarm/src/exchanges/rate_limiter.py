"""
Rate Limiter Module

Provides rate limiting functionality for API requests to exchanges.
Helps prevent exceeding API rate limits and getting blocked.
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class RateLimitRule:
    """
    Defines a rule for rate limiting.
    
    For example, 5 calls per second would be calls=5, period=1.0
    """
    key: str  # Identifier for the rate limit rule (e.g., endpoint name)
    calls: int  # Number of calls allowed
    period: float  # Time period in seconds
    
    def __post_init__(self):
        self.calls = max(1, self.calls)  # Ensure at least 1 call is allowed
        self.period = max(0.1, self.period)  # Ensure period is at least 0.1 seconds


class TokenBucket:
    """
    Implementation of the token bucket algorithm for rate limiting.
    
    The bucket has a maximum capacity of tokens and refills at a constant rate.
    Each API call consumes one token.
    """
    
    def __init__(self, capacity: int, refill_rate: float):
        """
        Initialize a token bucket.
        
        Args:
            capacity: Maximum number of tokens in the bucket
            refill_rate: Rate at which tokens are refilled (tokens per second)
        """
        self.capacity = max(1, capacity)
        self.refill_rate = max(0.1, refill_rate)
        self.tokens = float(capacity)
        self.last_refill = time.time()
    
    def _refill(self):
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
    
    async def consume(self, tokens: int = 1) -> float:
        """
        Consume tokens from the bucket.
        
        Args:
            tokens: Number of tokens to consume
            
        Returns:
            Time to wait (in seconds) before next consumption is allowed, or 0 if no wait
        """
        self._refill()
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return 0.0
        else:
            # Calculate wait time to have enough tokens
            needed = tokens - self.tokens
            wait_time = needed / self.refill_rate
            return wait_time


class RateLimiter:
    """
    Rate limiter for API requests.
    
    Manages multiple rate limit rules and enforces them.
    """
    
    def __init__(self, name: str = "rate_limiter"):
        """
        Initialize a rate limiter.
        
        Args:
            name: Name of the rate limiter
        """
        self.name = name
        self.rules: List[RateLimitRule] = []
        self.buckets: Dict[str, TokenBucket] = {}
        self.logger = logging.getLogger(f"rate_limiter.{name}")
        self.default_rule = RateLimitRule(key="default", calls=10, period=1.0)
        
        # Add default rule
        self.add_rule(self.default_rule)
    
    def add_rule(self, rule: RateLimitRule) -> None:
        """
        Add a rate limit rule.
        
        Args:
            rule: Rate limit rule to add
        """
        # Replace existing rule with the same key
        self.rules = [r for r in self.rules if r.key != rule.key]
        self.rules.append(rule)
        
        # Create token bucket for the rule
        self.buckets[rule.key] = TokenBucket(
            capacity=rule.calls,
            refill_rate=rule.calls / rule.period
        )
        
        self.logger.debug(f"Added rate limit rule: {rule}")
    
    def remove_rule(self, key: str) -> bool:
        """
        Remove a rate limit rule.
        
        Args:
            key: Key of the rule to remove
            
        Returns:
            True if the rule was removed, False otherwise
        """
        initial_count = len(self.rules)
        self.rules = [r for r in self.rules if r.key != key]
        
        if key in self.buckets:
            del self.buckets[key]
        
        removed = len(self.rules) < initial_count
        if removed:
            self.logger.debug(f"Removed rate limit rule: {key}")
        
        return removed
    
    def get_rule(self, key: str) -> Optional[RateLimitRule]:
        """
        Get a rate limit rule by key.
        
        Args:
            key: Key of the rule
            
        Returns:
            Rate limit rule or None if not found
        """
        for rule in self.rules:
            if rule.key == key:
                return rule
        return None
    
    def _get_bucket(self, key: str) -> TokenBucket:
        """
        Get a token bucket for a key.
        
        Args:
            key: Key of the bucket
            
        Returns:
            Token bucket (default bucket if key not found)
        """
        return self.buckets.get(key, self.buckets["default"])
    
    async def acquire(self, key: str = "default", tokens: int = 1) -> None:
        """
        Acquire permission to make an API request.
        
        This method will block until the request is allowed
        according to the rate limit rules.
        
        Args:
            key: Key of the rate limit rule
            tokens: Number of tokens to consume
        """
        bucket = self._get_bucket(key)
        wait_time = await bucket.consume(tokens)
        
        if wait_time > 0:
            self.logger.debug(f"Rate limited: waiting {wait_time:.2f}s for {key}")
            await asyncio.sleep(wait_time)
    
    async def try_acquire(
        self,
        key: str = "default",
        tokens: int = 1,
        timeout: float = 0.0
    ) -> bool:
        """
        Try to acquire permission with a timeout.
        
        Args:
            key: Key of the rate limit rule
            tokens: Number of tokens to consume
            timeout: Maximum time to wait (in seconds)
            
        Returns:
            True if permission was acquired, False if timeout was reached
        """
        bucket = self._get_bucket(key)
        wait_time = await bucket.consume(tokens)
        
        if wait_time <= 0:
            return True
        
        if wait_time <= timeout:
            self.logger.debug(f"Rate limited: waiting {wait_time:.2f}s for {key}")
            await asyncio.sleep(wait_time)
            return True
        else:
            self.logger.debug(f"Rate limited: timeout waiting for {key} ({wait_time:.2f}s needed)")
            return False
    
    def reset(self, key: Optional[str] = None) -> None:
        """
        Reset rate limiter buckets.
        
        Args:
            key: Optional key to reset (resets all if None)
        """
        if key is not None:
            if key in self.buckets:
                bucket = self.buckets[key]
                bucket.tokens = bucket.capacity
                bucket.last_refill = time.time()
                self.logger.debug(f"Reset rate limiter bucket: {key}")
        else:
            for k, bucket in self.buckets.items():
                bucket.tokens = bucket.capacity
                bucket.last_refill = time.time()
            self.logger.debug("Reset all rate limiter buckets")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get status of all rate limit buckets.
        
        Returns:
            Dictionary with bucket status information
        """
        now = time.time()
        status = {}
        
        for key, bucket in self.buckets.items():
            # Refill based on elapsed time
            elapsed = now - bucket.last_refill
            tokens = min(bucket.capacity, bucket.tokens + elapsed * bucket.refill_rate)
            
            status[key] = {
                'available_tokens': tokens,
                'capacity': bucket.capacity,
                'refill_rate': bucket.refill_rate,
                'percent_available': (tokens / bucket.capacity) * 100
            }
        
        return status
