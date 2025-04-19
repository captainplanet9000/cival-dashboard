"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, ShieldCheck, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function VaultsPage() {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/vaults")
      .then(r => r.json())
      .then(data => setVaults(data.vaults || []))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vault");
      toast({ title: "Vault created", description: data.vault?.name });
      setCreateDialog(false);
      setForm({ name: "", description: "" });
      setVaults(v => [...v, data.vault]);
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
          <CardTitle className="text-2xl font-semibold">Vaults</CardTitle>
          <Button size="sm" onClick={() => setCreateDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Vault
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : vaults.length === 0 ? (
            <div>No vaults found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vaults.map((vault: any) => (
                <Card key={vault.id} className="border shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{vault.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{vault.description}</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs">Created: {vault.created_at?.slice(0, 10)}</div>
                    <div className="text-xs">Owner: {vault.owner_id}</div>
                    <Button size="xs" onClick={() => window.location.href = `/dashboard/vaults/${vault.id}`}>Open</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Vault Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} loading={creating} disabled={creating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
