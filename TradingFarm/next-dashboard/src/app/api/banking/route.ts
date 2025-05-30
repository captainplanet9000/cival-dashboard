import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // transactions, balances, vault
    
    // Mock vault/banking data
    const balances = [
      { assetId: 'BTC', symbol: 'Bitcoin', name: 'Bitcoin', balance: 1.25, valueUsd: 62500, change24h: 2.3 },
      { assetId: 'ETH', symbol: 'Ethereum', name: 'Ethereum', balance: 15.8, valueUsd: 47400, change24h: -1.1 },
      { assetId: 'USDT', symbol: 'USDT', name: 'Tether', balance: 25000, valueUsd: 25000, change24h: 0 },
      { assetId: 'SOL', symbol: 'Solana', name: 'Solana', balance: 215.5, valueUsd: 21550, change24h: 5.2 },
      { assetId: 'LINK', symbol: 'Chainlink', name: 'Chainlink', balance: 750, valueUsd: 9750, change24h: 1.8 }
    ];
    
    const transactions = Array.from({ length: 25 }, (_, i) => {
      const assets = ['BTC', 'ETH', 'USDT', 'SOL', 'LINK'];
      const types = ['deposit', 'withdrawal', 'transfer', 'fee', 'interest'];
      const statuses = ['completed', 'pending', 'failed'];
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const txType = types[Math.floor(Math.random() * types.length)];
      const date = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
      
      let amount: number;
      if (asset === 'BTC') {
        amount = Math.random() * 0.5;
      } else if (asset === 'ETH') {
        amount = Math.random() * 5;
      } else if (asset === 'USDT') {
        amount = Math.random() * 5000;
      } else {
        amount = Math.random() * 100;
      }
      
      return {
        id: `tx-${i}-${Date.now()}`,
        userId: userId || '1',
        type: txType,
        asset,
        amount: parseFloat(amount.toFixed(asset === 'USDT' ? 2 : 8)),
        timestamp: date.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        confirmations: txType === 'deposit' ? Math.floor(Math.random() * 50) : null,
        txHash: `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`,
        from: txType === 'deposit' ? `0x${Math.random().toString(16).substring(2, 10)}` : 'Trading Farm',
        to: txType === 'withdrawal' ? `0x${Math.random().toString(16).substring(2, 10)}` : 'Trading Farm',
        fee: parseFloat((amount * 0.001).toFixed(8)),
        notes: ''
      };
    });
    
    const vaultInfo = {
      totalValueUsd: balances.reduce((acc, item) => acc + item.valueUsd, 0),
      securityLevel: 'High',
      multisigEnabled: true,
      requiredSignatures: 2,
      coldStorage: {
        percentage: 80,
        lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      hotWallet: {
        percentage: 20,
        rebalanceThreshold: 100000
      },
      insuranceFund: {
        valueUsd: 50000,
        coverageDetails: 'Up to $75,000 per account'
      },
      stakingRewards: {
        enabled: true,
        apr: 4.5,
        nextDistribution: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
    
    if (type === 'transactions') {
      return NextResponse.json({ transactions });
    } else if (type === 'balances') {
      return NextResponse.json({ balances });
    } else if (type === 'vault') {
      return NextResponse.json({ vaultInfo });
    } else {
      // If no specific type is requested, return all data
      return NextResponse.json({
        balances,
        transactions: transactions.slice(0, 5), // Only return recent transactions
        vaultInfo
      });
    }
  } catch (error) {
    console.error('Banking API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banking data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Required fields for different transaction types
    if (!data.type || !data.asset || data.amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate transaction type
    const validTypes = ['deposit', 'withdrawal', 'transfer', 'allocation'];
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }
    
    // Mock transaction processing
    const transactionId = `tx-${Date.now()}`;
    const mockTransaction = {
      id: transactionId,
      userId: data.userId || '1',
      type: data.type,
      asset: data.asset,
      amount: parseFloat(data.amount),
      timestamp: new Date().toISOString(),
      status: data.type === 'withdrawal' ? 'pending' : 'completed',
      confirmations: 0,
      txHash: data.type === 'deposit' || data.type === 'withdrawal' 
        ? `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`
        : null,
      from: data.from || 'Trading Farm',
      to: data.to || 'Trading Farm',
      fee: parseFloat((data.amount * 0.001).toFixed(8)),
      notes: data.notes || ''
    };
    
    return NextResponse.json({
      success: true,
      transaction: mockTransaction,
      message: data.type === 'withdrawal' 
        ? 'Withdrawal initiated and pending approval'
        : `${data.type} processed successfully`
    });
  } catch (error) {
    console.error('Banking transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction' },
      { status: 500 }
    );
  }
}
