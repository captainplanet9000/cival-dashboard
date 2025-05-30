import React from 'react';
import { motion } from 'framer-motion';
import { useCollectionStats } from '@/lib/hooks';
import { Users, Star, Clock, Activity } from 'lucide-react';

interface MintingProgressProps {
  className?: string;
  showTitle?: boolean;
}

const MintingProgress: React.FC<MintingProgressProps> = ({
  className = '',
  showTitle = true,
}) => {
  const {
    isLoading,
    mintedPercent,
    totalMinted,
    totalSupply,
    isRevealed,
    holderCount,
    timeUntilReveal,
  } = useCollectionStats();

  return (
    <div className={`sonic-card p-6 ${className}`}>
      {showTitle && (
        <h2 className="text-xl font-bold text-sonic-text mb-4">Collection Progress</h2>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-pulse flex space-x-2">
            <div className="h-2 w-2 bg-sonic-primary rounded-full"></div>
            <div className="h-2 w-2 bg-sonic-primary rounded-full"></div>
            <div className="h-2 w-2 bg-sonic-primary rounded-full"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-sonic-text font-medium">Mint Progress</span>
              <span className="text-sm text-sonic-muted">
                {totalMinted} / {totalSupply} NFTs
              </span>
            </div>
            <div className="relative h-4 bg-sonic-card rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-sonic-primary to-sonic-secondary"
                initial={{ width: '0%' }}
                animate={{ width: `${mintedPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
              <span 
                className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white drop-shadow-md"
                style={{ opacity: mintedPercent > 5 ? 1 : 0 }}
              >
                {mintedPercent}%
              </span>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Minted */}
            <div className="bg-sonic-card/50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Activity size={18} className="text-sonic-primary mr-2" />
                <h3 className="text-sm font-medium text-sonic-text">Minted</h3>
              </div>
              <p className="text-2xl font-bold text-sonic-text">{totalMinted}</p>
              <p className="text-xs text-sonic-muted mt-1">
                {totalSupply - totalMinted} remaining
              </p>
            </div>
            
            {/* Holders */}
            <div className="bg-sonic-card/50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Users size={18} className="text-sonic-primary mr-2" />
                <h3 className="text-sm font-medium text-sonic-text">Holders</h3>
              </div>
              <p className="text-2xl font-bold text-sonic-text">{holderCount}</p>
              <p className="text-xs text-sonic-muted mt-1">unique collectors</p>
            </div>
            
            {/* Revealed Status */}
            <div className="bg-sonic-card/50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Star size={18} className="text-sonic-primary mr-2" />
                <h3 className="text-sm font-medium text-sonic-text">Status</h3>
              </div>
              <p className="text-lg font-medium text-sonic-text">
                {isRevealed ? (
                  <span className="text-green-500">Revealed</span>
                ) : (
                  <span className="text-amber-500">Unrevealed</span>
                )}
              </p>
              <p className="text-xs text-sonic-muted mt-1">
                {isRevealed ? 'Art is visible' : 'Coming soon'}
              </p>
            </div>
            
            {/* Reveal Timer */}
            <div className="bg-sonic-card/50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock size={18} className="text-sonic-primary mr-2" />
                <h3 className="text-sm font-medium text-sonic-text">Reveal In</h3>
              </div>
              {isRevealed ? (
                <>
                  <p className="text-lg font-medium text-green-500">Completed</p>
                  <p className="text-xs text-sonic-muted mt-1">Art is now visible</p>
                </>
              ) : timeUntilReveal ? (
                <>
                  <p className="text-lg font-medium text-sonic-text">
                    {timeUntilReveal.days}d {timeUntilReveal.hours}h
                  </p>
                  <p className="text-xs text-sonic-muted mt-1">until reveal</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-sonic-text">TBA</p>
                  <p className="text-xs text-sonic-muted mt-1">date not set</p>
                </>
              )}
            </div>
          </div>
          
          {/* Call to Action */}
          {totalMinted < totalSupply && (
            <div className="mt-6 text-center">
              <p className="text-sm text-sonic-muted mb-3">
                Get your NFT before they're all gone!
              </p>
              <a
                href="/mint"
                className="sonic-button inline-block"
              >
                Mint Your NFT
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MintingProgress; 