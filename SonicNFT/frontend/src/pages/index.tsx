import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useDisconnect } from 'wagmi';
import Layout from '@/components/Layout';
import { ArrowRight, ExternalLink, Code, PaintBrush, Sparkles, Palette, Download, Zap, Target } from 'lucide-react';
import { useCollectionStats } from '@/hooks/useCollectionStats';

// Example generator type images (in a production app, these would come from your API)
const GENERATOR_TYPES = [
  {
    id: 1,
    name: 'Harmonic Waves',
    description: 'Fluid, wavelike patterns with harmonic mathematical relationships',
    image: 'https://images.unsplash.com/photo-1604871000636-074fa5117945?w=800&h=800&q=80',
    color: 'from-blue-500 to-purple-500'
  },
  {
    id: 2,
    name: 'Particle Field',
    description: 'Dynamic particle systems with emergent behavior',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&h=800&q=80',
    color: 'from-green-500 to-teal-500'
  },
  {
    id: 3,
    name: 'Fractal Geometry',
    description: 'Self-similar recursive patterns with infinite detail',
    image: 'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?w=800&h=800&q=80',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 4,
    name: 'Neural Style',
    description: 'AI-generated artwork using neural style transfer',
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&h=800&q=80',
    color: 'from-pink-500 to-purple-500'
  },
  {
    id: 5,
    name: 'Sound Visualizer',
    description: 'Visual representation of sound frequencies and amplitudes',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&h=800&q=80',
    color: 'from-yellow-500 to-amber-500'
  }
];

