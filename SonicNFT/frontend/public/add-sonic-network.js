/**
 * Add Sonic Network to MetaMask
 * This script helps users add the Sonic blockchain to their wallet
 */
async function addSonicNetwork() {
  // Check if window.ethereum is available
  if (typeof window.ethereum === 'undefined') {
    alert('MetaMask is not installed. Please install MetaMask or another Ethereum-compatible wallet to use this feature.');
    return;
  }
  
  try {
    // Sonic Chain Parameters
    const sonicChainParams = {
      chainId: '0xb72', // 2930 in hexadecimal
      chainName: 'Sonic',
      nativeCurrency: {
        name: 'SONIC',
        symbol: 'SONIC',
        decimals: 18
      },
      rpcUrls: [document.sonicRpcUrl || 'https://rpc.sonic.org'],
      blockExplorerUrls: ['https://scan.sonic.org']
    };
    
    // Request to add the chain to wallet
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [sonicChainParams]
    });
    
    console.log('Sonic network added to wallet successfully!');
    
    // Track success event if analytics is available
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('add_sonic_network_success');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to add Sonic network:', error);
    
    // Track error event if analytics is available
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('add_sonic_network_error', { error: error.message });
    }
    
    // Only alert if it's not user rejection
    if (error.code !== 4001) {
      alert('Failed to add Sonic network to your wallet. Please try again or add it manually.');
    }
    
    return false;
  }
}

// Switch to Sonic network
async function switchToSonicNetwork() {
  // Check if window.ethereum is available
  if (typeof window.ethereum === 'undefined') {
    alert('MetaMask is not installed. Please install MetaMask or another Ethereum-compatible wallet to use this feature.');
    return;
  }
  
  try {
    // Try to switch to the Sonic network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xb72' }], // 2930 in hexadecimal
    });
    
    console.log('Switched to Sonic network successfully!');
    
    // Track success event if analytics is available
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('switch_sonic_network_success');
    }
    
    return true;
  } catch (error) {
    // If the chain doesn't exist, add it
    if (error.code === 4902) {
      return await addSonicNetwork();
    }
    
    console.error('Failed to switch to Sonic network:', error);
    
    // Track error event if analytics is available
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('switch_sonic_network_error', { error: error.message });
    }
    
    // Only alert if it's not user rejection
    if (error.code !== 4001) {
      alert('Failed to switch to the Sonic network. Please try again or switch manually.');
    }
    
    return false;
  }
}

// Configure Sonic RPC URL from the environment
document.addEventListener('DOMContentLoaded', () => {
  // Get the RPC URL from a data attribute if available
  const sonicRpcUrlElement = document.querySelector('[data-sonic-rpc-url]');
  if (sonicRpcUrlElement) {
    document.sonicRpcUrl = sonicRpcUrlElement.getAttribute('data-sonic-rpc-url');
  }
});

// Expose functions globally
window.addSonicNetwork = addSonicNetwork;
window.switchToSonicNetwork = switchToSonicNetwork; 