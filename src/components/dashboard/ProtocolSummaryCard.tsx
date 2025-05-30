import React from 'react';
import { ProtocolType } from '../../types/defi-protocol-types';

interface ProtocolSummaryCardProps {
  protocol: ProtocolType;
  value: number;
  percentage: number;
  className?: string;
}

const ProtocolIcons: Partial<Record<ProtocolType, string>> = {
  [ProtocolType.AAVE]: '/assets/protocol-icons/aave.svg',
  [ProtocolType.UNISWAP]: '/assets/protocol-icons/uniswap.svg',
  [ProtocolType.VERTEX]: '/assets/protocol-icons/vertex.svg',
  [ProtocolType.GMX]: '/assets/protocol-icons/gmx.svg',
  [ProtocolType.SUSHISWAP]: '/assets/protocol-icons/sushiswap.svg',
  [ProtocolType.MORPHO]: '/assets/protocol-icons/morpho.svg'
};

// Protocol theme colors for styling the cards
const ProtocolColors: Partial<Record<ProtocolType, string>> = {
  [ProtocolType.AAVE]: 'rgb(178, 71, 239)',
  [ProtocolType.UNISWAP]: 'rgb(255, 0, 122)',
  [ProtocolType.VERTEX]: 'rgb(0, 153, 245)',
  [ProtocolType.GMX]: 'rgb(43, 56, 86)',
  [ProtocolType.SUSHISWAP]: 'rgb(240, 111, 132)',
  [ProtocolType.MORPHO]: 'rgb(8, 220, 231)'
};

/**
 * A component that displays summary information for a specific protocol
 */
const ProtocolSummaryCard: React.FC<ProtocolSummaryCardProps> = ({
  protocol,
  value,
  percentage,
  className = ''
}) => {
  const protocolColor = ProtocolColors[protocol] || 'rgb(128, 128, 128)';
  
  // Format the value as USD
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  
  // Format the percentage
  const formattedPercentage = `${percentage.toFixed(1)}%`;
  
  return (
    <div 
      className={`protocol-summary-card ${className}`}
      style={{ 
        borderLeft: `4px solid ${protocolColor}`,
        boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`
      }}
    >
      <div className="card-header">
        <div className="protocol-info">
          <img 
            src={ProtocolIcons[protocol] || '/assets/protocol-icons/default.svg'} 
            alt={protocol}
            className="protocol-icon"
            width={24} 
            height={24}
          />
          <span className="protocol-name">{protocol}</span>
        </div>
        
        <div className="protocol-percentage">
          {formattedPercentage}
        </div>
      </div>
      
      <div className="card-body">
        <div className="protocol-value">{formattedValue}</div>
      </div>
      
      <div 
        className="progress-bar"
        style={{
          width: '100%',
          height: '4px',
          background: '#f0f0f0',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <div 
          className="progress"
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: protocolColor
          }}
        />
      </div>
    </div>
  );
};

export default ProtocolSummaryCard; 