/**
 * Trading Farm Memory Dashboard Demo
 * 
 * This component demonstrates how to integrate Cognee.ai agent memory and
 * Graphiti knowledge graph with the Trading Farm dashboard.
 */

import React, { useState, useEffect } from 'react';
import { getTradingFarmMemory } from './memory/trading-farm-memory';
import { AgentMemoryState, AgentMemoryAnalysis } from './memory/cognee-client';
import { MarketCorrelation, GraphPathAnalysis } from './memory/graphiti-client';
import { getSupabaseClient } from './lib/supabase-client';

// Constants
const COGNEE_API_KEY = 'cognee_sk_FiTdR9PZLn2V4KmJaB7QcE3X';
const GRAPHITI_API_KEY = 'graphiti_G7yX2aKpQvZwHs9bRT6mL8n4';

// TypeScript types for UI components
type Farm = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
};

type Agent = {
  id: number;
  name: string;
  type: string;
  farm_id: number;
  status: string;
  memory_context?: any;
};

type Market = {
  symbol: string;
  exchange: string;
  timeframes: string[];
};

// Helper function for creating mock data (for demo purposes)
const createMockData = async () => {
  const supabase = getSupabaseClient();
  
  // Create a mock farm if none exists
  const { data: farms } = await supabase.from('farms').select('*').limit(1);
  
  if (!farms || farms.length === 0) {
    // Create farm
    const { data: farm } = await supabase
      .from('farms')
      .insert([
        { 
          name: 'Alpha Testing Farm', 
          description: 'Demo farm for memory system',
          is_active: true,
          risk_profile: { max_drawdown: 5 },
          performance_metrics: { win_rate: 0 },
          config: { test_mode: true },
          metadata: { created_by: 'memory_demo' }
        }
      ])
      .select()
      .single();
      
    if (farm) {
      // Create agents
      await supabase
        .from('agents')
        .insert([
          {
            name: 'BTC Trend Follower',
            type: 'trend_follower',
            farm_id: farm.id,
            status: 'active',
            config: { timeframes: ['1h', '4h'] },
            memory_context: { initialized: true }
          },
          {
            name: 'ETH Breakout Trader',
            type: 'breakout',
            farm_id: farm.id,
            status: 'active',
            config: { timeframes: ['15m', '1h'] },
            memory_context: { initialized: true }
          }
        ]);
    }
  }
};

