import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, LockIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import Countdown from 'react-countdown';
import { getIpfsImageSourcesSync } from '@/lib/ipfs';

interface NFTPreviewProps {
  tokenId?: number;
  isRevealed: boolean;
  revealDate?: Date;
  imageUrl?: string;
  placeholderUrl?: string;
  isLoading?: boolean;
  ipfsUri?: string;
  attributes?: {
    trait_type: string;
    value: string;
  }[];
}

const NFTPreview: React.FC<NFTPreviewProps> = ({
  tokenId,
  isRevealed,
  revealDate,
  imageUrl,
  ipfsUri,
  placeholderUrl = '/images/unrevealed-placeholder.png',
  isLoading = false,
  attributes = [],
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageSources, setImageSources] = useState({ src: imageUrl || '', srcSet: '' });
  
  // Load IPFS image sources if ipfsUri is provided
  useEffect(() => {
    if (ipfsUri) {
      // Use the sync version initially for fast rendering
      const syncSources = getIpfsImageSourcesSync(ipfsUri);
      setImageSources(syncSources);
      
      // Then fetch the optimal gateway versions asynchronously
      import('@/lib/ipfs').then(async ({ getIpfsImageSources }) => {
        const sources = await getIpfsImageSources(ipfsUri);
        setImageSources(sources);
      }).catch(err => {
        console.error('Failed to load IPFS image sources:', err);
      });
    } else if (imageUrl) {
      setImageSources({ src: imageUrl, srcSet: '' });
    }
  }, [ipfsUri, imageUrl]);
  
  // Handle countdown completion
  const handleCountdownComplete = () => {
    // This could trigger a refresh or notification
    console.log('Countdown complete');
  };
  
  // Determine the final image URL to use
  const finalImageUrl = isRevealed ? imageSources.src : placeholderUrl;
  
  // Countdown renderer
  const countdownRenderer = ({ days, hours, minutes, seconds, completed }: any) => {
    if (completed) {
      return <span className="text-sonic-primary font-medium">Reveal time!</span>;
    } else {
      return (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="bg-sonic-card/50 rounded-md p-1 font-mono">{days}</div>
            <div className="text-xs text-sonic-muted mt-1">days</div>
          </div>
          <div>
            <div className="bg-sonic-card/50 rounded-md p-1 font-mono">{hours}</div>
            <div className="text-xs text-sonic-muted mt-1">hours</div>
          </div>
          <div>
            <div className="bg-sonic-card/50 rounded-md p-1 font-mono">{minutes}</div>
            <div className="text-xs text-sonic-muted mt-1">mins</div>
          </div>
          <div>
            <div className="bg-sonic-card/50 rounded-md p-1 font-mono">{seconds}</div>
            <div className="text-xs text-sonic-muted mt-1">secs</div>
          </div>
        </div>
      );
    }
  };
  
  return (
    <motion.div 
      className="sonic-card overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* NFT Image Section */}
      <div className="relative overflow-hidden rounded-lg aspect-square bg-sonic-card">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={40} className="text-sonic-primary animate-spin" />
          </div>
        ) : isRevealed && finalImageUrl && !imageError ? (
          <Image
            src={finalImageUrl}
            alt={`Sonic NFT #${tokenId}`}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, 384px"
            {...(imageSources.srcSet ? { srcSet: imageSources.srcSet } : {})}
          />
        ) : (
          <div className="relative w-full h-full">
            {/* Placeholder for unrevealed NFT */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-sonic-background to-sonic-primary/10">
              {placeholderUrl ? (
                <Image
                  src={placeholderUrl}
                  alt="Unrevealed NFT"
                  fill
                  className="object-cover opacity-70"
                  onError={() => setImageError(true)}
                  sizes="(max-width: 768px) 100vw, 384px"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <LockIcon size={40} className="text-sonic-primary/50 mb-4" />
                  <div className="text-center px-6">
                    <p className="text-sonic-muted text-sm">This NFT is still unrevealed</p>
                  </div>
                </div>
              )}
              
              {/* Mystery overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-sonic-background/50 backdrop-blur-sm">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Sparkles size={60} className="text-sonic-primary mb-3" />
                </motion.div>
                
                <motion.div
                  className="text-center px-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xl font-bold text-sonic-text mb-1">
                    {tokenId ? `Sonic NFT #${tokenId}` : 'Mystery NFT'}
                  </h3>
                  <p className="text-sonic-muted text-sm mb-4">
                    This NFT will be revealed soon!
                  </p>
                  
                  {/* Countdown timer if reveal date is set */}
                  {revealDate && (
                    <div className="bg-sonic-card/30 rounded-lg p-3 backdrop-blur-sm">
                      <p className="text-xs text-sonic-muted mb-2">Revealing in:</p>
                      <Countdown
                        date={revealDate}
                        renderer={countdownRenderer}
                        onComplete={handleCountdownComplete}
                      />
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        )}
        
        {/* Testnet badge if applicable */}
        {tokenId !== undefined && (
          <div className="absolute top-2 left-2 bg-sonic-primary/90 text-white px-2 py-0.5 rounded text-xs font-medium">
            #{tokenId}
          </div>
        )}
        
        {/* Revealed/Unrevealed badge */}
        <div className={`absolute top-2 right-2 ${isRevealed ? 'bg-green-500/80' : 'bg-amber-500/80'} text-white px-2 py-0.5 rounded text-xs font-medium flex items-center`}>
          {isRevealed ? (
            <>
              <Sparkles size={12} className="mr-1" />
              Revealed
            </>
          ) : (
            <>
              <LockIcon size={12} className="mr-1" />
              Unrevealed
            </>
          )}
        </div>
      </div>
      
      {/* NFT Info Section */}
      {isRevealed && attributes.length > 0 && (
        <div className="mt-4 p-3 border-t border-sonic-secondary/10">
          <h4 className="text-sm font-medium text-sonic-text mb-2">Attributes</h4>
          <div className="grid grid-cols-2 gap-2">
            {attributes.map((attr, index) => (
              <div key={index} className="bg-sonic-card/50 rounded-md p-2">
                <p className="text-xs text-sonic-muted">{attr.trait_type}</p>
                <p className="text-sm text-sonic-text font-medium">{attr.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NFTPreview; 