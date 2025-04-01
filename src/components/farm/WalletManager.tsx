import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database } from '@/types/database.types';
import { useFarm } from '@/hooks/useFarm';

type Wallet = Database['public']['Tables']['farm_wallets']['Row'] & {
  agent_wallets?: Database['public']['Tables']['agent_wallets']['Row'][];
};

interface WalletManagerProps {
  farmId: string;
  supabaseUrl: string;
  supabaseKey: string;
  wallets?: Wallet[];
  onWalletCreated?: (wallet: Wallet) => void;
  onWalletDeleted?: (walletId: string) => void;
}

export function WalletManager({
  farmId,
  supabaseUrl,
  supabaseKey,
  wallets = [],
  onWalletCreated,
  onWalletDeleted,
}: WalletManagerProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    chainId: 1, // Default to Ethereum mainnet
  });

  const { createFarmWallet, deleteFarmWallet } = useFarm({
    farmId,
    supabaseUrl,
    supabaseKey,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { success, data } = await createFarmWallet({
        farmId,
        name: formData.name,
        address: formData.address,
        chainId: formData.chainId,
      });

      if (success && data) {
        onWalletCreated?.(data);
        setFormData({ name: '', address: '', chainId: 1 });
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    try {
      const { success, error } = await deleteFarmWallet(walletId);
      if (success) {
        onWalletDeleted?.(walletId);
      } else {
        console.error('Failed to delete wallet:', error);
      }
    } catch (error) {
      console.error('Failed to delete wallet:', error);
    }
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return 'Ethereum';
      case 137:
        return 'Polygon';
      case 56:
        return 'BSC';
      default:
        return `Chain ${chainId}`;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Wallet Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Wallet Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Please enter a valid Ethereum address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chainId">Chain ID</Label>
            <Input
              id="chainId"
              type="number"
              value={formData.chainId}
              onChange={(e) => setFormData({ ...formData, chainId: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>
          <Button type="submit">Add Wallet</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{wallet.name}</h3>
                <p className="text-sm font-mono text-gray-500 truncate">
                  {wallet.address}
                </p>
                <p className="text-sm text-gray-500">
                  Chain: {getChainName(wallet.chain_id)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteWallet(wallet.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
            {wallet.agent_wallets && wallet.agent_wallets.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Agent Allocations</h4>
                <ul className="text-sm space-y-1">
                  {wallet.agent_wallets.map((agentWallet) => (
                    <li key={agentWallet.id}>
                      Agent {agentWallet.agent_id}: {agentWallet.allocation}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {wallet.token_balances && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Token Balances</h4>
                <pre className="text-sm overflow-auto p-2 bg-gray-50 rounded">
                  {JSON.stringify(wallet.token_balances, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 