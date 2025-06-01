"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, KeyRound, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

// Fetch wallets from API
async function fetchWallets() {
  const res = await fetch("/api/wallets");
  if (!res.ok) throw new Error("Failed to fetch wallets");
  return (await res.json()).wallets;
}

export default function WalletsPage() {
  const { data: wallets, isLoading, error, refetch } = useQuery({
    queryKey: ["wallets"],
    queryFn: fetchWallets,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ address: "", chain: "ethereum", type: "metamask" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create wallet");
      toast({ title: "Wallet created", description: data.wallet?.address });
      setDialogOpen(false);
      refetch();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-semibold">Wallets</CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Wallet
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error.message}</div>
          ) : wallets && wallets.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((wallet: any) => (
                <Card key={wallet.id} className="border shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{wallet.address}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{wallet.chain} • {wallet.type}</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs">Created: {wallet.created_at?.slice(0, 10)}</div>
                    <div className="text-xs">Linked Farm: {wallet.farm_id || "-"}</div>
                    <div className="text-xs">Linked Agent: {wallet.agent_id || "-"}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div>No wallets found.</div>
          )}
        </CardContent>
      </Card>

      {/* Add Wallet Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Wallet Address"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
            <Input
              placeholder="Chain (e.g. ethereum)"
              value={form.chain}
              onChange={e => setForm(f => ({ ...f, chain: e.target.value }))}
            />
            <Input
              placeholder="Type (e.g. metamask, vault, external)"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} loading={creating} disabled={creating}>
              Add Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