// Main dashboard component
export const MemoryDashboard: React.FC = () => {
  // Initialize memory system
  useEffect(() => {
    const memorySystem = getTradingFarmMemory();
    memorySystem.initialize(COGNEE_API_KEY, GRAPHITI_API_KEY);
    
    // Set up auto-memory updates
    memorySystem.setupAutomaticMemoryUpdates();
    
    // Create mock data for demo
    createMockData();
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Trading Farm Memory System</h1>
        </div>
      </header>
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FarmSelector />
            <MemoryInsights />
          </div>
        </div>
      </main>
    </div>
  );
};

// Farm selector component
const FarmSelector: React.FC = () => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [updating, setUpdating] = useState(false);
  
  // Load farms
  useEffect(() => {
    const loadFarms = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('farms').select('*');
      if (data && data.length > 0) {
        setFarms(data);
        setSelectedFarmId(data[0].id);
      }
    };
    
    loadFarms();
  }, []);
  
  // Load agents when farm is selected
  useEffect(() => {
    if (selectedFarmId) {
      const loadAgents = async () => {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', selectedFarmId);
          
        if (data) {
          setAgents(data);
        }
      };
      
      loadAgents();
    }
  }, [selectedFarmId]);
  
  // Update farm graph
  const updateFarmGraph = async () => {
    if (!selectedFarmId) return;
    
    setUpdating(true);
    try {
      const memorySystem = getTradingFarmMemory();
      await memorySystem.updateFarmGraph(selectedFarmId);
      alert('Farm graph updated successfully');
    } catch (error) {
      console.error('Error updating farm graph:', error);
      alert('Error updating farm graph');
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Farms & Agents</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Farm
        </label>
        <select 
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={selectedFarmId || ''}
          onChange={(e) => setSelectedFarmId(Number(e.target.value))}
        >
          {farms.map(farm => (
            <option key={farm.id} value={farm.id}>
              {farm.name} {farm.is_active ? '(Active)' : '(Inactive)'}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={updateFarmGraph}
          disabled={updating}
        >
          {updating ? 'Updating...' : 'Update Knowledge Graph'}
        </button>
      </div>
      
      <div className="mt-6">
        <h3 className="text-md font-medium text-gray-900 mb-2">Agents</h3>
        <ul className="divide-y divide-gray-200">
          {agents.map(agent => (
            <AgentListItem key={agent.id} agent={agent} />
          ))}
        </ul>
      </div>
    </div>
  );
};

// Agent list item component
const AgentListItem: React.FC<{ agent: Agent }> = ({ agent }) => {
  const [memoryState, setMemoryState] = useState<AgentMemoryState | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  const loadMemoryState = async () => {
    try {
      const memorySystem = getTradingFarmMemory();
      const state = await memorySystem.getAgentMemoryState(agent.id);
      setMemoryState(state);
    } catch (error) {
      console.error('Error loading agent memory state:', error);
    }
  };
  
  const consolidateMemory = async () => {
    try {
      const memorySystem = getTradingFarmMemory();
      await memorySystem.consolidateAgentMemory(agent.id);
      loadMemoryState(); // Refresh memory state
      alert('Memory consolidated successfully');
    } catch (error) {
      console.error('Error consolidating memory:', error);
      alert('Error consolidating memory');
    }
  };
  
  // Load memory state when expanded
  useEffect(() => {
    if (expanded) {
      loadMemoryState();
    }
  }, [expanded]);
  
  return (
    <li className="py-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">{agent.name}</h4>
          <p className="text-sm text-gray-500">Type: {agent.type}</p>
          <p className="text-sm text-gray-500">Status: {agent.status}</p>
        </div>
        <div>
          <button
            className="text-sm text-indigo-600 hover:text-indigo-900"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Memory' : 'Show Memory'}
          </button>
        </div>
      </div>
      
      {expanded && memoryState && (
        <div className="mt-2">
          <div className="bg-gray-50 p-3 rounded-md text-xs">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Memory Stats</span>
              <button
                className="text-xs text-indigo-600 hover:text-indigo-900"
                onClick={consolidateMemory}
              >
                Consolidate Memory
              </button>
            </div>
            <p>Working Memory Items: {memoryState.workingMemory.length}</p>
            <p>Episodic Memory Items: {memoryState.recentEpisodic.length}</p>
            <p>Semantic Memory Items: {memoryState.relevantSemantic.length}</p>
            <p>Working Memory Load: {(memoryState.memoryStats.workingMemoryLoad * 100).toFixed(0)}%</p>
            <p>Total Memory Items: {memoryState.memoryStats.totalItems}</p>
            
            {memoryState.activeGoals.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">Active Goals:</span>
                <ul className="list-disc list-inside">
                  {memoryState.activeGoals.map((goal, index) => (
                    <li key={index}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {memoryState.workingMemory.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">Current Focus:</span>
                <ul className="list-disc list-inside">
                  {memoryState.workingMemory.map((item, index) => (
                    <li key={index} className="truncate">{item.content}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

// Memory insights component
const MemoryInsights: React.FC = () => {
  const [correlations, setCorrelations] = useState<MarketCorrelation[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'correlations' | 'patterns' | 'insights'>('correlations');
  const [loading, setLoading] = useState(false);
  
  // Load farms for selector
  useEffect(() => {
    const loadFarms = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('farms').select('id, name').limit(1);
      if (data && data.length > 0) {
        setSelectedFarmId(data[0].id);
      }
    };
    
    loadFarms();
  }, []);
  
  // Load correlations
  const loadCorrelations = async () => {
    setLoading(true);
    try {
      const memorySystem = getTradingFarmMemory();
      const data = await memorySystem.getMarketCorrelations('1h');
      setCorrelations(data);
    } catch (error) {
      console.error('Error loading correlations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load patterns
  const loadPatterns = async () => {
    setLoading(true);
    try {
      const memorySystem = getTradingFarmMemory();
      const data = await memorySystem.findMarketPatterns();
      setPatterns(data);
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load insights
  const loadInsights = async () => {
    if (!selectedFarmId) return;
    
    setLoading(true);
    try {
      const memorySystem = getTradingFarmMemory();
      const data = await memorySystem.generateInsights(selectedFarmId);
      setInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'correlations') {
      loadCorrelations();
    } else if (activeTab === 'patterns') {
      loadPatterns();
    } else if (activeTab === 'insights' && selectedFarmId) {
      loadInsights();
    }
  }, [activeTab, selectedFarmId]);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Market Memory & Insights</h2>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'correlations' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('correlations')}
          >
            Market Correlations
          </button>
          <button
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'patterns' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('patterns')}
          >
            Patterns
          </button>
          <button
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'insights' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('insights')}
          >
            Trading Insights
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div>
        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {activeTab === 'correlations' && (
              <div>
                <button
                  className="mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  onClick={loadCorrelations}
                >
                  Refresh
                </button>
                
                <ul className="divide-y divide-gray-200">
                  {correlations.map((correlation, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {correlation.market1} ↔ {correlation.market2}
                          </p>
                          <p className="text-sm text-gray-500">
                            {correlation.description}
                          </p>
                          {correlation.leadLag && (
                            <p className="text-xs text-gray-500 mt-1">
                              {correlation.leadLag.leader} leads {correlation.leadLag.follower} by {correlation.leadLag.lagAmount}
                            </p>
                          )}
                        </div>
                        <div>
                          <span 
                            className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${correlation.correlationStrength > 0.8 
                                ? 'bg-green-100 text-green-800' 
                                : correlation.correlationStrength > 0.5 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'}
                            `}
                          >
                            {(correlation.correlationStrength * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {activeTab === 'patterns' && (
              <div>
                <button
                  className="mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  onClick={loadPatterns}
                >
                  Refresh
                </button>
                
                <ul className="divide-y divide-gray-200">
                  {patterns.map((pattern, index) => (
                    <li key={index} className="py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {pattern.name}
                      </p>
                      <p className="text-sm text-gray-500 mb-1">
                        {pattern.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {pattern.markets.map((market, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {market}
                          </span>
                        ))}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {pattern.timeframe}
                        </span>
                      </div>
                      {pattern.leadLag && (
                        <p className="text-xs text-gray-500">
                          {pattern.leadLag.leader} → {pattern.leadLag.follower} ({pattern.leadLag.lagAmount})
                        </p>
                      )}
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full" 
                            style={{ width: `${pattern.strength * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          Strength: {(pattern.strength * 100).toFixed(0)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {activeTab === 'insights' && (
              <div>
                <button
                  className="mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  onClick={loadInsights}
                >
                  Refresh
                </button>
                
                <ul className="divide-y divide-gray-200">
                  {insights.map((insight, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {insight.description}
                          </p>
                          
                          {insight.relatedMarkets.length > 0 && (
                            <div className="flex flex-wrap gap-1 my-1">
                              {insight.relatedMarkets.map((market, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {market}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {insight.suggestedAction && (
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-medium">Suggestion:</span> {insight.suggestedAction}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end ml-2">
                          <span 
                            className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${insight.confidence > 0.8 
                                ? 'bg-green-100 text-green-800' 
                                : insight.confidence > 0.5 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'}
                            `}
                          >
                            {(insight.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {insight.source === 'pattern' ? 'Pattern' :
                             insight.source === 'correlation' ? 'Correlation' :
                             insight.source === 'agent' ? 'Agent' : 'System'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MemoryDashboard;
