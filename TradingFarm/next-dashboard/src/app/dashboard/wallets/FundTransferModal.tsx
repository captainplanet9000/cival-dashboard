"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";

export function FundTransferModal({ open, onOpenChange, fromWalletId, options, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromWalletId: string;
  options: { label: string; value: string; type: "user" | "farm" | "agent" | "vault" | "goal" }[];
  onSuccess?: () => void;
}) {
  const [to, setTo] = useState(options[0]?.value || "");
  const [amount, setAmount] = useState("");
  const [sliderValue, setSliderValue] = useState(0);
  const [transferring, setTransferring] = useState(false);

  const handleTransfer = async () => {
    setTransferring(true);
    try {
      const res = await fetch("/api/wallets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_wallet_id: fromWalletId,
          to_wallet_id: to,
          asset: "ETH", // TODO: Make dynamic
          amount: Number(amount),
          initiated_by: "me", // TODO: Replace with real user id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      toast({ title: "Transfer complete" });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fund Transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-xs font-semibold">Transfer To</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={to}
            onChange={e => setTo(e.target.value)}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label} ({opt.type})</option>
            ))}
          </select>
          <label className="block text-xs font-semibold">Amount</label>
          <Input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <label className="block text-xs font-semibold">Quick Allocate</label>
          <Slider min={0} max={100} value={sliderValue} onValueChange={v => setSliderValue(v)} />
          <div className="text-xs text-muted-foreground">Slider: {sliderValue}% of max allocation (connect to balance)</div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleTransfer} loading={transferring} disabled={transferring}>
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
