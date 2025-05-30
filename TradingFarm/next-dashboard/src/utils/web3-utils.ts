/**
 * Utility functions for web3 interaction in the Trading Farm Dashboard
 */

/**
 * Truncates an Ethereum address for display
 * @param address The full Ethereum address
 * @param startChars Number of characters to show at the start
 * @param endChars Number of characters to show at the end
 * @returns Truncated address (e.g. 0x1234...5678)
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return ''
  
  const start = address.slice(0, startChars)
  const end = address.slice(-endChars)
  
  return `${start}...${end}`
}

/**
 * Copies text to clipboard
 * @param text Text to copy
 * @returns Promise resolving when copying is complete
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  } catch (error) {
    console.error('Failed to copy text:', error)
  }
}

/**
 * Formats token balance with specified precision
 * @param value Balance value as string
 * @param precision Number of decimal places
 * @returns Formatted balance string
 */
export function formatBalance(value: string, precision = 4): string {
  if (!value) return '0'
  
  const floatValue = parseFloat(value)
  
  if (isNaN(floatValue)) return '0'
  
  // For very small values, show in scientific notation
  if (floatValue > 0 && floatValue < 0.0001) {
    return floatValue.toExponential(2)
  }
  
  // For larger values, format with the specified precision
  return floatValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision
  })
}

/**
 * Gets a friendly name for a blockchain network given its chainId
 * @param chainId Numeric chain ID
 * @returns Human-readable network name
 */
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon',
    80001: 'Mumbai Testnet',
    42161: 'Arbitrum One',
    10: 'Optimism',
    56: 'BNB Smart Chain',
    8453: 'Base',
    84531: 'Base Goerli'
  }
  
  return networks[chainId] || `Unknown Network (${chainId})`
}

/**
 * Formats an account balance as fiat currency
 * @param value Balance value as string 
 * @param price Price in fiat per token
 * @param currency Fiat currency symbol
 * @returns Formatted fiat value
 */
export function formatFiatValue(value: string, price: number, currency = '$'): string {
  if (!value || !price) return `${currency}0.00`
  
  const floatValue = parseFloat(value)
  
  if (isNaN(floatValue)) return `${currency}0.00`
  
  const fiatValue = floatValue * price
  
  // For very small values
  if (fiatValue > 0 && fiatValue < 0.01) {
    return `<${currency}0.01`
  }
  
  // Format based on value size
  if (fiatValue >= 1000000) {
    return `${currency}${(fiatValue / 1000000).toFixed(2)}M`
  } else if (fiatValue >= 1000) {
    return `${currency}${(fiatValue / 1000).toFixed(2)}K`
  }
  
  return `${currency}${fiatValue.toFixed(2)}`
}

/**
 * Calculates gas price in gwei from wei
 * @param weiValue Gas price in wei
 * @returns Formatted gas price in gwei
 */
export function formatGasPrice(weiValue: bigint | string): string {
  if (!weiValue) return '0'
  
  const wei = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue
  const gwei = Number(wei) / 1e9
  
  return gwei.toFixed(2)
}

/**
 * Creates an Etherscan link for an address, transaction, or token
 * @param type Type of link to create
 * @param value Address, tx hash, or token address
 * @param chainId Network chain ID
 * @returns Complete Etherscan URL
 */
export function createExplorerLink(
  type: 'address' | 'tx' | 'token',
  value: string,
  chainId: number = 1
): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
    56: 'https://bscscan.com',
    8453: 'https://basescan.org',
    84531: 'https://goerli.basescan.org'
  }
  
  const baseUrl = explorers[chainId] || explorers[1]
  
  switch (type) {
    case 'address':
      return `${baseUrl}/address/${value}`
    case 'tx':
      return `${baseUrl}/tx/${value}`
    case 'token':
      return `${baseUrl}/token/${value}`
    default:
      return baseUrl
  }
}
