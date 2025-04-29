import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { decryptApiCredentials } from '@/utils/crypto';
import { RebalancingService } from '@/utils/trading/rebalancing-service';

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get transaction IDs from request
    const { transactionIds } = await req.json();
    
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'No transaction IDs provided' },
        { status: 400 }
      );
    }
    
    // Get the transactions
    const { data: transactions, error: txError } = await supabase
      .from('rebalancing_transactions')
      .select(`
        *,
        portfolios(id, name, user_id, rebalancing_frequency),
        strategies(id, name, exchange, market)
      `)
      .in('id', transactionIds)
      .eq('status', 'pending');
    
    if (txError) {
      console.error('Error fetching transactions:', txError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }
    
    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No pending transactions found with the provided IDs' },
        { status: 404 }
      );
    }
    
    // Verify all transactions belong to the user
    const unauthorized = transactions.some(
      (tx) => tx.portfolios?.user_id !== session.user.id
    );
    
    if (unauthorized) {
      return NextResponse.json(
        { error: 'Unauthorized to execute one or more transactions' },
        { status: 403 }
      );
    }
    
    // Update transactions to processing status
    const { error: updateError } = await supabase
      .from('rebalancing_transactions')
      .update({ status: 'processing' })
      .in('id', transactionIds);
    
    if (updateError) {
      console.error('Error updating transactions to processing status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction status' },
        { status: 500 }
      );
    }
    
    // Group transactions by exchange to minimize API calls
    const exchangeTransactions: Record<string, any[]> = {};
    
    for (const tx of transactions) {
      const exchange = tx.strategies?.exchange;
      if (!exchange) continue;
      
      if (!exchangeTransactions[exchange]) {
        exchangeTransactions[exchange] = [];
      }
      
      exchangeTransactions[exchange].push(tx);
    }
    
    // Execute transactions for each exchange
    const results = [];
    
    for (const [exchange, txs] of Object.entries(exchangeTransactions)) {
      try {
        // Get exchange credentials
        const { data: credentials, error: credError } = await supabase
          .from('exchange_credentials')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('exchange', exchange)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (credError || !credentials) {
          console.error(`Error fetching credentials for ${exchange}:`, credError);
          
          // Mark these transactions as failed
          for (const tx of txs) {
            await supabase
              .from('rebalancing_transactions')
              .update({ 
                status: 'failed',
                error_message: `No active credentials found for ${exchange}`
              })
              .eq('id', tx.id);
          }
          
          results.push({
            exchange,
            success: false,
            error: `No active credentials found for ${exchange}`,
            transactionIds: txs.map(tx => tx.id)
          });
          
          continue;
        }
        
        // Decrypt API credentials
        const apiKeyData = JSON.parse(credentials.api_key_encrypted);
        const apiSecretData = JSON.parse(credentials.api_secret_encrypted);
        const { apiKey, apiSecret } = decryptApiCredentials(apiKeyData, apiSecretData);
        
        console.log(`Executing ${txs.length} transactions on ${exchange}`);
        
        const executionResults = await RebalancingService.executeBatch(
          txs,
          [{ exchange, apiKey, apiSecret }]
        );
        
        // Process results
        const txResults = executionResults.map(result => {
          return {
            transactionId: result.transactionId,
            success: result.success,
            orderId: result.orderId,
            executionPrice: result.executionPrice,
            executionQuantity: result.executionQuantity,
            fee: result.fee,
            error: result.message
          };
        });
        
        results.push({
          exchange,
          success: true,
          results: txResults
        });
      } catch (error) {
        console.error(`Error processing ${exchange} transactions:`, error);
        
        // Mark all transactions for this exchange as failed
        for (const tx of txs) {
          await supabase
            .from('rebalancing_transactions')
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', tx.id);
        }
        
        results.push({
          exchange,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          transactionIds: txs.map(tx => tx.id)
        });
      }
    }
    
    // Update last_rebalanced for all affected portfolios
    const portfolioIds = [...new Set(transactions.map(tx => tx.portfolio_id))];
    
    for (const portfolioId of portfolioIds) {
      await supabase
        .from('portfolios')
        .update({ 
          last_rebalanced: new Date().toISOString(),
          rebalance_notification: false,
          next_rebalance: calculateNextRebalanceDate(portfolioId, transactions)
        })
        .eq('id', portfolioId);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transactions executed',
      results
    });
  } catch (error) {
    console.error('Error executing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to execute transactions' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next rebalance date based on portfolio frequency
function calculateNextRebalanceDate(portfolioId: string, transactions: any[]): string | null {
  // Get the portfolio's rebalancing frequency
  const portfolio = transactions.find(tx => tx.portfolio_id === portfolioId)?.portfolios;
  if (!portfolio) return new Date().toISOString(); // Default to now if not found
  
  const now = new Date();
  let nextRebalance = new Date(now);
  
  // Calculate next rebalance date based on frequency
  switch (portfolio.rebalancing_frequency) {
    case 'daily':
      nextRebalance.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      nextRebalance.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      nextRebalance.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      nextRebalance.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
      nextRebalance.setFullYear(now.getFullYear() + 1);
      break;
    case 'threshold':
    case 'manual':
      // For threshold-based or manual rebalancing, we don't set a specific date
      return null;
    default:
      nextRebalance.setMonth(now.getMonth() + 1); // Default to monthly
  }
  
  return nextRebalance.toISOString();
}
