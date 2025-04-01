import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, ChevronRight, Wallet, RefreshCw } from 'lucide-react';
import { useAccount, useNetwork, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { sonicNetwork, sonicTestnet } from '@/lib/web3Config';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, address } = useAccount();
  const { chain } = useNetwork();
  const { disconnect } = useDisconnect();
  const [step, setStep] = useState(1);
  
  // Check if connected to Sonic Network
  const isOnSonicNetwork = chain?.id === sonicNetwork.id;
  const isOnSonicTestnet = chain?.id === sonicTestnet.id;
  const isOnSupportedNetwork = isOnSonicNetwork || isOnSonicTestnet;
  
  // Reset steps when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);
  
  // Auto-advance to next step when wallet is connected
  React.useEffect(() => {
    if (isConnected && step === 1) {
      setStep(2);
    }
  }, [isConnected, step]);
  
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Handle disconnect and start over
  const handleDisconnect = () => {
    disconnect();
    setStep(1);
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <motion.div
          className="bg-sonic-background border border-sonic-secondary/30 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-sonic-secondary/20">
            <h2 className="text-xl font-bold text-sonic-text">Connect Wallet</h2>
            <button 
              onClick={onClose}
              className="text-sonic-muted hover:text-sonic-text"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-sonic-primary' : 'bg-sonic-card'}`}>
                  <span className="text-white font-medium">1</span>
                </div>
                <span className={`ml-2 ${step >= 1 ? 'text-sonic-text' : 'text-sonic-muted'}`}>Connect Wallet</span>
              </div>
              <div className="flex-1 mx-4 h-px bg-sonic-secondary/20"></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-sonic-primary' : 'bg-sonic-card'}`}>
                  <span className="text-white font-medium">2</span>
                </div>
                <span className={`ml-2 ${step >= 2 ? 'text-sonic-text' : 'text-sonic-muted'}`}>Switch Network</span>
              </div>
            </div>
          </div>
          
          {/* Content based on step */}
          <div className="px-6 pb-6">
            {step === 1 && (
              <div>
                <p className="text-sonic-muted mb-6">
                  Connect your wallet to mint Sonic NFTs. We support MetaMask, WalletConnect, and more.
                </p>
                <div className="flex justify-center mb-4">
                  <ConnectButton label="Connect Wallet" />
                </div>
                <div className="text-center text-sm text-sonic-muted">
                  <p>By connecting, you agree to our Terms of Service.</p>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div>
                <p className="text-sonic-muted mb-4">
                  {isConnected && (
                    <span className="flex items-center justify-center text-center mb-2">
                      Connected as: <span className="text-sonic-text ml-1 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    </span>
                  )}
                </p>
                
                {isOnSupportedNetwork ? (
                  <div className="p-4 mb-6 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle size={20} className="text-green-500 mr-2" />
                      <div>
                        <p className="text-green-400 font-medium">Connected to {chain?.name}</p>
                        <p className="text-sm text-sonic-muted">
                          You're all set! Your wallet is connected to the correct network.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 mb-6 bg-amber-800/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle size={20} className="text-amber-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-amber-400 font-medium">Network Change Required</p>
                        <p className="text-sm text-sonic-muted mb-4">
                          {chain?.name ? (
                            <>You're connected to <span className="text-sonic-text">{chain.name}</span>. Please switch to Sonic Network.</>
                          ) : (
                            <>Please switch to Sonic Network to mint NFTs.</>
                          )}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              // Opening Metamask to switch network
                              // This is handled by the NetworkStatus component
                              onClose();
                            }}
                            className="sonic-button-secondary text-sm py-2 flex items-center justify-center"
                          >
                            <span>Switch to Mainnet</span>
                            <ChevronRight size={16} className="ml-1" />
                          </button>
                          <button
                            onClick={() => {
                              // Opening Metamask to switch to testnet
                              // This is handled by the NetworkStatus component
                              onClose();
                            }}
                            className="text-sm py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg flex items-center justify-center"
                          >
                            <span>Use Testnet</span>
                            <ChevronRight size={16} className="ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-center mt-4">
                  <button 
                    onClick={handleDisconnect}
                    className="text-sm text-sonic-muted hover:text-sonic-primary"
                  >
                    Disconnect wallet & start over
                  </button>
                </div>
                
                {isOnSupportedNetwork && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={onClose}
                      className="sonic-button flex items-center"
                    >
                      Start Minting
                      <ChevronRight size={16} className="ml-1" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Networks Info Panel */}
          {step === 2 && !isOnSupportedNetwork && (
            <div className="px-6 pb-6">
              <div className="mt-4 pt-4 border-t border-sonic-secondary/20">
                <h3 className="text-sm font-medium text-sonic-text mb-2">Add Network Manually</h3>
                <p className="text-xs text-sonic-muted mb-3">
                  If automatic switching doesn't work, add the network manually to your wallet:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-sonic-card/50 rounded-lg">
                    <h4 className="font-medium text-sonic-text mb-1">Mainnet</h4>
                    <p className="text-sonic-muted">Network Name: Sonic Network</p>
                    <p className="text-sonic-muted">RPC URL: https://rpc.sonic.network</p>
                    <p className="text-sonic-muted">Chain ID: 7700</p>
                    <p className="text-sonic-muted">Symbol: SONIC</p>
                  </div>
                  <div className="p-2 bg-sonic-card/50 rounded-lg">
                    <h4 className="font-medium text-sonic-text mb-1">Testnet</h4>
                    <p className="text-sonic-muted">Network Name: Sonic Testnet</p>
                    <p className="text-sonic-muted">RPC URL: https://testnet.rpc.sonic.network</p>
                    <p className="text-sonic-muted">Chain ID: 7701</p>
                    <p className="text-sonic-muted">Symbol: SONIC</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WalletConnectionModal; 