"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export function AssignWalletModal({ open, onOpenChange, walletId, assignOptions, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  assignOptions: { label: string; value: string; type: string }[];
  onSuccess?: () => void;
}) {
  const [assignToType, setAssignToType] = useState(assignOptions[0]?.type || "farm");
  const [assignToId, setAssignToId] = useState(assignOptions[0]?.value || "");
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const res = await fetch("/api/wallets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: walletId,
          assigned_to_type: assignToType,
          assigned_to_id: assignToId,
          assigned_by: "me", // TODO: Replace with real user id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      toast({ title: "Wallet assigned" });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-xs font-semibold">Assign To</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={assignToId}
            onChange={e => setAssignToId(e.target.value)}
          >
            {assignOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label} ({opt.type})</option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAssign} loading={assigning} disabled={assigning}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
