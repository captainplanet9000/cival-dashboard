// src/components/vault/WalletTransactionList.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { type WalletTransaction } from '@/lib/clients/apiClient'; // Assuming type is exported
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';

interface WalletTransactionListProps {
  transactions: WalletTransaction[];
  page: number;
  limit: number;
  total_count: number;
  walletId: string; 
  walletCurrency: string;
  pageQueryParamName?: string; // Optional: Custom query param name for page
  limitQueryParamName?: string; // Optional: Custom query param name for limit
}

function formatTransactionAmount(transaction: WalletTransaction, currentWalletId: string, currency: string): string {
  let sign = '';
  let amount = Number(transaction.amount); // Ensure amount is number

  if (transaction.type === 'deposit' && transaction.destination_wallet_id === currentWalletId) {
    sign = '+ ';
  } else if (transaction.type === 'withdrawal' && transaction.source_wallet_id === currentWalletId) {
    sign = '- ';
  } else if (transaction.type === 'transfer') {
    if (transaction.destination_wallet_id === currentWalletId) {
      sign = '+ '; // Transfer in
    } else if (transaction.source_wallet_id === currentWalletId) {
      sign = '- '; // Transfer out
    }
  }
  // If sign is still empty, it's a transaction not directly involving this wallet as source or primary destination (e.g. fee for other wallet)
  // or an unknown case. For now, default to no sign for such cases or consider how to display.
  // For this component, we assume transactions are already filtered for the current wallet.
  
  return `${sign}${amount.toFixed(2)} ${currency}`;
}

function getTransactionTypeIcon(type: WalletTransaction['type']) {
    switch (type) {
        case 'deposit':
            return <ArrowDownLeft className="h-4 w-4 text-green-500 mr-2" />;
        case 'withdrawal':
            return <ArrowUpRight className="h-4 w-4 text-red-500 mr-2" />;
        case 'transfer':
            return <ArrowLeftRight className="h-4 w-4 text-blue-500 mr-2" />;
        default:
            return <DollarSign className="h-4 w-4 text-gray-500 mr-2" />;
    }
}


export function WalletTransactionList({
  transactions,
  page,
  limit,
  total_count,
  walletId,
  walletCurrency,
  pageQueryParamName = 'page', // Default to 'page'
  limitQueryParamName = 'limit', // Default to 'limit'
}: WalletTransactionListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">
          No transactions found for this wallet.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total_count / limit);

  const handlePreviousPage = () => {
    if (page > 1) {
      const params = new URLSearchParams(searchParams);
      params.set(pageQueryParamName, (page - 1).toString());
      // Preserve other query params if necessary, though this example doesn't explicitly do so
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      const params = new URLSearchParams(searchParams);
      params.set(pageQueryParamName, (page + 1).toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date/Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.transaction_id}>
              <TableCell>
                {new Date(tx.transaction_timestamp).toLocaleString()}
              </TableCell>
              <TableCell className="capitalize flex items-center">
                {getTransactionTypeIcon(tx.type as WalletTransaction['type'])}
                {tx.type}
              </TableCell>
              <TableCell>{tx.description}</TableCell>
              <TableCell className="text-right font-medium">
                {formatTransactionAmount(tx, walletId, walletCurrency)}
              </TableCell>
              <TableCell>
                <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}
                  className={
                    tx.status === 'completed' ? 'bg-green-500 text-white' :
                    tx.status === 'pending' ? 'bg-yellow-500 text-white' :
                    tx.status === 'failed' ? 'bg-red-500 text-white' :
                    'bg-gray-500 text-white'
                  }
                >
                  {tx.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
