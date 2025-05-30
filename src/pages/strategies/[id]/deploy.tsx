import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Strategy, AgentStrategy } from '../../../services/strategies';

// Define a simple Agent interface for the UI
interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function StrategyDeployPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [deployedAgents, setDeployedAgents] = useState<AgentStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployLoading, setDeployLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state for new deployment
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  // Load strategy and agents data
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch strategy data
        const strategyResponse = await fetch(`/api/strategies?id=${id}`);
        if (!strategyResponse.ok) {
          throw new Error('Failed to fetch strategy');
        }
        const strategyData: Strategy = await strategyResponse.json();
        setStrategy(strategyData);
        
        // Fetch available agents
        // In a real app, this would be a call to your agents API
        // For this example, we'll use mock data
        const mockAgents: Agent[] = [
          { id: 'agent-1', name: 'Bitcoin Trader', type: 'spot', status: 'online' },
          { id: 'agent-2', name: 'Ethereum Trader', type: 'spot', status: 'online' },
          { id: 'agent-3', name: 'Altcoin Trader', type: 'spot', status: 'offline' },
          { id: 'agent-4', name: 'Futures Bot', type: 'futures', status: 'online' },
        ];
        setAgents(mockAgents);
        
        // Fetch deployed agents for this strategy
        // In a real app, you would fetch this from your API
        const deployedAgentsResponse = await fetch(`/api/agents/strategies?strategyId=${id}`);
        if (deployedAgentsResponse.ok) {
          const deployedAgentsData: AgentStrategy[] = await deployedAgentsResponse.json();
          setDeployedAgents(deployedAgentsData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);
  
  // Deploy strategy to agent
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || !selectedAgentId) return;
    
    try {
      setDeployLoading(true);
      setSuccessMessage(null);
      setError(null);
      
      const response = await fetch('/api/strategies/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategyId: id,
          agentId: selectedAgentId,
          config: {
            // Default configuration
            allowedMarkets: ['BTC-USD', 'ETH-USD'],
            maxPositionSize: 0.1,
            enabled: true
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deploy strategy');
      }
      
      const result = await response.json();
      
      // Add to deployed agents list
      const selectedAgent = agents.find(agent => agent.id === selectedAgentId);
      
      if (selectedAgent) {
        const newDeployment: AgentStrategy = {
          id: result.deploymentId,
          agent_id: selectedAgentId,
          strategy_id: id as string,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          config: {
            allowedMarkets: ['BTC-USD', 'ETH-USD'],
            maxPositionSize: 0.1,
            enabled: true
          },
          performance_metrics: null
        };
        
        setDeployedAgents(prev => [newDeployment, ...prev]);
      }
      
      // Reset selection and show success message
      setSelectedAgentId('');
      setSuccessMessage(`Strategy successfully deployed to agent`);
    } catch (err) {
      console.error('Error deploying strategy:', err);
      setError(err instanceof Error ? err.message : 'Failed to deploy strategy');
    } finally {
      setDeployLoading(false);
    }
  };
  
  // Get status badge for agent
  const getAgentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Online</span>;
      case 'offline':
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Offline</span>;
      case 'error':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Error</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (error && !strategy) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!strategy) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Warning:</strong>
          <span className="block sm:inline"> Strategy not found</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{strategy.name} - Deploy</h1>
          <p className="text-gray-600">{strategy.description}</p>
        </div>
        <Link 
          href={`/strategies/${id}`}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back to Strategy
        </Link>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Success:</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {/* Deployment Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Deploy to Agent</h2>
        
        <form onSubmit={handleDeploy}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              required
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option 
                  key={agent.id} 
                  value={agent.id}
                  disabled={agent.status.toLowerCase() !== 'online' || deployedAgents.some(da => da.agent_id === agent.id)}
                >
                  {agent.name} ({agent.type}) 
                  {deployedAgents.some(da => da.agent_id === agent.id) ? ' - Already deployed' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={deployLoading || !selectedAgentId}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {deployLoading ? 'Deploying...' : 'Deploy Strategy'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Currently Deployed Agents */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Currently Deployed</h2>
        </div>
        
        {deployedAgents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            This strategy is not deployed to any agents yet.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deployed At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deployedAgents.map((deployment) => {
                const agent = agents.find(a => a.id === deployment.agent_id);
                return (
                  <tr key={deployment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{agent?.name || deployment.agent_id}</div>
                      <div className="text-sm text-gray-500">{agent?.type || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getAgentStatusBadge(agent?.status || 'unknown')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(deployment.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => {
                          // In a real app, implement undeploy functionality
                          alert('Undeploy functionality not implemented');
                        }}
                        className="text-red-600 hover:text-red-900 mr-4"
                      >
                        Undeploy
                      </button>
                      <button 
                        onClick={() => {
                          // In a real app, implement config update
                          alert('Configure functionality not implemented');
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 