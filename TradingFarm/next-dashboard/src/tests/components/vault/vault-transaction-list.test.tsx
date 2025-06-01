import React from 'react';
import { render, screen } from '@testing-library/react';
import { VaultTransactionList } from '@/components/vault/vault-transaction-list';
import { VaultTransaction, VaultAccount } from '@/types/vault-types';

// Mock data
const mockAccounts: VaultAccount[] = [
  {
    id: 1,
    vault_id: 1,
    name: 'Trading Account',
    account_type: 'trading',
    currency: 'USDT',
    balance: 5000,
    reserved_balance: 0,
    status: 'active',
    created_at: '2023-04-25T10:00:00Z',
    updated_at: '2023-04-25T10:00:00Z',
    last_updated: '2023-04-25T10:00:00Z'
  },
  {
    id: 2,
    vault_id: 1,
    name: 'Reserve Account',
    account_type: 'reserve',
    currency: 'BTC',
    balance: 0.5,
    reserved_balance: 0,
    status: 'active',
    created_at: '2023-04-25T11:00:00Z',
    updated_at: '2023-04-25T11:00:00Z',
    last_updated: '2023-04-25T11:00:00Z'
  }
];

const mockTransactions: VaultTransaction[] = [
  {
    id: 1,
    account_id: 1,
    type: 'deposit',
    amount: 5000,
    currency: 'USDT',
    timestamp: '2023-04-25T10:05:00Z',
    status: 'completed',
    approval_status: 'approved',
    created_at: '2023-04-25T10:05:00Z',
    updated_at: '2023-04-25T10:05:00Z'
  },
  {
    id: 2,
    account_id: 1,
    type: 'withdrawal',
    amount: 1000,
    currency: 'USDT',
    timestamp: '2023-04-26T10:00:00Z',
    status: 'completed',
    approval_status: 'approved',
    created_at: '2023-04-26T10:00:00Z',
    updated_at: '2023-04-26T10:00:00Z'
  },
  {
    id: 3,
    account_id: 1,
    source_account_id: 1,
    destination_account_id: 2,
    type: 'transfer',
    amount: 500,
    currency: 'USDT',
    timestamp: '2023-04-27T10:00:00Z',
    status: 'pending',
    approval_status: 'pending',
    created_at: '2023-04-27T10:00:00Z',
    updated_at: '2023-04-27T10:00:00Z'
  }
];

describe('VaultTransactionList', () => {
  it('renders loading state correctly', () => {
    render(
      <VaultTransactionList
        transactions={[]}
        loading={true}
        accounts={mockAccounts}
        showAccount={true}
      />
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    render(
      <VaultTransactionList
        transactions={[]}
        loading={false}
        accounts={mockAccounts}
        showAccount={true}
      />
    );

    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('renders transactions correctly', () => {
    render(
      <VaultTransactionList
        transactions={mockTransactions}
        loading={false}
        accounts={mockAccounts}
        showAccount={true}
      />
    );

    // Check for transactions in the list
    expect(screen.getByText('deposit')).toBeInTheDocument();
    expect(screen.getByText('withdrawal')).toBeInTheDocument();
    expect(screen.getByText('transfer')).toBeInTheDocument();
    
    // Check for transaction amounts
    expect(screen.getByText('+ $5,000.00 USDT')).toBeInTheDocument();
    expect(screen.getByText('- $1,000.00 USDT')).toBeInTheDocument();
    
    // Check for account names
    expect(screen.getAllByText('Trading Account')).toHaveLength(3);
    
    // Check for status badges
    expect(screen.getAllByText('completed')).toHaveLength(2);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('respects the showAccount prop', () => {
    const { rerender } = render(
      <VaultTransactionList
        transactions={mockTransactions}
        loading={false}
        accounts={mockAccounts}
        showAccount={true}
      />
    );

    // Account column should be visible
    expect(screen.getByText('Account')).toBeInTheDocument();
    
    // Rerender with showAccount=false
    rerender(
      <VaultTransactionList
        transactions={mockTransactions}
        loading={false}
        accounts={mockAccounts}
        showAccount={false}
      />
    );
    
    // Account column should not be visible
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
  });

  it('respects the limit prop', () => {
    render(
      <VaultTransactionList
        transactions={mockTransactions}
        loading={false}
        accounts={mockAccounts}
        showAccount={true}
        limit={2}
      />
    );

    // Only 2 transactions should be rendered (from the top of the array)
    expect(screen.getByText('deposit')).toBeInTheDocument();
    expect(screen.getByText('withdrawal')).toBeInTheDocument();
    expect(screen.queryByText('transfer')).not.toBeInTheDocument();
  });
});
