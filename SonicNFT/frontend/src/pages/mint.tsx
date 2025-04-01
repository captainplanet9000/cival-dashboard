import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, MinusCircle, Wallet, Loader2, ArrowRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { useAccount, useConnect, useDisconnect, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { useCollectionStats } from '@/hooks/useCollectionStats';
import { useNFTMetadata } from '@/hooks/useNFTMetadata';

// Smart contract ABIs updated to match our contract
const SONIC_NFT_ABI = [
  "function mint(uint256 _quantity) external payable",
  "function totalSupply() external view returns (uint256)",
  "function maxSupply() external view returns (uint256)",
  "function maxPerWallet() external view returns (uint256)",
  "function mintedByAddress(address _address) external view returns (uint256)",
  "function mintPrice() external view returns (uint256)",
];

// SONIC token ABI - standard ERC20 functions
const SONIC_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

const SONIC_NFT_ADDRESS = process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS || "0x0000000000000000000000000000000000000000";
const SONIC_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_SONIC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000001";
const SONIC_TOKEN_PRICE = 500; // Price in SONIC tokens

const MintPage = () => {
  // Wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  
  // Collection stats from backend
  const { data: collectionStats, isLoading: statsLoading } = useCollectionStats();
  
  // State for minting process
  const [mintingStep, setMintingStep] = useState<'preview' | 'approving' | 'minting' | 'success' | 'error'>('preview');
  const [quantity, setQuantity] = useState(1);
  const [mintPrice, setMintPrice] = useState(ethers.constants.Zero);
  const [gasEstimate, setGasEstimate] = useState(0.001); // Fallback estimate
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenAllowance, setTokenAllowance] = useState<ethers.BigNumber>(ethers.constants.Zero);
  
  // NFT contract configuration - updated for Sonic integration
  const { config: mintConfig, error: prepareError } = usePrepareContractWrite({
    address: SONIC_NFT_ADDRESS as `0x${string}`,
    abi: SONIC_NFT_ABI,
    functionName: 'mint',
    args: [quantity],
    enabled: isConnected && 
             quantity > 0 && 
             tokenAllowance.gte(ethers.utils.parseUnits((SONIC_TOKEN_PRICE * quantity).toString(), 18)),
    onError: (error) => {
      console.error("Contract preparation error:", error);
    }
  });
  
  // Sonic token approve configuration - ensure proper amount is approved
  const { config: approveConfig, error: approveError } = usePrepareContractWrite({
    address: SONIC_TOKEN_ADDRESS as `0x${string}`,
    abi: SONIC_TOKEN_ABI,
    functionName: 'approve',
    args: [SONIC_NFT_ADDRESS, ethers.utils.parseUnits((SONIC_TOKEN_PRICE * quantity).toString(), 18)],
    enabled: isConnected && 
             quantity > 0,
    onError: (error) => {
      console.error("Token approval preparation error:", error);
    }
  });
  
  // Token approval write hook
  const {
    write: approveToken,
    data: approveData,
    isLoading: isApproveLoading,
    isError: isApproveError,
    error: approveError
  } = useContractWrite(approveConfig);
  
  // Wait for approve transaction
  const {
    isLoading: isApproveConfirming,
    isSuccess: approveSuccess,
    isError: isApproveConfirmError,
    error: approveConfirmError
  } = useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: () => {
      // After approval, proceed to mint
      if (mintNft) {
        setMintingStep('minting');
        mintNft();
      }
    },
    onError: (error) => {
      setMintingStep('error');
      
      // Track approval failure
      if (address) {
        import('@/utils/analytics').then(({ trackEvent }) => {
          trackEvent('token_approval_failure', {
            quantity,
            wallet_address: address,
            error_message: error.message || 'Approval failed'
          });
        });
        
        // Log error to monitoring
        import('@/utils/errorMonitoring').then(({ trackError }) => {
          trackError(error, {
            action: 'token_approval',
            quantity,
            address,
            transactionHash: approveData?.hash
          });
        });
      }
    }
  });
  
  // Contract write hook
  const { 
    write: mintNft, 
    data: mintData, 
    isLoading: isWriteLoading, 
    isError: isWriteError,
    error: writeError
  } = useContractWrite(mintConfig);
  
  // Wait for mint transaction
  const { 
    isLoading: isConfirming, 
    isSuccess: mintSuccess, 
    isError: isTxError, 
    error: txError 
  } = useWaitForTransaction({
    hash: mintData?.hash,
    onSuccess: () => {
      setMintingStep('success');
      
      // Track successful mint
      if (address && mintData?.hash) {
        import('@/utils/analytics').then(({ trackMintSuccess }) => {
          trackMintSuccess(
            quantity, 
            address, 
            mintData.hash, 
            (SONIC_TOKEN_PRICE * quantity).toString()
          );
        });
      }
    },
    onError: (error) => {
      setMintingStep('error');
      
      // Track mint failure
      if (address) {
        import('@/utils/analytics').then(({ trackMintFailure }) => {
          trackMintFailure(
            quantity, 
            address, 
            error.message || 'Transaction failed'
          );
        });
        
        // Log error to monitoring
        import('@/utils/errorMonitoring').then(({ trackError }) => {
          trackError(error, {
            action: 'mint_transaction',
            quantity,
            address,
            transactionHash: mintData?.hash
          });
        });
      }
    }
  });
  
  // Combined loading state
  const isApproving = isApproveLoading || isApproveConfirming;
  const isMinting = isWriteLoading || isConfirming;
  
  // Get token balance and allowance on connection - added additional error handling
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!isConnected || !address) return;
      
      try {
        // Check if window.ethereum is available
        if (!window.ethereum) {
          console.error("No ethereum provider detected. Please install MetaMask or use a Web3 browser.");
          return;
        }
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Get SONIC token contract
        const tokenContract = new ethers.Contract(SONIC_TOKEN_ADDRESS, SONIC_TOKEN_ABI, provider);
        
        // Get balance and allowance
        const balance = await tokenContract.balanceOf(address);
        const allowance = await tokenContract.allowance(address, SONIC_NFT_ADDRESS);
        
        // Get token symbol and decimals for display
        const tokenSymbol = await tokenContract.symbol();
        const tokenDecimals = await tokenContract.decimals();
        
        setTokenBalance(Number(ethers.utils.formatUnits(balance, tokenDecimals)));
        setTokenAllowance(allowance);
        
        console.log(`SONIC Balance: ${ethers.utils.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
        console.log(`SONIC Allowance: ${ethers.utils.formatUnits(allowance, tokenDecimals)} ${tokenSymbol}`);
        
        // Estimate gas
        const gasPrice = await provider.getGasPrice();
        const estimatedGas = 250000; // Higher estimate for token transfers + minting
        setGasEstimate(Number(ethers.utils.formatEther(gasPrice.mul(estimatedGas))) * 1.2); // Add 20% buffer
      } catch (error) {
        console.error("Error fetching token info:", error);
        
        // Track error
        import('@/utils/errorMonitoring').then(({ trackError }) => {
          trackError(error instanceof Error ? error : new Error(String(error)), {
            action: 'fetch_token_info',
            address,
            sonicTokenAddress: SONIC_TOKEN_ADDRESS
          });
        });
      }
    };
    
    fetchTokenInfo();
    
    // Set up interval to refresh token info every 30 seconds
    const intervalId = setInterval(fetchTokenInfo, 30000);
    
    return () => clearInterval(intervalId);
  }, [isConnected, address]);
  
  // Collection stats 
  const totalSupply = collectionStats?.totalSupply || 5000;
  const mintedCount = collectionStats?.mintedCount || 0;
  const maxPerWallet = collectionStats?.maxPerWallet || 5;
  const mintedByUser = collectionStats?.mintedByUser || 0;
  const maxCanMint = maxPerWallet - mintedByUser;
  const percentMinted = (mintedCount / totalSupply) * 100;
  
  // Calculate total price
  const pricePerNft = SONIC_TOKEN_PRICE; // Price in SONIC tokens
  const totalPrice = pricePerNft * quantity;
  const totalGas = gasEstimate * quantity;
  
  // Handle quantity change
  const incrementQuantity = () => {
    if (quantity < maxCanMint) {
      setQuantity(quantity + 1);
    }
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  // Handle minting - improved error handling
  const startMint = () => {
    if (!isConnected) {
      setIsWalletModalOpen(true);
      return;
    }
    
    // Check if user has enough SONIC tokens
    if (tokenBalance < totalPrice) {
      alert(`Insufficient SONIC tokens. You need at least ${totalPrice} SONIC tokens to mint. Your balance: ${tokenBalance.toFixed(2)} SONIC`);
      return;
    }
    
    // Track mint attempt
    if (address) {
      import('@/utils/analytics').then(({ trackMintAttempt }) => {
        trackMintAttempt(quantity, address);
      });
    }
    
    // Check if we need approval first
    const requiredAllowance = ethers.utils.parseUnits(totalPrice.toString(), 18);
    if (tokenAllowance.lt(requiredAllowance)) {
      setMintingStep('approving');
      if (approveToken) {
        approveToken();
      } else {
        setMintingStep('error');
        console.error("Approval config error:", approveError || "Unknown error");
      }
    } else {
      setMintingStep('minting');
      if (mintNft) {
        mintNft();
      } else {
        setMintingStep('error');
        console.error("Mint config error:", prepareError || "Unknown error");
      }
    }
  };
  
  // Reset minting process
  const resetMint = () => {
    setMintingStep('preview');
  };
  
  // Get error message
  const getMintError = () => {
    if (isApproveError && approveError) {
      return `Token approval error: ${approveError.message}`;
    }
    if (isApproveConfirmError && approveConfirmError) {
      return `Token approval transaction failed: ${approveConfirmError.message}`;
    }
    if (isWriteError && writeError) {
      return `Mint error: ${writeError.message}`;
    }
    if (isTxError && txError) {
      return `Mint transaction failed: ${txError.message}`;
    }
    return "There was an error processing your transaction. Please try again.";
  };
  
  // Handle wallet connections
  const connectMetamask = async () => {
    try {
      await connect({ connector: new InjectedConnector() });
      setIsWalletModalOpen(false);
      
      // After connection, check the network and switch to Sonic if needed
      if (window.ethereum && window.switchToSonicNetwork) {
        window.switchToSonicNetwork().then(success => {
          if (success) {
            // Successfully switched to Sonic network
            console.log("Connected to Sonic network");
          }
        });
      }
      
      // Track wallet connection
      import('@/utils/analytics').then(({ trackWalletConnect }) => {
        if (address) {
          trackWalletConnect('MetaMask', address);
        }
      });
      
      // Set user for error tracking
      import('@/utils/errorMonitoring').then(({ setErrorUser }) => {
        if (address) {
          setErrorUser(address);
        }
      });
    } catch (error) {
      console.error("Metamask connection error:", error);
      
      // Track error
      import('@/utils/errorMonitoring').then(({ trackError }) => {
        trackError(error instanceof Error ? error : new Error(String(error)), {
          walletType: 'MetaMask',
          action: 'connect'
        });
      });
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
      
      // Track wallet connection
      import('@/utils/analytics').then(({ trackWalletConnect }) => {
        if (address) {
          trackWalletConnect('WalletConnect', address);
        }
      });
      
      // Set user for error tracking
      import('@/utils/errorMonitoring').then(({ setErrorUser }) => {
        if (address) {
          setErrorUser(address);
        }
      });
    } catch (error) {
      console.error("WalletConnect error:", error);
      
      // Track error
      import('@/utils/errorMonitoring').then(({ trackError }) => {
        trackError(error instanceof Error ? error : new Error(String(error)), {
          walletType: 'WalletConnect',
          action: 'connect'
        });
      });
    }
  };
  
  // Handler to add/switch to Sonic network
  const handleSwitchToSonicNetwork = async () => {
    if (window.switchToSonicNetwork) {
      try {
        const success = await window.switchToSonicNetwork();
        if (success) {
          // Get updated allowance and balance after switching
          const fetchTokenInfo = async () => {
            if (!isConnected || !address) return;
            
            try {
              const provider = new ethers.providers.Web3Provider(window.ethereum);
              const tokenContract = new ethers.Contract(SONIC_TOKEN_ADDRESS, SONIC_TOKEN_ABI, provider);
              
              const balance = await tokenContract.balanceOf(address);
              const allowance = await tokenContract.allowance(address, SONIC_NFT_ADDRESS);
              const tokenDecimals = await tokenContract.decimals();
              
              setTokenBalance(Number(ethers.utils.formatUnits(balance, tokenDecimals)));
              setTokenAllowance(allowance);
            } catch (error) {
              console.error("Error fetching token info after switching network:", error);
            }
          };
          
          fetchTokenInfo();
        }
      } catch (error) {
        console.error("Error switching to Sonic network:", error);
      }
    } else {
      alert("Network switching functionality is not available. Please manually add the Sonic network to your wallet.");
    }
  };
  
  // Render minting steps
  const renderMintingStep = () => {
    switch (mintingStep) {
      case 'preview':
        return (
          <div className="sonic-card p-6">
            <h2 className="text-2xl font-bold text-sonic-text mb-6">Mint Your Sonic NFT</h2>
            
            {/* Mint quantity selector */}
            <div className="mb-6">
              <label className="text-sm text-sonic-muted mb-2 block">Quantity</label>
              <div className="flex items-center">
                <button 
                  onClick={decrementQuantity} 
                  disabled={quantity <= 1}
                  className="p-2 border border-sonic-secondary/20 rounded-l-lg bg-sonic-card hover:bg-sonic-card-hover transition-colors disabled:opacity-50"
                >
                  <MinusCircle size={20} className="text-sonic-text" />
                </button>
                <div className="px-8 py-2 border-t border-b border-sonic-secondary/20 bg-sonic-card text-center text-lg font-medium text-sonic-text">
                  {quantity}
                </div>
                <button 
                  onClick={incrementQuantity} 
                  disabled={quantity >= maxCanMint || maxCanMint <= 0}
                  className="p-2 border border-sonic-secondary/20 rounded-r-lg bg-sonic-card hover:bg-sonic-card-hover transition-colors disabled:opacity-50"
                >
                  <PlusCircle size={20} className="text-sonic-text" />
                </button>
              </div>
              <p className="text-xs text-sonic-muted mt-2">
                Maximum {maxPerWallet} per wallet • {maxCanMint} remaining for you
              </p>
            </div>
            
            {/* Price summary */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-sonic-muted">Price per NFT</span>
                <span className="text-sonic-text font-medium">
                  {pricePerNft > 0 ? `${pricePerNft} SONIC` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sonic-muted">Quantity</span>
                <span className="text-sonic-text font-medium">{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sonic-muted">Total price</span>
                <span className="text-sonic-text font-medium">
                  {totalPrice > 0 ? `${totalPrice} SONIC` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between border-t border-sonic-secondary/10 pt-2">
                <span className="text-sonic-muted">Estimated gas fee</span>
                <span className="text-sonic-text font-medium">{totalGas.toFixed(5)} SONIC</span>
              </div>
            </div>
            
            {/* Mint button */}
            <button
              onClick={startMint}
              className="sonic-button w-full py-3 flex items-center justify-center"
              disabled={isMinting || mintedByUser >= maxPerWallet || maxCanMint <= 0}
            >
              {isMinting ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Minting...
                </>
              ) : isConnected ? (
                maxCanMint <= 0 ? 'Max NFTs Minted' : 'Mint Now'
              ) : (
                <>
                  <Wallet size={18} className="mr-2" />
                  Connect Wallet to Mint
                </>
              )}
            </button>
            
            {/* Collection status */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-sonic-muted">Minting Progress</span>
                <span className="text-sonic-text">{mintedCount} / {totalSupply}</span>
              </div>
              <div className="h-2 bg-sonic-card/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sonic-primary to-sonic-secondary"
                  style={{ width: `${percentMinted}%` }}
                ></div>
              </div>
              <p className="text-xs text-sonic-muted mt-2 text-center">
                Mint your unique generative artwork before they're gone!
              </p>
            </div>
          </div>
        );
        
      case 'approving':
        return (
          <div className="sonic-card p-6">
            <h2 className="text-2xl font-bold text-sonic-text mb-6">Approving SONIC Tokens</h2>
            
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-sonic-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sonic-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="text-sonic-primary animate-spin" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-sonic-text mb-2">
                Approving {quantity * SONIC_TOKEN_PRICE} SONIC
              </h3>
              <p className="text-sonic-muted text-center max-w-xs">
                Approving the NFT contract to use your SONIC tokens.
                This is step 1 of 2 and requires confirmation in your wallet.
              </p>
              
              <div className="mt-8 w-full">
                <div className="w-full h-2 bg-sonic-card/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-sonic-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "40%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  ></motion.div>
                </div>
                <p className="text-xs text-sonic-muted text-center mt-2">
                  Waiting for approval confirmation...
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'minting':
        return (
          <div className="sonic-card p-6">
            <h2 className="text-2xl font-bold text-sonic-text mb-6">Minting in Progress</h2>
            
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-sonic-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sonic-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="text-sonic-primary animate-spin" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-sonic-text mb-2">
                Minting {quantity} NFT{quantity !== 1 ? 's' : ''}
              </h3>
              <p className="text-sonic-muted text-center max-w-xs">
                Your transaction is being processed. This might take a moment.
                Please don't close this window.
              </p>
              
              <div className="mt-8 w-full">
                <div className="w-full h-2 bg-sonic-card/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-sonic-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "90%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                  ></motion.div>
                </div>
                <p className="text-xs text-sonic-muted text-center mt-2">
                  Waiting for blockchain confirmation...
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'success':
        return (
          <div className="sonic-card p-6">
            <h2 className="text-2xl font-bold text-sonic-text mb-6">Mint Successful!</h2>
            
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle size={40} className="text-green-500" />
              </motion.div>
              
              <h3 className="text-xl font-bold text-sonic-text mb-2">
                You minted {quantity} NFT{quantity !== 1 ? 's' : ''}!
              </h3>
              <p className="text-sonic-muted text-center max-w-xs mb-4">
                Congratulations! Your NFTs have been minted successfully and will appear in your wallet shortly.
              </p>
              
              {mintData?.hash && (
                <div className="w-full p-3 bg-sonic-card/50 rounded-lg mb-6">
                  <p className="text-sm text-sonic-muted mb-1">Transaction Hash:</p>
                  <p className="text-sm font-mono text-sonic-text break-all">
                    {mintData.hash}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Link href="/gallery" className="sonic-button-secondary flex-1 flex items-center justify-center">
                  View My NFTs
                </Link>
                <button
                  onClick={resetMint}
                  className="sonic-button flex-1 flex items-center justify-center"
                >
                  Mint More
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'error':
        return (
          <div className="sonic-card p-6">
            <h2 className="text-2xl font-bold text-sonic-text mb-6">Minting Failed</h2>
            
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6"
              >
                <AlertCircle size={40} className="text-red-500" />
              </motion.div>
              
              <h3 className="text-xl font-bold text-sonic-text mb-2">
                Something went wrong
              </h3>
              <p className="text-sonic-muted text-center max-w-xs mb-6">
                {getMintError()}
              </p>
              
              <button
                onClick={resetMint}
                className="sonic-button w-full flex items-center justify-center"
              >
                Try Again
              </button>
            </div>
          </div>
        );
    }
  };
  
  // Wallet connection modal
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
            <Link href="/mint" className="text-sonic-primary">Mint</Link>
            <Link href="/gallery" className="text-sonic-text hover:text-sonic-primary">Gallery</Link>
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
          <Link href="/" className="inline-flex items-center text-sonic-muted hover:text-sonic-text mb-6">
            <ChevronLeft size={16} className="mr-1" />
            Back to home
          </Link>
          
          {/* Add network switch button if needed */}
          {isConnected && (
            <div className="mb-6">
              <button
                onClick={handleSwitchToSonicNetwork}
                className="flex items-center px-4 py-2 bg-sonic-primary/10 text-sonic-primary rounded-lg border border-sonic-primary/20 hover:bg-sonic-primary/20 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M12 2L20 7L12 12L4 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 12L12 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 17L12 22L4 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Switch to Sonic Network
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Left Column: NFT Preview */}
            <div>
              <div className="sonic-card p-6">
                <h2 className="text-xl font-bold text-sonic-text mb-4">NFT Preview</h2>
                <div className="aspect-square relative rounded-lg overflow-hidden border-4 border-sonic-card shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-sonic-primary/10 to-sonic-secondary/10"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <div className="w-24 h-24 mb-4 rounded-full bg-sonic-card flex items-center justify-center">
                      <Sparkles size={36} className="text-sonic-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-sonic-text mb-1">
                      Sonic NFT
                    </h3>
                    <p className="text-sonic-muted text-center max-w-xs">
                      {mintingStep === 'success' 
                        ? 'Your NFT will be revealed on the reveal date.' 
                        : 'Mint now to get your unique generative artwork.'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sonic-muted text-sm">Collection</span>
                    <span className="text-sonic-text text-sm">Sonic NFT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sonic-muted text-sm">Generator Types</span>
                    <span className="text-sonic-text text-sm">5 Unique Styles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sonic-muted text-sm">Reveal Date</span>
                    <span className="text-sonic-text text-sm">Coming Soon</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 sonic-card p-6">
                <h3 className="text-xl font-bold text-sonic-text mb-4">How It Works</h3>
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sonic-primary/20 flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-sonic-primary">1</span>
                    </div>
                    <div>
                      <h4 className="text-sonic-text font-medium">Connect Wallet</h4>
                      <p className="text-sonic-muted text-sm">Connect your wallet to the Sonic Network</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sonic-primary/20 flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-sonic-primary">2</span>
                    </div>
                    <div>
                      <h4 className="text-sonic-text font-medium">Free Mint</h4>
                      <p className="text-sonic-muted text-sm">Mint your NFTs for free (just pay gas)</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sonic-primary/20 flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-sonic-primary">3</span>
                    </div>
                    <div>
                      <h4 className="text-sonic-text font-medium">Wait for Reveal</h4>
                      <p className="text-sonic-muted text-sm">NFTs will be revealed on the reveal date</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column: Minting Interface */}
            <div>
              {renderMintingStep()}
            </div>
          </div>
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

function Sparkles({ size = 24, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 17L20 19L22 20L20 21L19 23L18 21L16 20L18 19L19 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 17L6 19L8 20L6 21L5 23L4 21L2 20L4 19L5 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default MintPage; 