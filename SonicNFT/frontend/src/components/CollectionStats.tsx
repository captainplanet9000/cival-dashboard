import React from 'react';
import { useCollectionStats } from '@/lib/hooks';
import { Clock, Users, Image, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CollectionStatsProps {
  className?: string;
  showMintProgress?: boolean;
  showRevealTimer?: boolean;
  showHolderCount?: boolean;
  compact?: boolean;
}

const CollectionStats: React.FC<CollectionStatsProps> = ({
  className = '',
  showMintProgress = true,
  showRevealTimer = true,
  showHolderCount = true,
  compact = false,
}) => {
  const { 
    isLoading,
    mintedPercent,
    totalMinted,
    totalSupply,
    isRevealed,
    holderCount,
    timeUntilReveal
  } = useCollectionStats();

  if (isLoading) {
    return (
      <div className={`sonic-card p-4 ${className}`}>
        <div className="flex justify-center items-center py-4">
          <Loader2 size={24} className="text-sonic-primary animate-spin mr-2" />
          <span className="text-sonic-muted">Loading collection stats...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={`sonic-card ${compact ? 'p-4' : 'p-6'} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col space-y-4">
        {/* Mint Progress */}
        {showMintProgress && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`${compact ? 'text-sm' : 'text-base'} font-medium text-sonic-text`}>
                Mint Progress
              </h3>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-sonic-muted`}>
                {totalMinted} / {totalSupply}
              </span>
            </div>
            
            <div className="relative h-2 bg-sonic-background rounded-full overflow-hidden">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-sonic-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${mintedPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            
            <div className="mt-1 flex justify-between items-center">
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-sonic-primary font-medium`}>
                {mintedPercent}% Minted
              </span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-sonic-muted`}>
                {totalSupply - totalMinted} Remaining
              </span>
            </div>
          </div>
        )}
        
        {/* Reveal Status */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reveal Timer */}
          {showRevealTimer && (
            <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3'}`}>
              {isRevealed ? (
                <Sparkles size={compact ? 16 : 20} className="text-green-500" />
              ) : (
                <Clock size={compact ? 16 : 20} className="text-amber-500" />
              )}
              <div>
                <h4 className={`${compact ? 'text-xs' : 'text-sm'} text-sonic-muted`}>
                  {isRevealed ? 'Revealed' : 'Reveal In'}
                </h4>
                <p className={`${compact ? 'text-xs font-medium' : 'text-sm font-medium'} text-sonic-text`}>
                  {isRevealed ? (
                    'Collection Revealed'
                  ) : timeUntilReveal ? (
                    `${timeUntilReveal.days}d ${timeUntilReveal.hours}h ${timeUntilReveal.minutes}m`
                  ) : (
                    'Coming Soon'
                  )}
                </p>
              </div>
            </div>
          )}
          
          {/* Holder Count */}
          {showHolderCount && (
            <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3'}`}>
              <Users size={compact ? 16 : 20} className="text-sonic-primary" />
              <div>
                <h4 className={`${compact ? 'text-xs' : 'text-sm'} text-sonic-muted`}>
                  Unique Holders
                </h4>
                <p className={`${compact ? 'text-xs font-medium' : 'text-sm font-medium'} text-sonic-text`}>
                  {holderCount} collectors
                </p>
              </div>
            </div>
          )}
          
          {/* Collection Size */}
          <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3'}`}>
            <Image size={compact ? 16 : 20} className="text-sonic-primary" />
            <div>
              <h4 className={`${compact ? 'text-xs' : 'text-sm'} text-sonic-muted`}>
                Collection Size
              </h4>
              <p className={`${compact ? 'text-xs font-medium' : 'text-sm font-medium'} text-sonic-text`}>
                {totalSupply} NFTs
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionStats; 