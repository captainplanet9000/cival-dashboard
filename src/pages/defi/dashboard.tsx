import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { ProtocolType, ProtocolCategory } from '@/types/defi-protocol-types';
import { ProtocolServiceFactory } from '@/services/defi/protocol-service-factory';
import ProtocolCard from '@/components/defi/ProtocolCard';

// Work around TypeScript import issues with UI components
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
);

const Badge = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <span className={`text-xs px-2 py-1 rounded-full ${className}`}>{children}</span>
);

const Button = ({ 
  children, 
  className = '', 
  variant = 'default',
  onClick 
}: { 
  children: React.ReactNode, 
  className?: string,
  variant?: 'default' | 'outline',
  onClick?: () => void
}) => (
  <button 
    className={`px-4 py-2 rounded-md ${variant === 'default' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'} ${className}`}
    onClick={onClick}
  >
    {children}
  </button>
);

export default function DefiDashboard() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProtocolCategory | 'all'>('all');
  const [connectedProtocols, setConnectedProtocols] = useState<ProtocolType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load all protocols metadata
  useEffect(() => {
    const loadProtocols = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would be fetched from an API
        const allProtocols = await ProtocolServiceFactory.getAllProtocolsMetadata();
        setProtocols(allProtocols);
      } catch (err: any) {
        console.error('Error loading protocols:', err);
        setError(err.message || 'Failed to load protocols');
      } finally {
        setLoading(false);
      }
    };
    
    loadProtocols();
  }, []);
  
  // Handle protocol card click
  const handleProtocolClick = (protocolId: ProtocolType) => {
    const isConnected = connectedProtocols.includes(protocolId);
    
    if (isConnected) {
      // Navigate to protocol detail page
      router.push(`/defi/protocols/${protocolId}`);
    } else {
      // Mock connecting to the protocol
      setConnectedProtocols(prev => [...prev, protocolId]);
      
      // In a real implementation, this would trigger wallet connection and protocol authentication
      console.log(`Connecting to ${protocolId}...`);
    }
  };
  
  // Filter protocols by category
  const filteredProtocols = selectedCategory === 'all'
    ? protocols
    : protocols.filter(protocol => protocol.category === selectedCategory);
  
  // Get unique categories from protocols
  const categories = ['all', ...new Set(protocols.map(p => p.category))];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">DeFi Protocol Dashboard</h1>
        <div className="space-x-2">
          {connectedProtocols.length > 0 && (
            <Badge className="bg-green-100 text-green-800">
              {connectedProtocols.length} Connected
            </Badge>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error: {error}
        </div>
      )}
      
      {/* Category Filter */}
      <Card className="mb-8 p-4">
        <h2 className="text-lg font-semibold mb-4">Filter by Category</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button 
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category as ProtocolCategory | 'all')}
              className="text-sm"
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>
      </Card>
      
      {/* Protocols Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {filteredProtocols.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No protocols found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProtocols.map(protocol => (
                <ProtocolCard
                  key={protocol.id}
                  id={protocol.id}
                  name={protocol.name}
                  category={protocol.category}
                  description={protocol.description}
                  chains={protocol.chains}
                  logoUrl={`/images/protocols/${protocol.id}.svg`}
                  stats={{
                    tvlUSD: protocol.tvlUSD || protocol.stats?.tvlUSD,
                    volume24h: protocol.volume24h || protocol.stats?.volume24h
                  }}
                  isConnected={connectedProtocols.includes(protocol.id)}
                  onClick={handleProtocolClick}
                />
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Connected Protocols Section */}
      {connectedProtocols.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Your Connected Protocols</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {connectedProtocols.map(protocolId => {
              const protocol = protocols.find(p => p.id === protocolId);
              if (!protocol) return null;
              
              return (
                <ProtocolCard
                  key={protocol.id}
                  id={protocol.id}
                  name={protocol.name}
                  category={protocol.category}
                  description={protocol.description}
                  chains={protocol.chains}
                  logoUrl={`/images/protocols/${protocol.id}.svg`}
                  stats={{
                    tvlUSD: protocol.tvlUSD || protocol.stats?.tvlUSD,
                    volume24h: protocol.volume24h || protocol.stats?.volume24h
                  }}
                  isConnected={true}
                  onClick={handleProtocolClick}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Aggregated Stats */}
      <Card className="mt-12 p-6">
        <h2 className="text-xl font-bold mb-4">Cross-Protocol Analytics</h2>
        <p className="text-gray-500 mb-6">
          Connect to multiple protocols to enable cross-protocol analytics and optimization.
        </p>
        
        {connectedProtocols.length >= 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Best Swap Rates</h3>
              <p>Compare rates across {connectedProtocols.filter(id => 
                protocols.find(p => p.id === id)?.category === ProtocolCategory.DEX
              ).length} DEX protocols</p>
              <Button className="mt-4 w-full text-sm">Analyze Swap Rates</Button>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Lending Opportunities</h3>
              <p>Compare rates across {connectedProtocols.filter(id => 
                protocols.find(p => p.id === id)?.category === ProtocolCategory.LENDING
              ).length} lending protocols</p>
              <Button className="mt-4 w-full text-sm">Find Best Yields</Button>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Trading Fees Comparison</h3>
              <p>Compare fees across {connectedProtocols.filter(id => 
                protocols.find(p => p.id === id)?.category === ProtocolCategory.PERPETUALS || 
                protocols.find(p => p.id === id)?.category === ProtocolCategory.DERIVATIVES
              ).length} trading protocols</p>
              <Button className="mt-4 w-full text-sm">Compare Trading Costs</Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Connect to at least 2 protocols to enable cross-protocol analytics.</p>
          </div>
        )}
      </Card>
    </div>
  );
} 