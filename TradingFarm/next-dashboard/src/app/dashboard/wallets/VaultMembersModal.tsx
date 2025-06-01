"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

interface VaultMember {
  id: string;
  user_id: string;
  role: string;
  added_by: string;
  created_at: string;
}

export function VaultMembersModal({
  open,
  onOpenChange,
  vaultId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultId: string;
}) {
  const [members, setMembers] = useState<VaultMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [addForm, setAddForm] = useState({ user_id: "", role: "member" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/vaults/members?vault_id=${vaultId}`)
      .then(r => r.json())
      .then(data => setMembers(data.members || []))
      .catch(() => toast({ variant: "destructive", title: "Error", description: "Failed to fetch members" }))
      .finally(() => setLoading(false));
  }, [open, vaultId]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/vaults/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault_id: vaultId,
          user_id: addForm.user_id,
          role: addForm.role,
          added_by: "me", // TODO: Replace with real user id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      toast({ title: "Member added" });
      setAddForm({ user_id: "", role: "member" });
      setMembers(m => [...m, data.member]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setAdding(false);
    }
  };

  const [removingId, setRemovingId] = useState<string | null>(null);
  const handleRemove = async (user_id: string) => {
    setRemovingId(user_id);
    try {
      const res = await fetch("/api/vaults/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_id: vaultId, user_id, removed_by: "me" }), // TODO: Replace with real user id
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");
      toast({ title: "Member removed" });
      setMembers(m => m.filter(mem => mem.user_id !== user_id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vault Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.user_id} className="flex items-center justify-between border-b pb-1">
                  <span className="font-mono text-xs">{m.user_id}</span>
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                  <Button size="xs" variant="ghost" onClick={() => handleRemove(m.user_id)} disabled={removingId === m.user_id}>
                    {removingId === m.user_id ? "Removing..." : "Remove"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 items-end">
            <Input
              placeholder="User ID"
              value={addForm.user_id}
              onChange={e => setAddForm(f => ({ ...f, user_id: e.target.value }))}
            />
            <Input
              placeholder="Role (member, admin, signer)"
              value={addForm.role}
              onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
            />
            <Button onClick={handleAdd} loading={adding} disabled={adding}>
              Add
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
