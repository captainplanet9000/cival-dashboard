"use client"

// Update the import pattern for React
import * as React from 'react'
import { ethers } from 'ethers'
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Send,
  RefreshCw,
  ArrowDownUp,
  Clock,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

interface Chain {
  id: string;
  name: string;
  icon: string;
  symbol: string;
  rpcUrl?: string;
  blockExplorerUrl?: string;
}

interface Transaction {
  hash: string;
  to: string;
  from: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

const supportedChains: Chain[] = [
  { 
    id: '0x1', 
    name: 'Ethereum', 
    icon: '🔷', 
    symbol: 'ETH',
    blockExplorerUrl: 'https://etherscan.io'
  },
  { 
    id: '0x89', 
    name: 'Polygon', 
    icon: '🟣', 
    symbol: 'MATIC',
    blockExplorerUrl: 'https://polygonscan.com'
  },
  { 
    id: '0xA', 
    name: 'Optimism', 
    icon: '🔴', 
    symbol: 'ETH',
    blockExplorerUrl: 'https://optimistic.etherscan.io'
  },
  { 
    id: '0xAA36A7', 
    name: 'Sepolia', 
    icon: '🔵', 
    symbol: 'ETH',
    blockExplorerUrl: 'https://sepolia.etherscan.io'
  },
]

export default function MetaMaskConnector() {
  const [isConnected, setIsConnected] = React.useState(false)
  const [walletAddress, setWalletAddress] = React.useState('')
  const [balance, setBalance] = React.useState('0')
  const [chainId, setChainId] = React.useState('')
  const [currentChain, setCurrentChain] = React.useState<Chain | null>(null)
  const [transferAmount, setTransferAmount] = React.useState('')
  const [showSendDialog, setShowSendDialog] = React.useState(false)
  const [targetAddress, setTargetAddress] = React.useState('')
  const [transactionStatus, setTransactionStatus] = React.useState('')
  const [copySuccess, setCopySuccess] = React.useState(false)
  const [provider, setProvider] = React.useState<any>(null)
  const [showNetworkSelector, setShowNetworkSelector] = React.useState(false)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [error, setError] = React.useState<string | null>(null)
  
  // Event cleanup reference
  const eventCleanupRef = React.useRef<Function | null>(null)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum !== undefined
  }

  // Initialize connection on component mount
  React.useEffect(() => {
    if (isMetaMaskInstalled()) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum!)
      setProvider(ethProvider)
      checkConnection()
    }
    
