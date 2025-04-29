"use client";
import React, { useState } from "react";
import { useAccount, useSendTransaction, useBalance } from "wagmi";
import { usePrepareSendTransaction } from "@/lib/wagmi-mocks";
import { parseEther } from "viem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function MetaMaskTransfer({ walletAddress, onSuccess }: { walletAddress: string; onSuccess?: () => void }) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [to, setTo] = useState(walletAddress || "");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const { config } = usePrepareSendTransaction({
    to,
    value: amount ? parseEther(amount) : undefined,
    enabled: !!to && !!amount,
  });
  const { sendTransaction } = useSendTransaction({
    ...config,
    onSuccess: (data) => {
      toast({ title: "Transaction sent", description: data.hash });
      setAmount("");
      onSuccess?.();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return (
    <div className="mb-4 p-4 border rounded-xl bg-muted/20 flex flex-col gap-2">
      <div className="font-semibold">Send ETH from MetaMask</div>
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Recipient address"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Amount (ETH)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-32"
          type="number"
        />
        <Button
          onClick={() => {
            setSending(true);
            sendTransaction?.();
            setSending(false);
          }}
          disabled={!isConnected || !to || !amount || sending}
        >
          Send
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        Connected: <span className="font-mono">{address}</span> | Balance: {balance?.formatted} ETH
      </div>
    </div>
  );
}
