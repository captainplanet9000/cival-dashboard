import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Wallet, Loader2, RefreshCw, ChevronLeft, ExternalLink, Grid, Squares2X2 } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { useBatchNFTMetadata } from '@/hooks/useNFTMetadata';

// NFT Gallery Page
const GalleryPage: React.FC = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [userNfts, setUserNfts] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'id-asc' | 'id-desc'>('recent');
  
  // Fetch user NFTs
  const fetchUserNfts = async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/users/${address}/nfts`);
      
      if (response.ok) {
        const data = await response.json();
        setUserNfts(data.tokenIds || []);
      } else {
        console.error('Failed to fetch user NFTs');
        setUserNfts([]);
      }
    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      setUserNfts([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch NFTs on mount or when wallet changes
  useEffect(() => {
    if (isConnected && address) {
      fetchUserNfts();
    } else {
      setUserNfts([]);
    }
  }, [isConnected, address]);
  
  // Sort the NFTs
  const getSortedNfts = () => {
    switch (sortOrder) {
      case 'recent':
        return [...userNfts].reverse(); // Most recent first
      case 'oldest':
        return [...userNfts]; // Oldest first
      case 'id-asc':
        return [...userNfts].sort((a, b) => a - b); // Lowest ID first
      case 'id-desc':
        return [...userNfts].sort((a, b) => b - a); // Highest ID first
      default:
        return userNfts;
    }
  };
  
  // Fetch metadata for user's NFTs
  const { 
    metadataList, 
    isLoading: metadataLoading, 
    error: metadataError 
  } = useBatchNFTMetadata(userNfts);
  
  // Connect wallet
  const connectMetamask = async () => {
    try {
      await connect({ connector: new InjectedConnector() });
      setIsWalletModalOpen(false);
    } catch (error) {
      console.error("Metamask connection error:", error);
    }
  };
  
  const connectWalletConnect = async () => {
    try {
      await connect({ 
        connector: new WalletConnectConnector({
          options: {
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
          }
        }) 
      });
      setIsWalletModalOpen(false);
    } catch (error) {
      console.error("WalletConnect error:", error);
    }
  };
  
  // Render NFT grid
  const renderNftGrid = () => {
    const sortedNfts = getSortedNfts();
    
    if (sortedNfts.length === 0) {
      if (isLoading || metadataLoading) {
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={48} className="animate-spin text-sonic-primary mb-4" />
            <p className="text-sonic-muted">Loading your NFTs...</p>
          </div>
        );
      }
      
      if (!isConnected) {
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-sonic-card flex items-center justify-center mb-4">
              <Wallet size={24} className="text-sonic-primary" />
            </div>
            <h3 className="text-xl font-bold text-sonic-text mb-2">Connect Your Wallet</h3>
            <p className="text-sonic-muted text-center max-w-md mb-6">
              Connect your wallet to view your Sonic NFT collection. Your NFTs will appear here.
            </p>
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="sonic-button"
            >
              Connect Wallet
            </button>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-sonic-card flex items-center justify-center mb-4">
            <GridIcon size={24} className="text-sonic-primary" />
          </div>
          <h3 className="text-xl font-bold text-sonic-text mb-2">No NFTs Found</h3>
          <p className="text-sonic-muted text-center max-w-md mb-6">
            You don't own any Sonic NFTs yet. Head to the mint page to get started with your collection.
          </p>
          <Link href="/mint" className="sonic-button">
            Mint Your First NFT
          </Link>
        </div>
      );
    }
    
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-4'}>
        {sortedNfts.map((tokenId) => (
          <NFTCard 
            key={tokenId} 
            tokenId={tokenId} 
            metadata={metadataList[tokenId]} 
            isLoading={metadataLoading}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  };
  
  // Render wallet modal
  const renderWalletModal = () => {
    if (!isWalletModalOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="sonic-card w-full max-w-md p-6 relative">
          <button 
            onClick={() => setIsWalletModalOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-sonic-card/50"
          >
            <ChevronLeft size={20} className="text-sonic-muted" />
          </button>
          
          <h2 className="text-2xl font-bold text-sonic-text mb-6">Connect Wallet</h2>
          
          <div className="space-y-4">
            <button
              onClick={connectMetamask}
              className="w-full p-4 flex items-center border border-sonic-secondary/20 rounded-lg hover:bg-sonic-card-hover transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-orange-500">
                  <path d="M19.4 9.7h-2.9V6.9c0-2.4-2-4.4-4.5-4.4-2.4 0-4.4 1.9-4.5 4.3v2.9H4.6c-.3 0-.6.3-.6.6v11.3c0 .3.3.6.6.6h14.8c.3 0 .6-.3.6-.6V10.3c0-.3-.3-.6-.6-.6zm-8.9-2.8c0-1.7 1.4-3.2 3.2-3.2 1.7 0 3.2 1.4 3.2 3.2v2.8h-6.4V6.9zM19 21H5V10.9h14V21z" fill="currentColor"/>
                  <path d="M12 13.8c-.9 0-1.6.7-1.6 1.6 0 .6.3 1.1.8 1.4v1.8c0 .4.3.8.8.8.4 0 .8-.3.8-.8v-1.8c.5-.3.8-.8.8-1.4 0-.9-.7-1.6-1.6-1.6z" fill="currentColor"/>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sonic-text font-medium">MetaMask</h3>
                <p className="text-sonic-muted text-sm">Connect using browser wallet</p>
              </div>
            </button>
            
            <button
              onClick={connectWalletConnect}
              className="w-full p-4 flex items-center border border-sonic-secondary/20 rounded-lg hover:bg-sonic-card-hover transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sonic-text font-medium">WalletConnect</h3>
                <p className="text-sonic-muted text-sm">Connect using WalletConnect</p>
              </div>
            </button>
          </div>
          
          <p className="text-xs text-sonic-muted mt-6 text-center">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-sonic-background text-sonic-text min-h-screen">
      <header className="border-b border-sonic-secondary/10 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="text-xl font-bold text-sonic-primary">Sonic NFT</div>
          <nav className="flex items-center space-x-6">
            <Link href="/" className="text-sonic-text hover:text-sonic-primary">Home</Link>
            <Link href="/mint" className="text-sonic-text hover:text-sonic-primary">Mint</Link>
            <Link href="/gallery" className="text-sonic-primary">Gallery</Link>
            <button 
              className="sonic-button-secondary"
              onClick={() => {
                if (isConnected) {
                  disconnect();
                } else {
                  setIsWalletModalOpen(true);
                }
              }}
            >
              {isConnected ? `${address?.slice(0,6)}...${address?.slice(-4)}` : 'Connect Wallet'}
            </button>
          </nav>
        </div>
      </header>
      
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-sonic-text mb-2">My NFT Collection</h1>
              <p className="text-sonic-muted">
                {isConnected 
                  ? `Viewing ${userNfts.length} NFTs from your collection` 
                  : 'Connect your wallet to view your NFTs'}
              </p>
            </div>
            
            {isConnected && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                <div className="flex">
                  <select 
                    className="bg-sonic-card border border-sonic-secondary/20 text-sonic-text rounded-l-lg focus:ring-sonic-primary px-3 py-2 focus:outline-none"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="id-asc">ID Ascending</option>
                    <option value="id-desc">ID Descending</option>
                  </select>
                  
                  <button 
                    onClick={fetchUserNfts} 
                    className="p-2 border border-l-0 border-sonic-secondary/20 rounded-r-lg bg-sonic-card hover:bg-sonic-card-hover transition-colors"
                    title="Refresh NFTs"
                  >
                    <RefreshCw size={20} className={`text-sonic-text ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="flex rounded-lg border border-sonic-secondary/20 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-sonic-primary text-white' : 'bg-sonic-card hover:bg-sonic-card-hover text-sonic-text'}`}
                    title="Grid View"
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-sonic-primary text-white' : 'bg-sonic-card hover:bg-sonic-card-hover text-sonic-text'}`}
                    title="List View"
                  >
                    <Squares2X2 size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {renderNftGrid()}
        </div>
      </main>
      
      <footer className="border-t border-sonic-secondary/10 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold text-sonic-primary mb-2">Sonic NFT</div>
              <p className="text-sonic-muted text-sm">Generative art on the Sonic Network</p>
            </div>
            <div className="flex gap-6">
              <Link href="/" className="text-sonic-text hover:text-sonic-primary text-sm">Home</Link>
              <Link href="/mint" className="text-sonic-text hover:text-sonic-primary text-sm">Mint</Link>
              <Link href="/gallery" className="text-sonic-text hover:text-sonic-primary text-sm">Gallery</Link>
              <a href="#" className="text-sonic-text hover:text-sonic-primary text-sm">Terms</a>
              <a href="#" className="text-sonic-text hover:text-sonic-primary text-sm">Privacy</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-sonic-secondary/10 text-center text-sonic-muted text-sm">
            &copy; {new Date().getFullYear()} Sonic NFT Collection. All rights reserved.
          </div>
        </div>
      </footer>
      
      {renderWalletModal()}
    </div>
  );
};

