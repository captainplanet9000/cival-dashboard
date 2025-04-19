"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { VaultMembersModal } from "../../wallets/VaultMembersModal";

export default function VaultDetailPage() {
  const { vaultId } = useParams();
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberDialog, setMemberDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/vaults?vault_id=${vaultId}`)
      .then(r => r.json())
      .then(data => setVault(data.vaults?.[0] || null))
      .finally(() => setLoading(false));
    // Fetch pending approvals for multi-sig
    fetch(`/api/vaults/approvals?vault_id=${vaultId}`)
      .then(r => r.json())
      .then(data => setApprovals(data.approvals || []));
  }, [vaultId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{vault?.name || "Vault"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground">{vault?.description}</div>
          <div className="flex gap-2">
            <Button onClick={() => setMemberDialog(true)} size="sm">
              <Users className="mr-2 h-4 w-4" /> Members
            </Button>
            <Button onClick={() => setApprovalDialog(true)} size="sm">
              <ShieldCheck className="mr-2 h-4 w-4" /> Approvals
            </Button>
            <Button size="sm">
              <Send className="mr-2 h-4 w-4" /> Withdraw
            </Button>
          </div>
          <div className="text-xs">Created: {vault?.created_at?.slice(0, 10)}</div>
          <div className="text-xs">Owner: {vault?.owner_id}</div>
        </CardContent>
      </Card>
      {/* Vault Members Modal */}
      <VaultMembersModal open={memberDialog} onOpenChange={setMemberDialog} vaultId={vaultId as string} />
      {/* Approval Queue Modal */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approval Queue</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {approvals.length === 0 ? (
              <div className="text-muted-foreground">No pending approvals.</div>
            ) : (
              approvals.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border-b pb-1">
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-xs">{a.status}</span>
                  <Button size="xs" variant="ghost">Approve</Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
