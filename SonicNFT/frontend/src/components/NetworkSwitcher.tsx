import React, { useState, useEffect } from 'react';
import { useNetwork, useSwitchNetwork } from 'wagmi';
import { sonicNetwork, sonicTestnet } from '@/lib/web3Config';

const NetworkSwitcher = () => {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [isTestnet, setIsTestnet] = useState(false);

  // Check current network on component mount
  useEffect(() => {
    if (chain) {
      setIsTestnet(chain.id === sonicTestnet.id);
    }
  }, [chain]);

  // Toggle between mainnet and testnet
  const toggleNetwork = () => {
    if (chain?.id === sonicNetwork.id) {
      // Currently on mainnet, switch to testnet
      switchNetwork?.(sonicTestnet.id);
    } else if (chain?.id === sonicTestnet.id) {
      // Currently on testnet, switch to mainnet
      switchNetwork?.(sonicNetwork.id);
    }
  };

  // Display network badge based on current network
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleNetwork}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          isTestnet
            ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
            : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
        }`}
      >
        {isTestnet ? '🧪 Testnet' : '🚀 Mainnet'}
      </button>
    </div>
  );
};

export default NetworkSwitcher; 