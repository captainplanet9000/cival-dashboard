// Example React component for Trading Farm Dashboard integration
// This is a demo file showing how to integrate with a React-based UI

import React, { useEffect, useState } from 'react';
import { tradingFarmDashboard } from './dashboard-integration';
import { Farm } from './models/farm';
import { Agent } from './models/agent';
import { MarketData } from './models/market-data';
import { Order } from './models/order';
import { Wallet } from './models/wallet';

// API key would typically come from environment variables
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

/**
 * Main Trading Farm Dashboard Component
 */
export const TradingFarmDashboard: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the Trading Farm integration
  useEffect(() => {
    try {
      tradingFarmDashboard.initialize(SUPABASE_API_KEY);
      setInitialized(true);
      loadFarms();
    } catch (err) {
      setError(`Failed to initialize: ${err}`);
      setLoading(false);
    }
    
    // Cleanup subscriptions on unmount
    return () => {
      if (initialized) {
        tradingFarmDashboard.unsubscribeAll();
      }
    };
  }, []);
  
  // Load farms
  const loadFarms = async () => {
    try {
      setLoading(true);
      const farmsList = await tradingFarmDashboard.getFarms();
      setFarms(farmsList);
      
      // Subscribe to farm updates
      tradingFarmDashboard.subscribeFarms((updatedFarm) => {
        setFarms(prevFarms => {
          const index = prevFarms.findIndex(farm => farm.id === updatedFarm.id);
          if (index >= 0) {
            const newFarms = [...prevFarms];
            newFarms[index] = updatedFarm;
            return newFarms;
          } else {
            return [...prevFarms, updatedFarm];
          }
        });
        
        // If the updated farm is the selected farm, update it
        if (selectedFarm && selectedFarm.id === updatedFarm.id) {
          setSelectedFarm(updatedFarm);
        }
      });
      
      setLoading(false);
    } catch (err) {
      setError(`Failed to load farms: ${err}`);
      setLoading(false);
    }
  };
  
  // Select a farm
  const selectFarm = async (farmId: number) => {
    try {
      setLoading(true);
      
      // Clear previous selections
      setSelectedFarm(null);
      setAgents([]);
      setWallets([]);
      setOrders([]);
      
      // Get farm details
      const farm = await tradingFarmDashboard.getFarm(farmId);
      if (!farm) {
        throw new Error(`Farm with ID ${farmId} not found`);
      }
      
      setSelectedFarm(farm);
      
      // Load farm-related data
      await Promise.all([
        loadAgentsForFarm(farmId),
        loadWalletsForFarm(farmId),
        loadOrdersForFarm(farmId)
      ]);
      
      // Subscribe to market data for common symbols
      subscribeToMarketData('BTC/USD', '1m');
      subscribeToMarketData('ETH/USD', '1m');
      
      setLoading(false);
    } catch (err) {
      setError(`Failed to select farm: ${err}`);
      setLoading(false);
    }
  };
  
  // Load agents for a farm
  const loadAgentsForFarm = async (farmId: number) => {
    try {
      const agentsList = await tradingFarmDashboard.getAgentsForFarm(farmId);
      setAgents(agentsList);
      
      // Subscribe to agent updates
      tradingFarmDashboard.subscribeAgents(farmId, (updatedAgent) => {
        setAgents(prevAgents => {
          const index = prevAgents.findIndex(agent => agent.id === updatedAgent.id);
          if (index >= 0) {
            const newAgents = [...prevAgents];
            newAgents[index] = updatedAgent;
            return newAgents;
          } else {
            return [...prevAgents, updatedAgent];
          }
        });
      });
    } catch (err) {
      setError(`Failed to load agents: ${err}`);
    }
  };
  
  // Load wallets for a farm
  const loadWalletsForFarm = async (farmId: number) => {
    try {
      const walletsList = await tradingFarmDashboard.getWalletsForFarm(farmId);
      setWallets(walletsList);
    } catch (err) {
      setError(`Failed to load wallets: ${err}`);
    }
  };
  
  // Load orders for a farm
  const loadOrdersForFarm = async (farmId: number) => {
    try {
      const ordersList = await tradingFarmDashboard.getOrdersForFarm(farmId);
      setOrders(ordersList);
      
      // Subscribe to order updates
      tradingFarmDashboard.subscribeOrders(farmId, (updatedOrder) => {
        setOrders(prevOrders => {
          const index = prevOrders.findIndex(order => order.id === updatedOrder.id);
          if (index >= 0) {
            const newOrders = [...prevOrders];
            newOrders[index] = updatedOrder;
            return newOrders;
          } else {
            return [...prevOrders, updatedOrder];
          }
        });
      });
    } catch (err) {
      setError(`Failed to load orders: ${err}`);
    }
  };
  
  // Subscribe to market data
  const subscribeToMarketData = async (symbol: string, timeframe: string) => {
    try {
      // First, get latest data
      const latestData = await tradingFarmDashboard.getLatestMarketData(symbol, timeframe);
      if (latestData) {
        setMarketData(prev => ({
          ...prev,
          [`${symbol}-${timeframe}`]: latestData
        }));
      }
      
      // Subscribe to updates
      tradingFarmDashboard.subscribeMarketData(symbol, timeframe, (newData) => {
        setMarketData(prev => ({
          ...prev,
          [`${symbol}-${timeframe}`]: newData
        }));
      });
    } catch (err) {
      setError(`Failed to subscribe to market data for ${symbol}: ${err}`);
    }
  };
  
  // Process an ElizaOS command (e.g., from a command input)
  const processCommand = async (commandText: string) => {
    try {
      await tradingFarmDashboard.processElizaCommand(
        commandText,
        'user',
        { farm_id: selectedFarm?.id }
      );
    } catch (err) {
      setError(`Failed to process command: ${err}`);
    }
  };
  
  // Render the dashboard
  return (
    <div className="trading-farm-dashboard">
      <h1>Trading Farm Dashboard</h1>
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && <div className="loading">Loading...</div>}
      
      {/* Farm selection */}
      <div className="farm-selection">
        <h2>Farms</h2>
        <div className="farms-list">
          {farms.map(farm => (
            <div 
              key={farm.id} 
              className={`farm-item ${selectedFarm?.id === farm.id ? 'selected' : ''}`}
              onClick={() => selectFarm(farm.id)}
            >
              <h3>{farm.name}</h3>
              <p>{farm.description}</p>
              <div className="farm-status">
                <span className={`status-indicator ${farm.is_active ? 'active' : 'inactive'}`}></span>
                <span>{farm.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Farm detail section */}
      {selectedFarm && (
        <div className="farm-detail">
          <h2>{selectedFarm.name}</h2>
          
          {/* Farm overview */}
          <div className="farm-overview">
            <div className="farm-metrics">
              <h3>Performance Metrics</h3>
              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Win Rate</span>
                  <span className="metric-value">
                    {selectedFarm.performance_metrics?.win_rate || 0}%
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Trades Count</span>
                  <span className="metric-value">
                    {selectedFarm.performance_metrics?.trades_count || 0}
                  </span>
                </div>
                {/* Add more metrics as needed */}
              </div>
            </div>
            
            <div className="farm-risk-profile">
              <h3>Risk Profile</h3>
              <div className="risk-metrics">
                <div className="risk-metric">
                  <span className="metric-label">Max Drawdown</span>
                  <span className="metric-value">
                    {selectedFarm.risk_profile?.max_drawdown || 0}%
                  </span>
                </div>
                <div className="risk-metric">
                  <span className="metric-label">Max Trade Size</span>
                  <span className="metric-value">
                    ${selectedFarm.risk_profile?.max_trade_size || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Market Data Section */}
          <div className="market-data-section">
            <h3>Market Data</h3>
            <div className="market-data-grid">
              {Object.entries(marketData).map(([key, data]) => {
                const [symbol, timeframe] = key.split('-');
                return (
                  <div key={key} className="market-data-card">
                    <h4>{symbol} ({timeframe})</h4>
                    <div className="price">
                      ${data?.price || 'N/A'}
                    </div>
                    <div className="timestamp">
                      Last updated: {new Date(data?.timestamp || Date.now()).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Agents Section */}
          <div className="agents-section">
            <h3>Farm Agents</h3>
            <div className="agents-grid">
              {agents.map(agent => (
                <div key={agent.id} className="agent-card">
                  <h4>{agent.name}</h4>
                  <div className="agent-status">
                    <span className={`status-indicator ${agent.is_active ? 'active' : 'inactive'}`}></span>
                    <span>{agent.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="agent-capabilities">
                    <h5>Capabilities</h5>
                    <ul>
                      {agent.capabilities?.map(capability => (
                        <li key={capability}>{capability}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Wallets Section */}
          <div className="wallets-section">
            <h3>Farm Wallets</h3>
            <div className="wallets-grid">
              {wallets.map(wallet => (
                <div key={wallet.id} className="wallet-card">
                  <h4>{wallet.name}</h4>
                  <div className="wallet-balance">
                    <span className="balance-value">{wallet.balance}</span>
                    <span className="balance-currency">{wallet.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Orders Section */}
          <div className="orders-section">
            <h3>Orders</h3>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Side</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.symbol}</td>
                    <td>{order.order_type}</td>
                    <td>{order.side}</td>
                    <td>{order.quantity}</td>
                    <td>${order.price}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6}>No orders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Command Input */}
          <div className="command-input-section">
            <h3>ElizaOS Command</h3>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('command') as HTMLInputElement;
                if (input.value) {
                  processCommand(input.value);
                  input.value = '';
                }
              }}
            >
              <input 
                type="text" 
                name="command" 
                placeholder="Enter command (e.g., 'check status of BTC/USD')" 
              />
              <button type="submit">Execute</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingFarmDashboard;
