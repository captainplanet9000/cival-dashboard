import React, { useState, useEffect } from 'react';
import { ProtocolPosition, ProtocolType } from '../../types/defi-protocol-types';
import PositionCard from './PositionCard';
import ProtocolSummaryCard from './ProtocolSummaryCard';
import ProtocolSelector from './ProtocolSelector';
import { CrossProtocolAggregator } from '../../services/defi/cross-protocol-aggregator';
import { WalletProvider } from '../../services/wallet/wallet-provider';
import PositionChart from './PositionChart';
import { ErrorHandler } from '../../services/defi/error-handler';

interface ProtocolDashboardProps {
  walletAddress?: string;
  selectedChainIds?: number[];
  className?: string;
}

const ProtocolDashboard: React.FC<ProtocolDashboardProps> = ({
  walletAddress,
  selectedChainIds = [1, 42161, 137, 10], // Ethereum, Arbitrum, Polygon, Optimism
  className = ''
}) => {
  const [positions, setPositions] = useState<ProtocolPosition[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | 'all'>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [protocolValues, setProtocolValues] = useState<Record<ProtocolType, number>>({} as Record<ProtocolType, number>);
  const [assetValues, setAssetValues] = useState<Record<string, number>>({});
  
  // Get user's wallet address if not provided
  const userAddress = walletAddress || WalletProvider.getInstance().getWalletInfo()?.address || '';
  
  // Error handler
  const errorHandler = ErrorHandler.getInstance();
  
  // Load user positions across all protocols
  useEffect(() => {
    async function loadPositions() {
      if (!userAddress) {
        setError('Wallet not connected');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const aggregator = CrossProtocolAggregator.getInstance();
        const result = await aggregator.aggregatePositions(userAddress, selectedChainIds);
        
        setPositions(result.positions);
        setTotalValue(result.totalValueUSD);
        setProtocolValues(result.positionsByProtocol);
        setAssetValues(result.positionsByAsset);
      } catch (error: any) {
        const deFiError = errorHandler.handleError(error, 'Dashboard', 'LOAD_POSITIONS');
        setError(deFiError.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadPositions();
  }, [userAddress, selectedChainIds]);
  
  // Filter positions by selected protocol
  const filteredPositions = positions.filter(pos => 
    selectedProtocol === 'all' || pos.protocolId === selectedProtocol
  );
  
  // Get available protocols from positions
  const availableProtocols = Array.from(
    new Set(positions.map(pos => pos.protocolId))
  );
  
  // Handle protocol selection
  const handleProtocolSelect = (protocol: ProtocolType | 'all') => {
    setSelectedProtocol(protocol);
  };
  
  // Generate chart data for protocol distribution
  const protocolChartData = Object.entries(protocolValues)
    .filter(([_, value]) => value > 0)
    .map(([protocol, value]) => ({
      name: protocol,
      value
    }));
  
  // Generate chart data for asset distribution
  const assetChartData = Object.entries(assetValues)
    .filter(([_, value]) => value > 0)
    .map(([asset, value]) => ({
      name: asset,
      value
    }));
  
  return (
    <div className={`protocol-dashboard ${className}`}>
      <div className="dashboard-header">
        <h2 className="dashboard-title">DeFi Portfolio Dashboard</h2>
        
        <div className="dashboard-controls">
          <ProtocolSelector 
            protocols={availableProtocols} 
            selectedProtocol={selectedProtocol} 
            onSelectProtocol={handleProtocolSelect} 
          />
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading-indicator">
          Loading positions...
        </div>
      ) : (
        <>
          <div className="dashboard-summary">
            <div className="summary-card total-value">
              <h3>Total Value</h3>
              <div className="value">${totalValue.toLocaleString()}</div>
            </div>
            
            <div className="protocol-summaries">
              {Object.entries(protocolValues)
                .filter(([_, value]) => value > 0)
                .map(([protocol, value]) => (
                  <ProtocolSummaryCard 
                    key={protocol}
                    protocol={protocol as ProtocolType}
                    value={value}
                    percentage={totalValue > 0 ? (value / totalValue) * 100 : 0}
                  />
                ))
              }
            </div>
          </div>
          
          <div className="dashboard-charts">
            <div className="chart-container protocol-chart">
              <h3>Protocol Distribution</h3>
              <PositionChart 
                data={protocolChartData} 
                type="pie"
                nameKey="name"
                dataKey="value"
              />
            </div>
            
            <div className="chart-container asset-chart">
              <h3>Asset Distribution</h3>
              <PositionChart 
                data={assetChartData} 
                type="pie"
                nameKey="name"
                dataKey="value"
              />
            </div>
          </div>
          
          <div className="positions-list">
            <h3>
              {selectedProtocol === 'all' 
                ? 'All Positions' 
                : `${selectedProtocol} Positions`} 
              ({filteredPositions.length})
            </h3>
            
            {filteredPositions.length === 0 ? (
              <div className="no-positions">
                No positions found
              </div>
            ) : (
              <div className="positions-grid">
                {filteredPositions.map(position => (
                  <PositionCard key={position.id} position={position} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProtocolDashboard; 