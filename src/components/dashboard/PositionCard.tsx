import React from 'react';
import { ProtocolPosition, ProtocolType } from '../../types/defi-protocol-types';

interface PositionCardProps {
  position: ProtocolPosition;
  onClick?: (position: ProtocolPosition) => void;
  className?: string;
}

const ProtocolIcons: Record<ProtocolType, string> = {
  [ProtocolType.AAVE]: '/assets/protocol-icons/aave.svg',
  [ProtocolType.UNISWAP]: '/assets/protocol-icons/uniswap.svg',
  [ProtocolType.VERTEX]: '/assets/protocol-icons/vertex.svg',
  [ProtocolType.GMX]: '/assets/protocol-icons/gmx.svg',
  [ProtocolType.SUSHISWAP]: '/assets/protocol-icons/sushiswap.svg',
  [ProtocolType.MORPHO]: '/assets/protocol-icons/morpho.svg'
};

const formatCurrency = (value: number): string => {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * A card component for displaying protocol position details
 */
const PositionCard: React.FC<PositionCardProps> = ({ 
  position, 
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(position);
    }
  };
  
  // Get appropriate colors based on position type
  const getDirectionColor = () => {
    if (position.direction === 'long') return 'text-green-600';
    if (position.direction === 'short') return 'text-red-600';
    if (position.direction === 'supply') return 'text-blue-600';
    if (position.direction === 'borrow') return 'text-purple-600';
    if (position.direction === 'liquidity') return 'text-teal-600';
    return 'text-gray-600';
  };
  
  // Format position type
  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  // Format PnL with color
  const formatPnl = () => {
    if (!position.unrealizedPnl) return null;
    
    const pnlFormatted = formatCurrency(position.unrealizedPnl);
    const isPositive = position.unrealizedPnl > 0;
    
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : ''}{pnlFormatted}
      </span>
    );
  };
  
  // Get network name
  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 42161: return 'Arbitrum';
      case 137: return 'Polygon';
      case 10: return 'Optimism';
      case 43114: return 'Avalanche';
      case 56: return 'BSC';
      default: return `Chain ${chainId}`;
    }
  };
  
  return (
    <div 
      className={`position-card ${className}`}
      onClick={handleClick}
    >
      <div className="card-header">
        <div className="protocol-info">
          <img 
            src={ProtocolIcons[position.protocolId] || '/assets/protocol-icons/default.svg'} 
            alt={position.protocolId}
            className="protocol-icon"
          />
          <span className="protocol-name">{position.protocolId}</span>
        </div>
        
        <div className="network-badge">
          {getNetworkName(position.chainId)}
        </div>
      </div>
      
      <div className="card-body">
        <div className="asset-info">
          <span className="asset-symbol">{position.assetSymbol}</span>
          <span className={`position-type ${getDirectionColor()}`}>
            {formatType(position.direction)}
          </span>
        </div>
        
        <div className="position-value">
          <h4 className="label">Position Value</h4>
          <div className="value">{formatCurrency(position.positionValue || 0)}</div>
        </div>
        
        {position.leverage && position.leverage !== 1 && (
          <div className="leverage">
            <span className="label">Leverage</span>
            <span className="value">{position.leverage}x</span>
          </div>
        )}
        
        {position.unrealizedPnl !== undefined && (
          <div className="pnl">
            <span className="label">PnL</span>
            <span className="value">{formatPnl()}</span>
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <button className="action-button">
          Manage
        </button>
      </div>
    </div>
  );
};

export default PositionCard; 