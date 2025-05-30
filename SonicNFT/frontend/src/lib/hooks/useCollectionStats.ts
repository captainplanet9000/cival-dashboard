import { useState, useEffect } from 'react';

interface CollectionStats {
  total_supply: number;
  minted_count: number;
  revealed_count: number;
  holder_count: number;
  floor_price: number;
  volume_traded: number;
  is_revealed: boolean;
  reveal_date: string | null;
  percent_minted: number;
}

/**
 * Custom hook to fetch collection statistics from the API
 */
export function useCollectionStats() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch the collection stats from the API
        const response = await fetch('/api/collection/stats');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch collection stats: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setStats(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching collection stats:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch collection stats'));
          setIsLoading(false);
        }
      }
    };
    
    fetchStats();
    
    // Set up polling every 60 seconds to keep stats updated
    const intervalId = setInterval(fetchStats, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);
  
  // Calculate time until reveal if a reveal date is set
  const getTimeUntilReveal = (): { days: number; hours: number; minutes: number } | null => {
    if (!stats?.reveal_date) return null;
    
    const now = new Date();
    const revealDate = new Date(stats.reveal_date);
    
    // If already revealed, return null
    if (now >= revealDate || stats.is_revealed) return null;
    
    const diffMs = revealDate.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  };
  
  return { 
    stats, 
    isLoading, 
    error,
    timeUntilReveal: getTimeUntilReveal(),
    mintedPercent: stats?.percent_minted || 0,
    totalMinted: stats?.minted_count || 0,
    totalSupply: stats?.total_supply || 0,
    isRevealed: stats?.is_revealed || false,
    holderCount: stats?.holder_count || 0
  };
}

export default useCollectionStats; 