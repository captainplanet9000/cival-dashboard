"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Send,
  RefreshCw
} from 'lucide-react'

interface Chain {
  id: string;
  name: string;
  icon: string;
  symbol: string;
}

interface MetaMaskConnectorProps {
  onConnect?: (address: string, chainId: string, balance: string, symbol: string, provider: any) => void;
}

const supportedChains: Chain[] = [
  { id: '0x1', name: 'Ethereum', icon: '🔷', symbol: 'ETH' },
  { id: '0x89', name: 'Polygon', icon: '🟣', symbol: 'MATIC' },
  { id: '0xA', name: 'Optimism', icon: '🔴', symbol: 'ETH' },
  { id: '0xAA36A7', name: 'Sepolia', icon: '🔵', symbol: 'ETH' },
]

export default function MetaMaskConnector({ onConnect }: MetaMaskConnectorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [chainId, setChainId] = useState('')
  const [currentChain, setCurrentChain] = useState<Chain | null>(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [targetAddress, setTargetAddress] = useState('')
  const [transactionStatus, setTransactionStatus] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [provider, setProvider] = useState<any>(null)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum !== undefined
  }

  // Initialize connection on component mount
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      setProvider(new ethers.BrowserProvider(window.ethereum!))
      checkConnection()
    }
  }, [])

  // Update current chain information
  useEffect(() => {
    if (chainId) {
      const chain = supportedChains.find(c => c.id === chainId)
      setCurrentChain(chain || null)
    }
  }, [chainId])

  // Check if wallet is already connected
  const checkConnection = async () => {
    try {
      if (!window.ethereum) return;
      
      // Check if accounts are already accessible (user has previously connected)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setIsConnected(true)
        
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setChainId(chainId)
        
        await getWalletBalance(accounts[0])
        
        // Get chain symbol
        const chain = supportedChains.find(c => c.id === chainId)
        const symbol = chain ? chain.symbol : 'ETH'
        
        // Call onConnect callback if provided
        if (onConnect && provider) {
          onConnect(accounts[0], chainId, balance, symbol, provider)
        }
      }
      
      // Setup event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
      }
    } catch (error) {
      console.error("Error checking connection:", error)
    }
  }

  // Connect wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      alert("Please install MetaMask to use this feature")
      return
    }

    try {
      if (!window.ethereum) return;
      
      setTransactionStatus('connecting')
      
      // Request accounts access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Get the connected wallet address
      setWalletAddress(accounts[0])
      setIsConnected(true)
      
      // Get current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      setChainId(chainId)
      
      // Get balance
      await getWalletBalance(accounts[0])
      
      setTransactionStatus('')
      
      // Get chain symbol
      const chain = supportedChains.find(c => c.id === chainId)
      const symbol = chain ? chain.symbol : 'ETH'
      
      // Call onConnect callback if provided
      if (onConnect && provider) {
        onConnect(accounts[0], chainId, balance, symbol, provider)
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      setTransactionStatus('')
    }
  }

  // Update wallet balance
  const getWalletBalance = async (address: string) => {
    try {
      if (!window.ethereum) return;
      
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
      
      const balanceWei = ethers.toBigInt(balanceHex)
      const balanceEth = ethers.formatEther(balanceWei)
      setBalance(parseFloat(balanceEth).toFixed(4))
    } catch (error) {
      console.error("Error getting balance:", error)
    }
  }

  // Handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      setIsConnected(false)
      setWalletAddress('')
      setBalance('0')
    } else {
      // Account changed
      setWalletAddress(accounts[0])
      getWalletBalance(accounts[0])
      
      // Call onConnect callback with updated information
      if (onConnect && chainId) {
        const chain = supportedChains.find(c => c.id === chainId)
        const symbol = chain ? chain.symbol : 'ETH'
        onConnect(accounts[0], chainId, balance, symbol, provider)
      }
    }
  }

  // Handle chain changes
  const handleChainChanged = (newChainId: string) => {
    setChainId(newChainId)
    
    // Call onConnect callback with updated chain information
    if (isConnected && onConnect) {
      const chain = supportedChains.find(c => c.id === newChainId)
      const symbol = chain ? chain.symbol : 'ETH'
      onConnect(walletAddress, newChainId, balance, symbol, provider)
    }
    
    // Refresh the page to ensure everything is in sync
    window.location.reload()
  }

  // Copy address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Refresh wallet balance
  const refreshBalance = async () => {
    if (isConnected) {
      await getWalletBalance(walletAddress)
      
      // Call onConnect callback with updated balance
      if (onConnect && chainId) {
        const chain = supportedChains.find(c => c.id === chainId)
        const symbol = chain ? chain.symbol : 'ETH'
        onConnect(walletAddress, chainId, balance, symbol, provider)
      }
    }
  }

  // Send transaction to trading farm wallet
  const sendTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !targetAddress || !transferAmount) {
      return
    }

    try {
      setTransactionStatus('sending')
      
      const amountWei = ethers.parseEther(transferAmount)
      
      const signer = await provider.getSigner()
      
      const tx = await signer.sendTransaction({
        to: targetAddress,
        value: amountWei
      })
      
      setTransactionStatus('confirming')
      
      // Wait for transaction to be mined
      await tx.wait()
      
      setTransactionStatus('success')
      
      // Update balance
      await getWalletBalance(walletAddress)
      
      // Reset form
      setTransferAmount('')
      setTargetAddress('')
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowSendDialog(false)
        setTransactionStatus('')
      }, 2000)
      
    } catch (error) {
      console.error("Error sending transaction:", error)
      setTransactionStatus('error')
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setTransactionStatus('')
      }, 3000)
    }
  }

  // Render installation prompt if MetaMask is not installed
  if (!isMetaMaskInstalled()) {
    return (
      <div className="dashboard-card">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">MetaMask Required</h3>
          <p className="text-muted-foreground mb-4">
            Please install MetaMask to connect your wallet and interact with the Trading Farm.
          </p>
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary flex items-center"
          >
            Install MetaMask <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-card">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Wallet className="mr-2 h-5 w-5" />
        Wallet Connection
      </h2>
      
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground mb-4">
            Connect your MetaMask wallet to fund your trading farms and manage your assets.
          </p>
          <button 
            onClick={connectWallet}
            disabled={transactionStatus === 'connecting'}
            className="btn-primary flex items-center"
          >
            {transactionStatus === 'connecting' ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect MetaMask
              </>
            )}
          </button>
        </div>
      ) : (
        <div>
          {/* Connected Wallet Info */}
          <div className="bg-background p-4 rounded-md border border-border mb-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full mr-2">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Connected Wallet</p>
                  <p className="font-medium">
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={copyAddress}
                  className="p-2 rounded-md hover:bg-muted mr-1"
                  title="Copy address"
                >
                  {copySuccess ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={`https://etherscan.io/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-md hover:bg-muted"
                  title="View on Etherscan"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Network</p>
                <p className="font-medium flex items-center">
                  {currentChain ? (
                    <>
                      <span className="mr-1">{currentChain.icon}</span>
                      {currentChain.name}
                    </>
                  ) : (
                    'Unknown Network'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="font-medium flex items-center">
                  {balance} {currentChain?.symbol || 'ETH'}
                  <button
                    onClick={refreshBalance}
                    className="ml-1 p-1 rounded-full hover:bg-muted"
                    title="Refresh balance"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </p>
              </div>
            </div>
          </div>
          
          {/* Transfer Funds Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowSendDialog(true)}
              className="btn-primary w-full flex items-center justify-center"
            >
              <Send className="mr-2 h-4 w-4" />
              Send Funds to Farm Wallet
            </button>
          </div>
          
          {/* Transaction History Preview */}
          <div>
            <h3 className="text-md font-medium mb-2">Recent Transactions</h3>
            <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-md">
              No recent transactions
            </div>
          </div>
          
          {/* Send Dialog */}
          {showSendDialog && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-4">Send Funds to Farm Wallet</h3>
                
                {transactionStatus === 'success' ? (
                  <div className="flex flex-col items-center justify-center p-4">
                    <CheckCircle className="h-12 w-12 text-success mb-3" />
                    <p className="font-medium mb-1">Transaction Successful</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Funds have been sent to the farm wallet
                    </p>
                  </div>
                ) : (
                  <form onSubmit={sendTransaction}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Farm Wallet Address</label>
                      <input
                        type="text"
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        placeholder="0x..."
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Amount ({currentChain?.symbol || 'ETH'})</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0.0"
                        className="form-input"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Available: {balance} {currentChain?.symbol || 'ETH'}
                      </p>
                    </div>
                    
                    {transactionStatus === 'error' && (
                      <div className="mb-4 p-2 bg-danger/10 border border-danger/20 rounded-md flex items-center text-danger text-sm">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Transaction failed. Please try again.
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowSendDialog(false)}
                        className="btn-ghost"
                        disabled={['sending', 'confirming'].includes(transactionStatus)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary flex items-center"
                        disabled={['sending', 'confirming'].includes(transactionStatus)}
                      >
                        {transactionStatus === 'sending' && (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        )}
                        {transactionStatus === 'confirming' && (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Confirming...
                          </>
                        )}
                        {!['sending', 'confirming'].includes(transactionStatus) && 'Send Funds'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
