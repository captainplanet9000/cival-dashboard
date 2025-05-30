import { supabase } from '../../src/integrations/supabase/client';

/**
 * Seed script for knowledge graph tables
 * 
 * This script creates sample data for:
 * - Knowledge graph nodes (market entities)
 * - Knowledge graph edges (market relationships)
 * 
 * Run using: npx ts-node database/seed/knowledge-graph-seed.ts
 */
async function seedKnowledgeGraph() {
  console.log('Starting knowledge graph data seeding...');
  
  try {
    // Get first user from auth.users table to use as agent
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    const agentId = users && users.length > 0 ? users[0].id : null;
    
    if (!agentId) {
      console.error('No users found in auth.users table. Please create a user first.');
      return;
    }
    
    // Create market entities
    const markets = [
      { symbol: 'BTC/USD', exchange: 'Coinbase', type: 'Cryptocurrency' },
      { symbol: 'ETH/USD', exchange: 'Coinbase', type: 'Cryptocurrency' },
      { symbol: 'BNB/USD', exchange: 'Binance', type: 'Cryptocurrency' },
      { symbol: 'SOL/USD', exchange: 'Binance', type: 'Cryptocurrency' },
      { symbol: 'XRP/USD', exchange: 'Kraken', type: 'Cryptocurrency' },
      { symbol: 'ADA/USD', exchange: 'Kraken', type: 'Cryptocurrency' },
      { symbol: 'AAPL', exchange: 'NASDAQ', type: 'Stock' },
      { symbol: 'MSFT', exchange: 'NASDAQ', type: 'Stock' },
      { symbol: 'GOOGL', exchange: 'NASDAQ', type: 'Stock' },
      { symbol: 'AMZN', exchange: 'NASDAQ', type: 'Stock' },
    ];
    
    // Insert market nodes
    const nodeInserts = [];
    for (const market of markets) {
      const { data, error } = await supabase
        .from('knowledge_graph_nodes')
        .insert({
          agent_id: agentId,
          label: market.symbol,
          type: 'market',
          properties: {
            exchange: market.exchange,
            market_type: market.type,
            symbol: market.symbol,
            description: `${market.symbol} on ${market.exchange}`
          }
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating node for ${market.symbol}:`, error);
      } else {
        console.log(`Created node for ${market.symbol} with ID: ${data.id}`);
        nodeInserts.push(data);
      }
    }
    
    // Create relationships between markets
    const relationships = [
      { source: 'BTC/USD', target: 'ETH/USD', label: 'correlated_with', correlation: 0.85 },
      { source: 'BTC/USD', target: 'BNB/USD', label: 'correlated_with', correlation: 0.72 },
      { source: 'ETH/USD', target: 'SOL/USD', label: 'correlated_with', correlation: 0.68 },
      { source: 'XRP/USD', target: 'ADA/USD', label: 'correlated_with', correlation: 0.56 },
      { source: 'AAPL', target: 'MSFT', label: 'sector_related', sector: 'Technology' },
      { source: 'GOOGL', target: 'MSFT', label: 'competitor', competition_level: 'high' },
      { source: 'AMZN', target: 'AAPL', label: 'market_cap_comparable', diff_percent: 15 },
      { source: 'BTC/USD', target: 'AAPL', label: 'inverse_correlation', correlation: -0.3 },
    ];
    
    // Insert relationship edges
    for (const rel of relationships) {
      const sourceNode = nodeInserts.find(node => node.label === rel.source);
      const targetNode = nodeInserts.find(node => node.label === rel.target);
      
      if (!sourceNode || !targetNode) {
        console.error(`Could not find nodes for relationship ${rel.source} -> ${rel.target}`);
        continue;
      }
      
      const { data, error } = await supabase
        .from('knowledge_graph_edges')
        .insert({
          agent_id: agentId,
          source: sourceNode.id,
          target: targetNode.id,
          label: rel.label,
          properties: {
            ...rel,
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating edge from ${rel.source} to ${rel.target}:`, error);
      } else {
        console.log(`Created edge from ${rel.source} to ${rel.target} with ID: ${data.id}`);
      }
    }
    
    console.log('Knowledge graph seeding completed');
  } catch (error) {
    console.error('Error seeding knowledge graph data:', error);
  }
}

// Run the seed function
seedKnowledgeGraph(); 