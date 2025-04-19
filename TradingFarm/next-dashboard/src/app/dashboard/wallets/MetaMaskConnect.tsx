"use client";
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export function MetaMaskConnect({ onConnected }: { onConnected?: (address: string) => void }) {
  const { address, isConnected } = useAccount();
  const { connect, isLoading } = useConnect({
    connector: new InjectedConnector(),
    onSuccess(data) {
      toast({ title: 'MetaMask Connected', description: data.account });
      onConnected?.(data.account);
    },
    onError(error) {
      toast({ variant: 'destructive', title: 'MetaMask Error', description: error.message });
    },
  });
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  return (
    <div className="flex flex-col gap-2 items-start">
      {isConnected ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono">{address}</span>
            {balance && (
              <span className="ml-2 text-xs text-muted-foreground">{balance.formatted} {balance.symbol}</span>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={() => disconnect()}>Disconnect</Button>
        </>
      ) : (
        <Button size="sm" onClick={() => connect()} loading={isLoading}>
          Connect MetaMask
        </Button>
      )}
    </div>
  );
}
