'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Eye } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  profit_loss: number;
  profit_loss_percent: number;
  timestamp: string;
}

interface TradeHistoryTableProps {
  trades: Trade[];
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  // Format timestamp to a readable format
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>P/L</TableHead>
            <TableHead>P/L %</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                No trades found
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${
                      trade.side === 'BUY' 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}
                  >
                    {trade.side}
                  </Badge>
                </TableCell>
                <TableCell>{trade.amount.toFixed(6)}</TableCell>
                <TableCell>${trade.price.toFixed(2)}</TableCell>
                <TableCell className={trade.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${trade.profit_loss.toFixed(2)}
                </TableCell>
                <TableCell className={trade.profit_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {trade.profit_loss_percent.toFixed(2)}%
                </TableCell>
                <TableCell>{formatDate(trade.timestamp)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
