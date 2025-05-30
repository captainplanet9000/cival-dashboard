import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export interface CollectionStats {
  totalSupply: number;
  mintedCount: number;
  maxPerWallet: number;
  mintedByUser: number;
  mintPrice: string;
}

export const useCollectionStats = () => {
  const [data, setData] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        // Fetch collection-wide stats
        const response = await fetch('/api/collection/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch collection stats');
        }
        
        const collectionData = await response.json();
        
        // If user is connected, fetch user-specific stats
        let userData = { mintedByUser: 0 };
        
        if (isConnected && address) {
          const userResponse = await fetch(`/api/users/${address}/nft-stats`);
          
          if (userResponse.ok) {
            userData = await userResponse.json();
          }
        }
        
        setData({
          ...collectionData,
          mintedByUser: userData.mintedByUser
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error fetching collection stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    
    // Refresh data every 30 seconds to keep minting progress updated
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, [address, isConnected]);

  return { data, isLoading, error };
}; 