// Simple MintingProgress component for demonstration
const MintingProgress = ({ showTitle = true }) => {
  const stats = useCollectionStats();
  
  return (
    <div className="sonic-card p-6">
      {showTitle && (
        <h2 className="text-xl font-bold text-sonic-text mb-4">Collection Progress</h2>
      )}
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-sonic-text font-medium">Mint Progress</span>
          <span className="text-sm text-sonic-muted">
            {stats.totalMinted} / {stats.totalSupply} NFTs
          </span>
        </div>
        <div className="relative h-4 bg-sonic-card rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-sonic-primary to-sonic-secondary"
            style={{ width: `${stats.mintedPercent}%` }}
          />
          <span 
            className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white drop-shadow-md"
            style={{ opacity: stats.mintedPercent > 5 ? 1 : 0 }}
          >
            {stats.mintedPercent}%
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-sonic-card/50 p-4 rounded-lg">
          <p className="text-xs text-sonic-muted">Minted</p>
          <p className="text-lg font-bold">{stats.totalMinted}</p>
        </div>
        <div className="bg-sonic-card/50 p-4 rounded-lg">
          <p className="text-xs text-sonic-muted">Holders</p>
          <p className="text-lg font-bold">{stats.holderCount}</p>
        </div>
        <div className="bg-sonic-card/50 p-4 rounded-lg">
          <p className="text-xs text-sonic-muted">Status</p>
          <p className="text-lg font-bold">
            {stats.isRevealed ? (
              <span className="text-green-500">Revealed</span>
            ) : (
              <span className="text-amber-500">Unrevealed</span>
            )}
          </p>
        </div>
        <div className="bg-sonic-card/50 p-4 rounded-lg">
          <p className="text-xs text-sonic-muted">Reveal In</p>
          <p className="text-lg font-bold">
            {stats.isRevealed ? (
              <span className="text-green-500">Done</span>
            ) : (
              <span>{stats.timeUntilReveal.days}d {stats.timeUntilReveal.hours}h</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: collectionStats, isLoading } = useCollectionStats();
  
  // State for the generator type showcase
  const [activeGeneratorIndex, setActiveGeneratorIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  
  // Auto-rotate generator type showcase
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setActiveGeneratorIndex((prev) => (prev + 1) % GENERATOR_TYPES.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRotate]);
  
  // Collection stats with fallback values
  const totalSupply = collectionStats?.totalSupply || 5000;
  const mintedCount = collectionStats?.mintedCount || 0;
  const percentMinted = (mintedCount / totalSupply) * 100;
  
  return (
    <div className="bg-sonic-background text-sonic-text min-h-screen">
      <header className="border-b border-sonic-secondary/10 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="text-xl font-bold text-sonic-primary">Sonic NFT</div>
          <nav className="flex items-center space-x-6">
            <Link href="/" className="text-sonic-primary">Home</Link>
            <Link href="/mint" className="text-sonic-text hover:text-sonic-primary">Mint</Link>
            <Link href="/gallery" className="text-sonic-text hover:text-sonic-primary">Gallery</Link>
            {isConnected ? (
              <button 
                className="sonic-button-secondary"
                onClick={() => disconnect()}
              >
                {`${address?.slice(0,6)}...${address?.slice(-4)}`}
              </button>
            ) : (
              <Link href="/mint" className="sonic-button-secondary">
                Connect Wallet
              </Link>
            )}
          </nav>
        </div>
      </header>
      
      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-sonic-primary/10 via-sonic-background to-sonic-secondary/10 z-10"></div>
            <div className="absolute inset-0 opacity-30">
              <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sonic-primary/20 via-transparent to-transparent"></div>
            </div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-12 md:mb-0">
                <motion.h1 
                  className="text-4xl md:text-6xl font-bold mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  Generative Art <br/> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sonic-primary to-sonic-secondary">
                    On the Blockchain
                  </span>
                </motion.h1>
                
                <motion.p 
                  className="text-sonic-muted text-lg mb-8 max-w-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Sonic NFT brings algorithmic generative art to the blockchain with five 
                  unique generator types. Each NFT is one-of-a-kind and procedurally 
                  generated on-chain.
                </motion.p>
                
                <motion.div
                  className="flex flex-col sm:flex-row gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Link href="/mint" className="sonic-button py-3 px-8 flex items-center">
                    Mint Now <ArrowRight size={16} className="ml-2" />
                  </Link>
                  <Link href="/gallery" className="sonic-button-secondary py-3 px-8">
                    View Gallery
                  </Link>
                </motion.div>
                
                {/* Minting progress */}
                <motion.div 
                  className="mt-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-sonic-muted">Minting Progress</span>
                    <span className="text-sonic-text">{isLoading ? '...' : `${mintedCount} / ${totalSupply}`}</span>
                  </div>
                  <div className="h-2 bg-sonic-card/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sonic-primary to-sonic-secondary"
                      style={{ width: `${isLoading ? 0 : percentMinted}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-sonic-muted mt-2">
                    {isLoading ? 'Loading...' : `${100 - Math.floor(percentMinted)}% remaining • Mint before they're gone`}
                  </p>
                </motion.div>
              </div>
              
              {/* Generator Type Showcase */}
              <div className="md:w-1/2 h-[480px] relative">
                <div 
                  className="absolute inset-0 z-0 bg-sonic-card rounded-2xl overflow-hidden border border-sonic-secondary/10"
                  onMouseEnter={() => setAutoRotate(false)}
                  onMouseLeave={() => setAutoRotate(true)}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeGeneratorIndex}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
                      <div className={`absolute inset-0 bg-gradient-to-tr ${GENERATOR_TYPES[activeGeneratorIndex].color} opacity-40 mix-blend-overlay`}></div>
                      
                      {/* Background Image */}
                      <img 
                        src={GENERATOR_TYPES[activeGeneratorIndex].image}
                        alt={GENERATOR_TYPES[activeGeneratorIndex].name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 flex flex-col justify-end p-6 z-20">
                        <h3 className="text-2xl font-bold mb-2">{GENERATOR_TYPES[activeGeneratorIndex].name}</h3>
                        <p className="text-sm text-white/80 mb-4">{GENERATOR_TYPES[activeGeneratorIndex].description}</p>
                        <div className="flex">
                          {GENERATOR_TYPES.map((_, idx) => (
                            <button 
                              key={idx}
                              className={`w-3 h-3 rounded-full mr-2 transition-colors ${idx === activeGeneratorIndex ? 'bg-white' : 'bg-white/30'}`}
                              onClick={() => {
                                setActiveGeneratorIndex(idx);
                                setAutoRotate(false);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-20 bg-sonic-card/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sonic-primary to-sonic-secondary">
                  Unique Features
                </span>
              </h2>
              <p className="text-sonic-muted max-w-2xl mx-auto">
                Each Sonic NFT is created using advanced generative algorithms, producing
                unique digital artwork stored permanently on the blockchain.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="sonic-card p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                  <Code className="text-sonic-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">On-Chain Generation</h3>
                <p className="text-sonic-muted">
                  Each NFT is generated using on-chain algorithms that produce unique, 
                  deterministic outputs based on the token ID.
                </p>
              </div>
              
              <div className="sonic-card p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                  <Palette className="text-sonic-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Five Generator Types</h3>
                <p className="text-sonic-muted">
                  From fractal geometry to neural style transfer, each generator type
                  creates distinctly different visual styles.
                </p>
              </div>
              
              <div className="sonic-card p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                  <Download className="text-sonic-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">High-Resolution</h3>
                <p className="text-sonic-muted">
                  Download your NFT artwork in high resolution for printing or
                  displaying on large screens.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-sonic-muted max-w-2xl mx-auto">
                Minting a Sonic NFT is simple and gives you full ownership of your
                unique generative artwork.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="relative">
                <div className="sonic-card p-6 flex flex-col items-center text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                    <span className="text-lg font-bold text-sonic-primary">1</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Connect Wallet</h3>
                  <p className="text-sonic-muted text-sm">
                    Connect your Ethereum wallet to get started.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-sonic-primary/50 to-transparent -translate-y-1/2 -translate-x-8 z-0"></div>
              </div>
              
              <div className="relative">
                <div className="sonic-card p-6 flex flex-col items-center text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                    <span className="text-lg font-bold text-sonic-primary">2</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Mint Your NFT</h3>
                  <p className="text-sonic-muted text-sm">
                    Choose how many NFTs to mint and confirm the transaction.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-sonic-primary/50 to-transparent -translate-y-1/2 -translate-x-8 z-0"></div>
              </div>
              
              <div className="relative">
                <div className="sonic-card p-6 flex flex-col items-center text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                    <span className="text-lg font-bold text-sonic-primary">3</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Reveal Your Art</h3>
                  <p className="text-sonic-muted text-sm">
                    On the reveal date, your unique generative artwork will be unveiled.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-sonic-primary/50 to-transparent -translate-y-1/2 -translate-x-8 z-0"></div>
              </div>
              
              <div className="relative">
                <div className="sonic-card p-6 flex flex-col items-center text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-sonic-primary/20 flex items-center justify-center mb-4">
                    <span className="text-lg font-bold text-sonic-primary">4</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Own & Trade</h3>
                  <p className="text-sonic-muted text-sm">
                    Display your NFT in your gallery or trade it on marketplaces.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <Link href="/mint" className="sonic-button py-3 px-8 inline-flex items-center">
                Start Minting <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-sonic-primary/10 to-sonic-secondary/10">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-4">
                Join the Sonic NFT Collection
              </h2>
              <p className="text-sonic-muted max-w-2xl mx-auto mb-8">
                Don't miss your chance to own a piece of algorithmic art history.
                Minting is live now with {isLoading ? '...' : totalSupply - mintedCount} NFTs remaining.
              </p>
              <Link href="/mint" className="sonic-button py-3 px-8 inline-flex items-center">
                Mint Your NFT <Sparkles size={16} className="ml-2" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-sonic-secondary/10 py-8">
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
    </div>
  );
} 