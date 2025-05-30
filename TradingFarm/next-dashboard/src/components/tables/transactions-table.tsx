'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  FileText, 
  Trash2, 
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/utils/date-utils';

// Transaction type interface
export interface Transaction {
  id: string;
  transaction_date: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE' | 'FEE' | 'INTEREST' | 'TRANSFER' | string;
  amount: number;
  balance_after: number;
  description?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED' | string;
  vault_account_id: string;
  vault_account_name?: string;
  farm_id?: string;
  farm_name?: string;
  external_id?: string;
  reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Props interface for the transactions table
interface TransactionsTableProps {
  transactions: Transaction[];
  title?: string;
  description?: string;
  className?: string;
  isLoading?: boolean;
  onViewDetails?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  showActions?: boolean;
}

/**
 * Transactions table component using DataTable
 * Displays transaction data with appropriate formatting for different transaction types
 */
export function TransactionsTable({
  transactions,
  title = 'Recent Transactions',
  description = 'View and manage transaction history',
  className = '',
  isLoading = false,
  onViewDetails,
  onEdit,
  onDelete,
  showActions = true,
}: TransactionsTableProps) {
  // Get transaction type icon based on type
  const getTransactionTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'DEPOSIT':
        return <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />;
      case 'WITHDRAWAL':
        return <ArrowDownCircle className="h-4 w-4 text-red-500 mr-2" />;
      case 'TRADE':
        return amount >= 0 
          ? <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
          : <TrendingDown className="h-4 w-4 text-red-500 mr-2" />;
      case 'FEE':
        return <RefreshCw className="h-4 w-4 text-amber-500 mr-2" />;
      case 'INTEREST':
        return <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />;
      case 'TRANSFER':
        return <RefreshCw className="h-4 w-4 text-purple-500 mr-2" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500 mr-2" />;
    }
  };

  // Define table columns
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'transaction_date',
      header: 'Date',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.original.transaction_date, 'MMM d, yyyy')}
          <div className="text-xs text-muted-foreground">
            {formatDate(row.original.transaction_date, 'h:mm a')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const { type } = row.original;
        
        return (
          <div className="flex items-center">
            {getTransactionTypeIcon(type)}
            <span>{type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const { amount, type } = row.original;
        const isNegative = amount < 0 || type.toUpperCase() === 'WITHDRAWAL' || type.toUpperCase() === 'FEE';
        const textColor = isNegative ? 'text-red-500' : 'text-green-500';
        
        return (
          <div className={`text-right font-medium ${textColor}`}>
            {isNegative && amount > 0 ? '-' : ''}
            {amount.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </div>
        );
      },
    },
    {
      accessorKey: 'balance_after',
      header: 'Balance',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.original.balance_after.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.description}>
          {row.original.description || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const { status } = row.original;
        
        const getStatusColor = (status: string) => {
          switch (status.toUpperCase()) {
            case 'COMPLETED':
              return 'bg-green-500';
            case 'PENDING':
              return 'bg-amber-500';
            case 'FAILED':
              return 'bg-red-500';
            case 'CANCELLED':
              return 'bg-gray-500';
            default:
              return 'bg-blue-500';
          }
        };
        
        return (
          <Badge className={getStatusColor(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    ...(showActions
      ? [
          {
            id: 'actions',
            cell: ({ row }) => {
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      onClick={() => onViewDetails && onViewDetails(row.original)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(row.original)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    
                    {onDelete && (
                      <DropdownMenuItem onClick={() => onDelete(row.original)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={transactions}
            searchPlaceholder="Search transactions..."
            searchColumn="description"
            defaultSort={[{ id: 'transaction_date', desc: true }]}
          />
        )}
      </CardContent>
    </Card>
  );
}