// NFT Card Component
interface NFTCardProps {
  tokenId: number;
  metadata: any;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

const NFTCard: React.FC<NFTCardProps> = ({ tokenId, metadata, isLoading, viewMode }) => {
  const [imageError, setImageError] = useState(false);
  
  if (viewMode === 'grid') {
    return (
      <motion.div 
        className="sonic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="aspect-square relative overflow-hidden">
          {isLoading || !metadata ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sonic-card">
              <Loader2 size={32} className="animate-spin text-sonic-primary" />
            </div>
          ) : imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-sonic-card/50 p-4">
              <GridIcon size={32} className="text-sonic-primary mb-2" />
              <p className="text-sm text-sonic-muted text-center">Image not available</p>
            </div>
          ) : (
            <img 
              src={metadata.image || '/placeholder-nft.png'} 
              alt={metadata.name || `Sonic NFT #${tokenId}`}
              className="w-full h-full object-cover transition-transform hover:scale-110"
              onError={() => setImageError(true)}
            />
          )}
          <div className="absolute top-2 right-2">
            <div className="px-2 py-1 bg-sonic-background/80 backdrop-blur-sm rounded-full text-xs font-medium">
              #{tokenId}
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-bold text-sonic-text truncate">
            {metadata?.name || `Sonic NFT #${tokenId}`}
          </h3>
          
          {metadata?.attributes && (
            <div className="mt-2 flex flex-wrap gap-2">
              {metadata.attributes.slice(0, 3).map((attr: any, index: number) => (
                <div key={index} className="px-2 py-1 bg-sonic-card-hover rounded-full text-xs">
                  {attr.trait_type}: {attr.value}
                </div>
              ))}
              {metadata.attributes.length > 3 && (
                <div className="px-2 py-1 bg-sonic-card-hover rounded-full text-xs">
                  +{metadata.attributes.length - 3} more
                </div>
              )}
            </div>
          )}
          
          <a 
            href={`https://opensea.io/assets/ethereum/${process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS}/${tokenId}`}
            target="_blank"
            rel="noopener noreferrer" 
            className="mt-4 flex items-center text-sonic-primary hover:text-sonic-secondary text-sm font-medium"
          >
            View on OpenSea
            <ExternalLink size={14} className="ml-1" />
          </a>
        </div>
      </motion.div>
    );
  }
  
  // List view
  return (
    <motion.div 
      className="sonic-card p-4 flex items-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 mr-4">
        {isLoading || !metadata ? (
          <div className="w-full h-full flex items-center justify-center bg-sonic-card">
            <Loader2 size={16} className="animate-spin text-sonic-primary" />
          </div>
        ) : imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-sonic-card/50">
            <GridIcon size={16} className="text-sonic-primary" />
          </div>
        ) : (
          <img 
            src={metadata.image || '/placeholder-nft.png'} 
            alt={metadata.name || `Sonic NFT #${tokenId}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-sonic-text">
              {metadata?.name || `Sonic NFT #${tokenId}`}
            </h3>
            <p className="text-sonic-muted text-sm">ID: #{tokenId}</p>
          </div>
          
          <a 
            href={`https://opensea.io/assets/ethereum/${process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS}/${tokenId}`}
            target="_blank"
            rel="noopener noreferrer" 
            className="text-sonic-primary hover:text-sonic-secondary text-sm flex items-center"
          >
            OpenSea <ExternalLink size={12} className="ml-1" />
          </a>
        </div>
        
        {metadata?.attributes && (
          <div className="mt-2 flex flex-wrap gap-1">
            {metadata.attributes.slice(0, 4).map((attr: any, index: number) => (
              <div key={index} className="px-2 py-0.5 bg-sonic-card-hover rounded-full text-xs">
                {attr.trait_type}: {attr.value}
              </div>
            ))}
            {metadata.attributes.length > 4 && (
              <div className="px-2 py-0.5 bg-sonic-card-hover rounded-full text-xs">
                +{metadata.attributes.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Grid Icon Component
function GridIcon({ size = 24, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default GalleryPage; 