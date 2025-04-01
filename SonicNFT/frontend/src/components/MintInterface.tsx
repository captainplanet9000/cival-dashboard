import React, { useState, useEffect } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { Loader2, Plus, Minus, AlertTriangle, ExternalLink, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContractMint, useContractState, useTransactionMonitor } from '@/lib/hooks';
import NFTPreview from './NFTPreview';
import WalletConnectionModal from './WalletConnectionModal';

// Define steps in minting process
enum MintStep {
  Preview,
  Minting,
  Success,
}

const MintInterface = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [currentStep, setCurrentStep] = useState<MintStep>(MintStep.Preview);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [mintedTokenIds, setMintedTokenIds] = useState<number[]>([]);
  const [optimisticMintCount, setOptimisticMintCount] = useState(0);
  
  // Estimated reveal date (replace with actual date when known)
  const revealDate = new Date();
  revealDate.setDate(revealDate.getDate() + 7); // 7 days from now
  
  // Use our custom hooks
  const { 
    mintAmount, 
    setMintAmount, 
    mint, 
    isLoading: isMintLoading,
    isPending: isMintPending, 
    isSuccess: isMintSuccess,
    transactionHash, 
  } = useContractMint();
  
  const {
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
    isLoading: isStateLoading,
    lastMintedTokenId,
    newlyMintedTokens,
  } = useContractState();
  
  // Use transaction monitor
  const { monitorTransaction } = useTransactionMonitor();
  
  // Update steps based on minting state
  useEffect(() => {
    if (isMintPending) {
      setCurrentStep(MintStep.Minting);
      // Optimistic UI update for minted count
      setOptimisticMintCount(mintAmount);
    } else if (isMintSuccess) {
      setCurrentStep(MintStep.Success);
      // Reset optimistic count on success
      setOptimisticMintCount(0);
    }
  }, [isMintPending, isMintSuccess, mintAmount]);
  
  // Track minted token IDs
  useEffect(() => {
    if (lastMintedTokenId !== null) {
      setMintedTokenIds(prev => [...prev, lastMintedTokenId]);
    }
  }, [lastMintedTokenId]);
  
  // Reset to preview step when done
  useEffect(() => {
    if (currentStep === MintStep.Success) {
      const timer = setTimeout(() => {
        setCurrentStep(MintStep.Preview);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);
  
  // Handle mint amount changes
  const decrementMintAmount = () => {
    if (mintAmount > 1) {
      setMintAmount(mintAmount - 1);
    }
  };
  
  const incrementMintAmount = () => {
    if (mintAmount < remainingForUser) {
      setMintAmount(mintAmount + 1);
    }
  };
  
  // Enhanced mint function with transaction monitoring
  const handleMint = () => {
    if (!isConnected) {
      setIsWalletModalOpen(true);
      return;
    }
    
    const result = mint();
    if (result && transactionHash) {
      monitorTransaction(transactionHash, `Mint ${mintAmount} Sonic NFT${mintAmount > 1 ? 's' : ''}`);
    }
  };
  
  // Check if minting is disabled
  const isMintingDisabled = !isConnected || !isMintingActive || isSoldOut || remainingForUser <= 0 || isMintLoading || isMintPending;
  
  // Optimistic total count for better UX
  const displayTotalMinted = totalMinted + (isMintPending ? optimisticMintCount : 0);
  
  // Loading state display
  if (isStateLoading) {
    return (
      <motion.div
        className="sonic-card relative overflow-hidden p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 size={30} className="animate-spin mb-4 text-sonic-primary" />
          <p className="text-sonic-muted">Loading mint data...</p>
        </div>
      </motion.div>
    );
  }
  
  return (
    <>
      <AnimatePresence mode="wait">
        {currentStep === MintStep.Preview && (
          <motion.div 
            key="preview"
            className="sonic-card relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {!isRevealed && (
              <div className="absolute top-0 right-0 bg-sonic-warning text-black font-bold py-1 px-3 text-sm rounded-bl-lg">
                UNREVEALED
              </div>
            )}
            
            <div className="text-center mb-6">
              <h2 className="sonic-heading text-3xl mb-2">Mint Your Sonic NFT</h2>
              <p className="text-sonic-muted">Free mint on Sonic Network</p>
            </div>
            
            {/* NFT Preview for user feedback */}
            <div className="mb-6">
              <NFTPreview 
                isRevealed={isRevealed}
                revealDate={revealDate}
                placeholderUrl="/images/unrevealed-placeholder.png"
              />
            </div>
            
            <div className="mb-6">
              <div className="h-4 w-full bg-sonic-card rounded-full overflow-hidden border border-sonic-secondary/30">
                <div 
                  className="h-full bg-gradient-to-r from-sonic-primary to-sonic-secondary"
                  style={{ width: `${soldOutPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-sonic-text">{displayTotalMinted} minted</span>
                <span className="text-sonic-muted">{maxTokens - displayTotalMinted} remaining</span>
              </div>
            </div>
            
            {remainingForUser <= 0 && isConnected ? (
              <div className="mb-6 p-4 bg-sonic-secondary/10 rounded-lg flex items-center text-sonic-muted">
                <AlertTriangle size={20} className="mr-2 text-sonic-warning" />
                <span>You've reached your maximum mint allocation.</span>
              </div>
            ) : null}
            
            <div className="flex items-center justify-between mb-6 p-4 bg-sonic-secondary/10 rounded-lg">
              <span className="text-sonic-text">Quantity:</span>
              <div className="flex items-center">
                <button 
                  onClick={decrementMintAmount}
                  disabled={mintAmount <= 1 || isMintingDisabled}
                  className="p-2 rounded-lg bg-sonic-card text-sonic-text hover:bg-sonic-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus size={20} />
                </button>
                <span className="mx-4 text-xl font-bold w-8 text-center">{mintAmount}</span>
                <button 
                  onClick={incrementMintAmount}
                  disabled={mintAmount >= remainingForUser || isMintingDisabled}
                  className="p-2 rounded-lg bg-sonic-card text-sonic-text hover:bg-sonic-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            
            <div className="mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-sonic-muted">Price:</span>
                <span className="text-sonic-text font-bold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sonic-muted">Gas Fee:</span>
                <span className="text-sonic-text">Network fee applies</span>
              </div>
              {isConnected && (
                <div className="flex justify-between">
                  <span className="text-sonic-muted">Your minted:</span>
                  <span className="text-sonic-text">{userMinted} of {maxUserTokens}</span>
                </div>
              )}
              {isConnected && chain && (
                <div className="flex justify-between">
                  <span className="text-sonic-muted">Network:</span>
                  <span className="text-sonic-text flex items-center">
                    {chain.name}
                    {chain.testnet && (
                      <span className="ml-2 text-xs bg-amber-600/20 text-amber-500 px-2 py-0.5 rounded-full">
                        Testnet
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleMint}
              disabled={isMintingDisabled}
              className="sonic-button w-full flex items-center justify-center"
            >
              {isMintLoading ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  Preparing...
                </>
              ) : !isMintingActive ? (
                'Minting Not Active'
              ) : !isConnected ? (
                'Connect Wallet to Mint'
              ) : isSoldOut ? (
                'Sold Out'
              ) : remainingForUser <= 0 ? (
                'Max Minted'
              ) : (
                `Mint ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}`
              )}
            </button>
            
            {!isConnected && (
              <p className="mt-4 text-center text-sonic-muted text-sm">Connect your wallet to mint your Sonic NFTs</p>
            )}
            
            {isMintingActive === false && (
              <p className="mt-4 text-center text-sonic-warning text-sm">Minting is currently not active. Check back soon!</p>
            )}
          </motion.div>
        )}
        
        {currentStep === MintStep.Minting && (
          <motion.div
            key="minting"
            className="sonic-card relative overflow-hidden p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-sonic-primary/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-t-4 border-sonic-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={30} className="text-sonic-primary animate-spin" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-sonic-text mb-2">Minting in Progress</h3>
              <p className="text-sonic-muted text-center mb-4">
                Your transaction is being processed. Please wait for confirmation.
              </p>
              
              {/* Transaction info */}
              {transactionHash && chain && (
                <div className="w-full p-4 bg-sonic-secondary/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sonic-muted text-sm">Transaction</span>
                    <a 
                      href={`${chain.blockExplorers?.default.url}/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-sonic-primary flex items-center hover:underline"
                    >
                      <span>View</span>
                      <ExternalLink size={12} className="ml-1" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sonic-muted text-sm">Minting</span>
                    <span className="text-sonic-text text-sm">{mintAmount} NFTs</span>
                  </div>
                </div>
              )}
              
              {/* Optimistic UI preview of new NFTs */}
              {mintAmount > 0 && (
                <div className="mt-6 w-full">
                  <h4 className="text-sm font-medium text-sonic-text mb-3">Preview of your NFTs</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: mintAmount }).map((_, index) => (
                      <div key={index} className="aspect-square bg-sonic-card/50 rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 size={24} className="text-sonic-primary/50 animate-spin" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {currentStep === MintStep.Success && (
          <motion.div
            key="success"
            className="sonic-card relative overflow-hidden p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6"
              >
                <CheckCircle size={40} className="text-green-500" />
              </motion.div>
              
              <h3 className="text-xl font-bold text-sonic-text mb-2">Minting Successful!</h3>
              <p className="text-sonic-muted text-center mb-6">
                Congratulations! You have successfully minted {mintAmount} Sonic NFT{mintAmount > 1 ? 's' : ''}.
              </p>
              
              {/* Display newly minted NFTs */}
              {newlyMintedTokens.length > 0 && (
                <div className="w-full mb-6">
                  <h4 className="text-sm font-medium text-sonic-text mb-3">Your New NFTs</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {newlyMintedTokens.slice(-mintAmount).map((tokenId) => (
                      <NFTPreview
                        key={tokenId}
                        tokenId={tokenId}
                        isRevealed={isRevealed}
                        revealDate={revealDate}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4 mt-2">
                <button 
                  onClick={() => setCurrentStep(MintStep.Preview)}
                  className="sonic-button flex items-center"
                >
                  Mint More
                </button>
                <Link href="/gallery" className="sonic-button-secondary flex items-center">
                  View Collection <ArrowRight size={16} className="ml-2" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Wallet connection modal */}
      <WalletConnectionModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
};

const Link = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
};

export default MintInterface; 