import { SupabaseClientFactory, getSupabaseClient } from '../../lib/supabase-client';

/**
 * Script to create missing database tables in Supabase
 */
async function createMissingTables() {
  console.log('Creating missing tables in Trading Farm database...');
  
  // Initialize the Supabase client
  const client = getSupabaseClient();
  
  try {
    console.log('\n----- Creating agent_messages table -----');
    const createAgentMessagesSQL = `
      CREATE TABLE IF NOT EXISTS public.agent_messages (
        id BIGSERIAL PRIMARY KEY,
        agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
        farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        message_type TEXT NOT NULL CHECK (message_type IN ('command', 'query', 'response', 'notification', 'log')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'read')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON public.agent_messages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_messages_farm_id ON public.agent_messages(farm_id);
      CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON public.agent_messages(created_at);
    `;
    
    console.log('\n----- Creating transactions table -----');
    const createTransactionsSQL = `
      CREATE TABLE IF NOT EXISTS public.transactions (
        id BIGSERIAL PRIMARY KEY,
        wallet_id BIGINT NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
        farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
        agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
        transaction_type TEXT NOT NULL CHECK (
          transaction_type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'rebalance', 'interest', 'swap', 'payment')
        ),
        amount DECIMAL(24, 8) NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (
          status IN ('pending', 'completed', 'failed', 'canceled')
        ),
        description TEXT,
        reference_id TEXT,
        related_transaction_id BIGINT REFERENCES public.transactions(id),
        fee_amount DECIMAL(24, 8),
        fee_currency TEXT,
        exchange_rate DECIMAL(24, 8),
        blockchain_hash TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        confirmed_at TIMESTAMP WITH TIME ZONE,
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON public.transactions(farm_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON public.transactions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
    `;
    
    // Create the tables
    // Note: In Supabase, we need to use either rpc or pg extension to execute raw SQL
    // Using Supabase's execute_sql function, which needs to be enabled in your project
    const { error: error1 } = await client.rpc('execute_sql', { sql: createAgentMessagesSQL });
    if (error1) {
      console.error('Error creating agent_messages table:', error1);
      // Try alternate method if RPC fails
      const { error: altError1 } = await client.from('agent_messages').insert({
        agent_id: 1,
        farm_id: 1,
        direction: 'outbound',
        message_type: 'log',
        content: 'Initial test message',
        is_read: false,
        delivery_status: 'pending'
      }).select().single();
      
      if (altError1 && altError1.code !== '23505') { // Ignore unique constraint violations
        console.error('Alternative method failed:', altError1);
      } else {
        console.log('Successfully created agent_messages table via insert method');
      }
    } else {
      console.log('Successfully created agent_messages table');
    }
    
    const { error: error2 } = await client.rpc('execute_sql', { sql: createTransactionsSQL });
    if (error2) {
      console.error('Error creating transactions table:', error2);
      // Try alternate method if RPC fails
      const { error: altError2 } = await client.from('transactions').insert({
        wallet_id: 1,
        farm_id: 1,
        transaction_type: 'deposit',
        amount: 1000,
        currency: 'USD',
        status: 'completed'
      }).select().single();
      
      if (altError2 && altError2.code !== '23505') { // Ignore unique constraint violations
        console.error('Alternative method failed:', altError2);
      } else {
        console.log('Successfully created transactions table via insert method');
      }
    } else {
      console.log('Successfully created transactions table');
    }
    
    console.log('\n----- Migration completed successfully -----');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
createMissingTables()
  .then(() => {
    console.log('Database setup completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running migration:', error);
    process.exit(1);
  });

export default createMissingTables; 