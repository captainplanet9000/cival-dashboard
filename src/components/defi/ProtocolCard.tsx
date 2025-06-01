import React from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { ProtocolType, ProtocolCategory } from '@/types/defi-protocol-types';

interface ProtocolCardProps {
  id: ProtocolType;
  name: string;
  category: ProtocolCategory;
  description: string;
  chains: number[] | string[];
  logoUrl?: string;
  stats?: {
    tvlUSD?: number | string;
    volume24h?: number | string;
    [key: string]: any;
  };
  isConnected?: boolean;
  onClick?: (id: ProtocolType) => void;
}

export default function ProtocolCard({
  id,
  name,
  category,
  description,
  chains,
  logoUrl,
  stats,
  isConnected = false,
  onClick
}: ProtocolCardProps) {
  // Format a number as USD
  const formatUSD = (value?: number | string): string => {
    if (!value) return '$0';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (numValue >= 1_000_000_000) {
      return `$${(numValue / 1_000_000_000).toFixed(2)}B`;
    } else if (numValue >= 1_000_000) {
      return `$${(numValue / 1_000_000).toFixed(2)}M`;
    } else if (numValue >= 1_000) {
      return `$${(numValue / 1_000).toFixed(2)}K`;
    }
    
    return `$${numValue.toFixed(2)}`;
  };
  
  // Get category badge color
  const getCategoryColor = (category: ProtocolCategory): string => {
    switch (category) {
      case ProtocolCategory.DEX:
        return 'bg-blue-100 text-blue-800';
      case ProtocolCategory.LENDING:
        return 'bg-green-100 text-green-800';
      case ProtocolCategory.PERPETUALS:
        return 'bg-purple-100 text-purple-800';
      case ProtocolCategory.DERIVATIVES:
        return 'bg-indigo-100 text-indigo-800';
      case ProtocolCategory.SYNTHETICS:
        return 'bg-pink-100 text-pink-800';
      case ProtocolCategory.LIQUIDITY:
        return 'bg-orange-100 text-orange-800';
      case ProtocolCategory.CLOB:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get image URL for chain logo
  const getChainLogoUrl = (chainId: number | string): string => {
    const chainMap: Record<string, string> = {
      '1': '/images/chains/ethereum.svg',
      '10': '/images/chains/optimism.svg',
      '56': '/images/chains/bsc.svg',
      '137': '/images/chains/polygon.svg',
      '42161': '/images/chains/arbitrum.svg',
      '43114': '/images/chains/avalanche.svg',
      '8453': '/images/chains/base.svg',
      'arbitrum': '/images/chains/arbitrum.svg',
      'base': '/images/chains/base.svg',
      'hyperliquid': '/images/chains/hyperliquid.svg'
    };
    
    return chainMap[chainId.toString()] || '/images/chains/default.svg';
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        {/* Protocol Logo */}
        <div className="p-4 flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${name} logo`} 
                className="w-10 h-10 object-contain" 
              />
            ) : (
              <div className="text-2xl font-bold text-gray-500">
                {name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">{name}</h3>
            <div className="flex space-x-2 mt-1">
              <Badge className={getCategoryColor(category)}>
                {category}
              </Badge>
              {isConnected && (
                <Badge className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Stats Section */}
        {stats && (
          <div className="px-4 pb-3 grid grid-cols-2 gap-4">
            {stats.tvlUSD && (
              <div>
                <p className="text-xs text-gray-500">TVL</p>
                <p className="font-semibold">{formatUSD(stats.tvlUSD)}</p>
              </div>
            )}
            {stats.volume24h && (
              <div>
                <p className="text-xs text-gray-500">24h Volume</p>
                <p className="font-semibold">{formatUSD(stats.volume24h)}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Description */}
        <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-100">
          {description.length > 100 
            ? `${description.substring(0, 100)}...` 
            : description}
        </div>
        
        {/* Chains */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Supported Chains</p>
          <div className="flex flex-wrap gap-2">
            {chains.slice(0, 5).map(chainId => (
              <div 
                key={chainId} 
                className="w-6 h-6 rounded-full overflow-hidden tooltip"
                data-tooltip={typeof chainId === 'string' ? chainId : `Chain ID: ${chainId}`}
              >
                <img 
                  src={getChainLogoUrl(chainId)} 
                  alt={`Chain ${chainId}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {chains.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                +{chains.length - 5}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Button */}
        <div className="px-4 py-3 border-t border-gray-100">
          <Button
            onClick={() => onClick && onClick(id)}
            className="w-full"
            variant={isConnected ? "outline" : "default"}
          >
            {isConnected ? 'View Dashboard' : 'Connect'}
          </Button>
        </div>
      </div>
    </Card>
  );
} 