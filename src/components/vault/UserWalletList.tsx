// src/components/vault/UserWalletList.tsx
'use client';

import Link from 'next/link';
import { type Wallet } from '@/lib/clients/apiClient'; // Assuming Wallet type is exported from apiClient
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Assuming shadcn/ui path
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UserWalletListProps {
  wallets: Wallet[];
}

export function UserWalletList({ wallets }: UserWalletListProps) {
  if (!wallets || wallets.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">
          No wallets found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wallets.map((wallet) => (
        <Card key={wallet.wallet_id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg break-all">
                Wallet ID: {wallet.wallet_id.substring(0, 8)}...
              </CardTitle>
              <Badge 
                variant={wallet.status === 'active' ? 'default' : 'secondary'}
                className={wallet.status === 'active' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}
              >
                {wallet.status}
              </Badge>
            </div>
            <CardDescription>Currency: {wallet.currency}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-2xl font-bold">
              {/* Ensure balance is treated as number and formatted */}
              {typeof wallet.balance === 'string' ? parseFloat(wallet.balance).toFixed(2) : Number(wallet.balance).toFixed(2)}
              <span className="text-sm text-muted-foreground ml-1">{wallet.currency}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(wallet.updated_at).toLocaleDateString()}
            </p>
          </CardContent>
          <CardFooter>
            <Link href={`/dashboard/vault/wallets/${wallet.wallet_id}/transactions`} passHref legacyBehavior>
              <Button asChild variant="outline" className="w-full">
                <a>View Transactions</a>
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
