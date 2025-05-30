import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useContractState } from '@/lib/hooks';
import { useBatchNFTMetadata } from '@/lib/hooks';
import NFTPreview from './NFTPreview';

interface UserNFTGalleryProps {
  limit?: number;
  showEmpty?: boolean;
}

const UserNFTGallery: React.FC<UserNFTGalleryProps> = ({ 
  limit,
  showEmpty = true
}) => {
  const { address, isConnected } = useAccount();
  const { 
    userMinted,
    isRevealed,
    isLoading: isContractLoading,
    newlyMintedTokens
  } = useContractState();
  
  // Get all token IDs from the contract
  const [userTokenIds, setUserTokenIds] = useState<number[]>([]);
  
  // Set token IDs from contract data
  useEffect(() => {
    if (newlyMintedTokens.length > 0) {
      const limitedTokens = limit ? newlyMintedTokens.slice(0, limit) : newlyMintedTokens;
      setUserTokenIds(limitedTokens);
    }
  }, [newlyMintedTokens, limit]);
  
  // Fetch metadata for all user's tokens
  const { 
    metadataList, 
    isLoading: isMetadataLoading 
  } = useBatchNFTMetadata(userTokenIds, isRevealed, userTokenIds.length > 0);
  
  const isLoading = isContractLoading || isMetadataLoading;
  
  // If not connected, show a message
  if (!isConnected) {
    return showEmpty ? (
      <div className="sonic-card p-6 text-center">
        <p className="text-sonic-muted">Connect your wallet to view your NFTs</p>
      </div>
    ) : null;
  }
  
  // If loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="sonic-card p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 size={30} className="animate-spin mb-4 text-sonic-primary" />
          <p className="text-sonic-muted">Loading your NFTs...</p>
        </div>
      </div>
    );
  }
  
  // If user has no NFTs, show a message
  if (userMinted === 0 || userTokenIds.length === 0) {
    return showEmpty ? (
      <div className="sonic-card p-6 text-center">
        <div className="flex flex-col items-center justify-center py-8">
          <Info size={30} className="mb-4 text-sonic-primary" />
          <p className="text-sonic-muted">You don't have any Sonic NFTs yet</p>
          <button className="sonic-button mt-4">Mint Your First NFT</button>
        </div>
      </div>
    ) : null;
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-sonic-text">Your NFT Collection</h2>
      <p className="text-sonic-muted">You own {userMinted} Sonic NFT{userMinted !== 1 ? 's' : ''}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {userTokenIds.map((tokenId, index) => {
          const metadata = metadataList[index];
          return (
            <motion.div
              key={tokenId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <NFTPreview 
                tokenId={tokenId}
                isRevealed={isRevealed}
                imageUrl={metadata?.image}
                ipfsUri={metadata?.image}
                attributes={metadata?.attributes || []}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default UserNFTGallery; 