import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Card, Alert, Table, Badge, Spinner, Switch } from '@/components/ui';
import { ExchangeType } from '@/types/exchange-types';

interface ConnectionStatus {
  [key: string]: boolean;
}

export default function ExchangeConnectorPanel() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({});
  const [agentTradingEnabled, setAgentTradingEnabled] = useState<boolean>(false);
  
  // Initialize exchange connectors with test credentials
  const initializeConnectors = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.post('/api/trading/init-test-connectors', {
        enableAgentTrading: agentTradingEnabled
      });
      
      if (response.data.success) {
        setSuccess('Exchange connectors initialized successfully');
        setConnectionStatus(response.data.connections);
      } else {
        setError(response.data.error || 'Failed to initialize exchange connectors');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle agent trading
  const toggleAgentTrading = (enabled: boolean) => {
    setAgentTradingEnabled(enabled);
  };
  
  // Get status badge component
  const getStatusBadge = (isConnected: boolean) => {
    if (isConnected) {
      return <Badge variant="success">Connected</Badge>;
    } else {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
  };
  
  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <h2 className="text-xl font-bold">Exchange Connectors</h2>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Enable Agent Trading:</span>
            <Switch
              checked={agentTradingEnabled}
              onCheckedChange={toggleAgentTrading}
            />
          </div>
          
          <Button
            onClick={initializeConnectors}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" size="sm" />
                Initializing...
              </>
            ) : 'Initialize Test Connectors'}
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <p>{error}</p>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            <p>{success}</p>
          </Alert>
        )}
        
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Exchange</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>API Key</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Object.values(ExchangeType).map((exchange) => (
                <Table.Row key={exchange}>
                  <Table.Cell className="font-medium">{exchange}</Table.Cell>
                  <Table.Cell>
                    {connectionStatus[exchange] !== undefined
                      ? getStatusBadge(connectionStatus[exchange])
                      : 'Not tested'}
                  </Table.Cell>
                  <Table.Cell>
                    {getApiKeyForExchange(exchange)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p><strong>Note:</strong> This panel uses test credentials for demonstration purposes. 
          In a production environment, API keys should be securely stored and never exposed in client-side code.</p>
        </div>
      </div>
    </Card>
  );
}

// Helper function to show partial API keys for display
function getApiKeyForExchange(exchange: string): string {
  const apiKeys: Record<string, string> = {
    [ExchangeType.HYPERLIQUID]: '0xAe93892da6055a6...28dDa2',
    [ExchangeType.COINBASE]: 'ba89aa7d-dc13-460a-962c-...',
    [ExchangeType.OKX]: '19e6ece6-9687-44a4-bb25-...',
    [ExchangeType.BYBIT]: '*****',
    [ExchangeType.BINANCE]: '*****',
    [ExchangeType.KRAKEN]: '*****',
    [ExchangeType.FTX]: '*****'
  };
  
  return apiKeys[exchange] || 'Not provided';
} 