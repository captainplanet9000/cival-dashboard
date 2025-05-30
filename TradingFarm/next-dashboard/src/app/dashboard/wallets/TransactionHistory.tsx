"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeader, TableCell, TableBody } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

export function TransactionHistory({ walletId }: { walletId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wallets/transactions?wallet_id=${walletId}`)
      .then(r => r.json())
      .then(data => {
        setTransactions(data.transactions || []);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [walletId]);

  // Simple P&L and gas analytics
  let pnl = 0;
  let gas = 0;
  transactions.forEach(tx => {
    if (tx.from_wallet_id === walletId) pnl -= Number(tx.amount);
    if (tx.to_wallet_id === walletId) pnl += Number(tx.amount);
    gas += Number(tx.gas_used || 0);
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-8 items-center">
        <div className="text-green-600 font-bold">P&L: {pnl.toFixed(4)}</div>
        <div className="text-blue-600 font-bold">Gas Used: {gas}</div>
      </div>
      <Card>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="text-muted-foreground">No transactions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.created_at?.slice(0, 19).replace("T", " ")}</TableCell>
                    <TableCell>
                      {tx.from_wallet_id === walletId ? (
                        <span className="flex items-center text-red-600"><ArrowUpRight className="h-4 w-4 mr-1" /> Sent</span>
                      ) : (
                        <span className="flex items-center text-green-600"><ArrowDownLeft className="h-4 w-4 mr-1" /> Received</span>
                      )}
                    </TableCell>
                    <TableCell>{tx.asset}</TableCell>
                    <TableCell>{tx.amount}</TableCell>
                    <TableCell className="font-mono text-xs">{tx.from_wallet_id}</TableCell>
                    <TableCell className="font-mono text-xs">{tx.to_wallet_id}</TableCell>
                    <TableCell>{tx.status || "confirmed"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