    // Cleanup function
    return () => {
      if (eventCleanupRef.current) {
        eventCleanupRef.current()
      }
    }
  }, [])

  // Update current chain information
  React.useEffect(() => {
    if (chainId) {
      const chain = supportedChains.find(c => c.id === chainId)
      setCurrentChain(chain || null)
      
      // Fetch transaction history when chain changes
      if (isConnected) {
        fetchTransactionHistory()
      }
    }
  }, [chainId, isConnected])

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
      }
      
      // Setup event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      
      eventCleanupRef.current = () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
      }
    } catch (error) {
      console.error("Error checking connection:", error)
      setError("Failed to check wallet connection")
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
      setError(null)
      
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
      
      // Fetch transaction history
      fetchTransactionHistory()
      
      setTransactionStatus('')
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      setTransactionStatus('')
      setError(error?.message || "Failed to connect wallet")
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
      setError("Failed to get wallet balance")
    }
  }

  // Handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      setIsConnected(false)
      setWalletAddress('')
      setBalance('0')
      setTransactions([])
    } else {
      // Account changed
      setWalletAddress(accounts[0])
      getWalletBalance(accounts[0])
      fetchTransactionHistory()
    }
  }

  // Handle chain changes
  const handleChainChanged = (newChainId: string) => {
    setChainId(newChainId)
    
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
      setError(null)
      await getWalletBalance(walletAddress)
    }
  }

  // Switch network
  const switchNetwork = async (chainId: string) => {
    if (!window.ethereum) return;
    
    try {
      setError(null)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      })
      
      setShowNetworkSelector(false)
    } catch (error: any) {
      console.error("Error switching network:", error)
      
      // Chain not added to MetaMask
      if (error.code === 4902) {
        const chain = supportedChains.find(c => c.id === chainId)
        if (chain && chain.rpcUrl) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId,
                  chainName: chain.name,
                  nativeCurrency: {
                    name: chain.symbol,
                    symbol: chain.symbol,
                    decimals: 18,
                  },
                  rpcUrls: [chain.rpcUrl],
                  blockExplorerUrls: chain.blockExplorerUrl ? [chain.blockExplorerUrl] : undefined,
                },
              ],
            })
            setShowNetworkSelector(false)
          } catch (addError) {
            console.error("Error adding network:", addError)
            setError("Failed to add network to MetaMask")
          }
        }
      } else {
        setError("Failed to switch network")
      }
    }
  }

  // Fetch transaction history
  const fetchTransactionHistory = React.useCallback(async () => {
    if (!isConnected || !walletAddress || !currentChain?.blockExplorerUrl) return;
    
    try {
      // In a real app, you would fetch from Etherscan API or similar
      // Here we'll just show mock data for demonstration
      setTransactions([
        {
          hash: '0x' + Math.random().toString(16).substring(2, 16) + Math.random().toString(16).substring(2, 16),
          to: '0x' + Math.random().toString(16).substring(2, 42),
          from: walletAddress,
          value: (Math.random() * 0.1).toFixed(4),
          timestamp: Date.now() - Math.floor(Math.random() * 86400000),
          status: 'confirmed'
        },
        {
          hash: '0x' + Math.random().toString(16).substring(2, 16) + Math.random().toString(16).substring(2, 16),
          to: walletAddress,
          from: '0x' + Math.random().toString(16).substring(2, 42),
          value: (Math.random() * 0.1).toFixed(4),
          timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 2),
          status: 'confirmed'
        }
      ])
    } catch (error) {
      console.error("Error fetching transaction history:", error)
    }
  }, [isConnected, walletAddress, currentChain])

  // Send transaction to trading farm wallet
  const sendTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !targetAddress || !transferAmount) {
      return
    }

    try {
      setTransactionStatus('sending')
      setError(null)
      
      const amountWei = ethers.parseEther(transferAmount)
      
      const signer = await provider.getSigner()
      
      const tx = await signer.sendTransaction({
        to: targetAddress,
        value: amountWei
      })
      
      setTransactionStatus('confirming')
      
      // Add pending transaction to list
      setTransactions((prev: Transaction[]) => [{
        hash: tx.hash,
        to: targetAddress,
        from: walletAddress,
        value: transferAmount,
        timestamp: Date.now(),
        status: 'pending' as const
      }, ...prev] as Transaction[])
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      // Update transaction status
      setTransactions((prev: Transaction[]) => prev.map((t: Transaction) => 
        t.hash === tx.hash ? {...t, status: receipt.status === 0 ? 'failed' as const : 'confirmed' as const} : t
      ))
      
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
      
    } catch (error: any) {
      console.error("Error sending transaction:", error)
      setTransactionStatus('error')
      setError(error?.message || "Transaction failed")
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setTransactionStatus('')
      }, 3000)
    }
  }

  // Format transaction for display
  const formatTransaction = (tx: Transaction) => {
    const isIncoming = tx.to.toLowerCase() === walletAddress.toLowerCase()
    return {
      ...tx,
      displayValue: `${isIncoming ? '+' : '-'}${tx.value} ${currentChain?.symbol || 'ETH'}`,
      displayAddress: isIncoming ? tx.from : tx.to,
      type: isIncoming ? 'received' : 'sent'
    }
  }

  // Get blockchain explorer URL for transaction
  const getExplorerUrl = (txHash: string) => {
    if (!currentChain?.blockExplorerUrl) return '#';
    return `${currentChain.blockExplorerUrl}/tx/${txHash}`;
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
      
      {error && (
        <div className="mb-4 p-2 bg-danger/10 border border-danger/20 rounded-md flex items-center text-danger text-sm">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-xs hover:text-danger/70"
          >
            Dismiss
          </button>
        </div>
      )}
      
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
                  href={`${currentChain?.blockExplorerUrl || 'https://etherscan.io'}/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-md hover:bg-muted"
                  title="View on Explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="relative">
                <p className="text-sm text-muted-foreground">Network</p>
                <button 
                  className="font-medium flex items-center hover:text-primary"
                  onClick={() => setShowNetworkSelector(!showNetworkSelector)}
                >
                  {currentChain ? (
                    <>
                      <span className="mr-1">{currentChain.icon}</span>
                      {currentChain.name}
                    </>
                  ) : (
                    'Unknown Network'
                  )}
                  <ArrowDownUp className="ml-1 h-3 w-3" />
                </button>
                
                {/* Network Selector Dropdown */}
                {showNetworkSelector && (
                  <div className="absolute z-10 mt-1 bg-card border border-border rounded-md shadow-lg w-48">
                    {supportedChains.map(chain => (
                      <button
                        key={chain.id}
                        onClick={() => switchNetwork(chain.id)}
                        className={`w-full text-left px-3 py-2 flex items-center hover:bg-muted ${chain.id === chainId ? 'bg-muted/50 font-medium' : ''}`}
                      >
                        <span className="mr-2">{chain.icon}</span>
                        {chain.name}
                        {chain.id === chainId && <CheckCircle className="ml-auto h-3 w-3 text-success" />}
                      </button>
                    ))}
                  </div>
                )}
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
          
          {/* Transaction History */}
          <div>
            <h3 className="text-md font-medium mb-2 flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              Recent Transactions
            </h3>
            {transactions.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {transactions.map((tx: Transaction) => {
                  const formattedTx = formatTransaction(tx);
                  return (
                    <a
                      key={tx.hash}
                      href={getExplorerUrl(tx.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 text-sm border border-border rounded-md hover:bg-muted/30"
                    >
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full mr-2 ${formattedTx.type === 'received' ? 'bg-success/10' : 'bg-muted'}`}>
                          {formattedTx.type === 'received' ? 
                            <ArrowLeft className={`h-3 w-3 ${formattedTx.type === 'received' ? 'text-success' : 'text-muted-foreground'}`} /> : 
                            <ArrowRight className={`h-3 w-3 ${formattedTx.type === 'sent' ? 'text-primary' : 'text-muted-foreground'}`} />
                          }
                        </div>
                        <div>
                          <p className="font-medium">{formattedTx.displayValue}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.timestamp).toLocaleString(undefined, { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs">
                          {formattedTx.type === 'received' ? 'From:' : 'To:'} {formattedTx.displayAddress.substring(0, 6)}...
                        </p>
                        <p className={`text-xs ${tx.status === 'confirmed' ? 'text-success' : tx.status === 'pending' ? 'text-warning' : 'text-danger'}`}>
                          {tx.status === 'confirmed' ? 'Confirmed' : tx.status === 'pending' ? 'Pending' : 'Failed'}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-md">
                No recent transactions
              </div>
            )}
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
