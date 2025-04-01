import { useState, useEffect, useMemo } from 'react';
import { useContractRead, useContractEvent, useAccount, useNetwork } from 'wagmi';
import { getContractConfig } from '../web3Config';

/**
 * Custom hook for reading NFT contract state and subscribing to events
 */
export function useContractState() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [lastMintedTokenId, setLastMintedTokenId] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [newlyMintedTokens, setNewlyMintedTokens] = useState<number[]>([]);
  
  // Get the proper contract config based on the current network
  const contractConfig = useMemo(() => getContractConfig(chain?.id), [chain?.id]);
  
  // Read total supply
  const { 
    data: totalSupply,
    isLoading: isLoadingTotalSupply,
    refetch: refetchTotalSupply
  } = useContractRead({
    ...contractConfig,
    functionName: 'totalSupply',
    watch: true,
  });
  
  // Read max supply
  const { 
    data: maxSupply,
    isLoading: isLoadingMaxSupply
  } = useContractRead({
    ...contractConfig,
    functionName: 'MAX_SUPPLY',
  });
  
  // Read minting status
  const { 
    data: mintingActive,
    isLoading: isLoadingMintingStatus
  } = useContractRead({
    ...contractConfig,
    functionName: 'mintingActive',
    watch: true,
  });
  
  // Read reveal status
  const { 
    data: revealStatus,
    isLoading: isLoadingRevealStatus,
    refetch: refetchRevealStatus
  } = useContractRead({
    ...contractConfig,
    functionName: 'revealed',
    watch: true,
  });
  
  // Read max per wallet
  const { 
    data: maxPerWallet,
  } = useContractRead({
    ...contractConfig,
    functionName: 'maxPerWallet',
  });
  
  // Read minted per wallet
  const { 
    data: mintedByUser,
    isLoading: isLoadingUserMinted,
    refetch: refetchUserMinted
  } = useContractRead({
    ...contractConfig,
    functionName: 'mintedPerWallet',
    args: [address || '0x0000000000000000000000000000000000000000'],
    enabled: isConnected,
    watch: true,
  });
  
  // Subscribe to Minted event
  useContractEvent({
    ...contractConfig,
    eventName: 'Minted',
    listener(logs) {
      // For each log, extract the token ID and address
      logs.forEach(log => {
        if (log.args && log.args.tokenId && log.args.to) {
          const tokenId = Number(log.args.tokenId);
          const mintAddress = log.args.to as `0x${string}`;
          
          // If it's the current user, add to newly minted tokens
          if (mintAddress.toLowerCase() === address?.toLowerCase()) {
            setNewlyMintedTokens(prev => [...prev, tokenId]);
            setLastMintedTokenId(tokenId);
          }
          
          // Always refetch total supply when anyone mints
          refetchTotalSupply();
          
          // If the current user minted, refetch their balance
          if (mintAddress.toLowerCase() === address?.toLowerCase()) {
            refetchUserMinted();
          }
        }
      });
    },
  });
  
  // Subscribe to Revealed event
  useContractEvent({
    ...contractConfig,
    eventName: 'Revealed',
    listener(logs) {
      logs.forEach(log => {
        if (log.args && log.args.revealState !== undefined) {
          setIsRevealed(Boolean(log.args.revealState));
          refetchRevealStatus();
        }
      });
    },
  });
  
  // Update revealed state when contract data changes
  useEffect(() => {
    if (revealStatus !== undefined) {
      setIsRevealed(Boolean(revealStatus));
    }
  }, [revealStatus]);
  
  // Calculate derived state
  const totalMinted = totalSupply ? Number(totalSupply) : 0;
  const maxTokens = maxSupply ? Number(maxSupply) : 0;
  const userMinted = mintedByUser ? Number(mintedByUser) : 0;
  const maxUserTokens = maxPerWallet ? Number(maxPerWallet) : 0;
  const remainingForUser = maxUserTokens - userMinted;
  const isMintingActive = Boolean(mintingActive);
  const soldOutPercentage = maxTokens > 0 ? (totalMinted / maxTokens) * 100 : 0;
  const isSoldOut = totalMinted >= maxTokens;
  
  // Determine if user can mint
  const canMint = isConnected && isMintingActive && !isSoldOut && remainingForUser > 0;
  
  return {
    // Raw contract data
    totalSupply,
    maxSupply,
    mintingActive,
    revealStatus,
    maxPerWallet,
    mintedByUser,
    
    // Loading states
    isLoading: isLoadingTotalSupply || isLoadingMaxSupply || isLoadingMintingStatus || isLoadingRevealStatus || isLoadingUserMinted,
    
    // Derived values
    totalMinted,
    maxTokens,
    userMinted,
    maxUserTokens,
    remainingForUser,
    isMintingActive,
    isSoldOut,
    soldOutPercentage,
    canMint,
    isRevealed,
    
    // Event data
    lastMintedTokenId,
    newlyMintedTokens,
    
    // Refetch functions
    refetchTotalSupply,
    refetchUserMinted,
    refetchRevealStatus,
  };
} 