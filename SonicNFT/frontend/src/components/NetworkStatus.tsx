import React from 'react';
import { useNetwork, useSwitchNetwork } from 'wagmi';
import { AlertCircle, CheckCircle2, SwitchCamera } from 'lucide-react';
import { sonicNetwork, sonicTestnet } from '@/lib/web3Config';

const NetworkStatus = () => {
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitchingNetwork } = useSwitchNetwork();
  
  // Check if connected to a supported network
  const isOnSonicNetwork = chain?.id === sonicNetwork.id;
  const isOnSonicTestnet = chain?.id === sonicTestnet.id;
  const isOnSupportedNetwork = isOnSonicNetwork || isOnSonicTestnet;
  
  // Don't show anything if on the right network
  if (isOnSupportedNetwork) {
    return null;
  }
  
  return (
    <div className="sonic-card mb-6 p-4 bg-amber-800/10 border border-amber-500/20 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle size={20} className="text-amber-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-amber-400 font-medium">Wrong Network Detected</h3>
          <p className="mt-1 text-sonic-muted text-sm">
            You are currently connected to {chain?.name || 'an unsupported network'}. 
            To interact with Sonic NFT, please switch to Sonic Network.
          </p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={() => switchNetwork?.(sonicNetwork.id)}
              disabled={isSwitchingNetwork}
              className="sonic-button-secondary py-2 px-4 flex items-center text-sm"
            >
              {isSwitchingNetwork ? 'Switching...' : 'Switch to Mainnet'}
              {!isSwitchingNetwork && <SwitchCamera size={16} className="ml-2" />}
            </button>
            <button
              onClick={() => switchNetwork?.(sonicTestnet.id)}
              disabled={isSwitchingNetwork}
              className="py-2 px-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg flex items-center text-sm"
            >
              {isSwitchingNetwork ? 'Switching...' : 'Switch to Testnet'}
              {!isSwitchingNetwork && <SwitchCamera size={16} className="ml-2" />}
            </button>
          </div>
          
          {/* Add to wallet instructions */}
          <div className="mt-4 border-t border-amber-500/20 pt-3">
            <p className="text-xs text-sonic-muted">
              If you don't see Sonic Network in your wallet, you may need to add it manually:
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
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
      </div>
    </div>
  );
};

export default NetworkStatus; 