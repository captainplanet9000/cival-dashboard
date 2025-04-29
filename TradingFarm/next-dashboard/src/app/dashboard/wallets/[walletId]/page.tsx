"use client";
import React from "react";
const { useState, useEffect } = React;
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { KeyRound, Users, Send, ShieldCheck, Copy, QrCode } from "lucide-react";
import { MetaMaskConnect } from "../MetaMaskConnect";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { VaultMembersModal } from "../VaultMembersModal";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { MetaMaskTransfer } from "../MetaMaskTransfer";
import { FundTransferModal } from "../FundTransferModal";
import { AssignWalletModal } from "../AssignWalletModal";
import { TransactionHistory } from "../TransactionHistory";

async function fetchWallet(walletId: string) {
  const res = await fetch(`/api/wallets?wallet_id=${walletId}`);
  if (!res.ok) throw new Error("Failed to fetch wallet");
  return (await res.json()).wallets?.[0];
}

async function fetchPermissions(walletId: string) {
  const res = await fetch(`/api/wallets/permissions?wallet_id=${walletId}`);
  if (!res.ok) throw new Error("Failed to fetch permissions");
  return (await res.json()).permissions;
}

export default function WalletDetailPage() {
  // Fetch wallet options for transfer/allocation
  React.useEffect(() => {
    fetch("/api/wallets")
      .then(r => r.json())
      .then(data => {
        setWalletOptions(
          (data.wallets || [])
            .filter((w: any) => w.id !== wallet?.id)
            .map((w: any) => ({ label: w.address, value: w.id, type: w.type }))
        );
      });
    // Fetch assign options (farms, agents, goals)
    Promise.all([
      fetch("/api/farms").then(r => r.json()),
      fetch("/api/agents").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
    ]).then(([farms, agents, goals]) => {
      setAssignOptions([
        ...(farms.farms || []).map((f: any) => ({ label: f.name, value: f.id, type: "farm" })),
        ...(agents.agents || []).map((a: any) => ({ label: a.name, value: a.id, type: "agent" })),
        ...(goals.goals || []).map((g: any) => ({ label: g.name, value: g.id, type: "goal" })),
      ]);
    });
  }, [wallet?.id]);
  const { walletId } = useParams();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialog, setTransferDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [vaultDialog, setVaultDialog] = useState(false);
  const [vaultMemberDialog, setVaultMemberDialog] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [form, setForm] = useState({ to_wallet_id: "", asset: "ETH", amount: "" });
  const [assignForm, setAssignForm] = useState({ type: "farm", id: "" });
  const [permForm, setPermForm] = useState({ user_id: "", role: "viewer" });
  const [vaultForm, setVaultForm] = useState({ name: "", description: "" });
  const [walletOptions, setWalletOptions] = useState<any[]>([]);
  const [assignOptions, setAssignOptions] = useState<any[]>([]);

  useEffect(() => {
    if (!walletId) return;
    setLoading(true);
    fetchWallet(walletId as string)
      .then(setWallet)
      .catch(e => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
    fetchPermissions(walletId as string).then(setPermissions).catch(() => {});
  }, [walletId]);

  const handleTransfer = async () => {
    try {
      const res = await fetch("/api/wallets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_wallet_id: walletId,
          to_wallet_id: form.to_wallet_id,
          asset: form.asset,
          amount: Number(form.amount),
          initiated_by: wallet?.user_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      toast({ title: "Transfer complete" });
      setTransferDialog(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleAssign = async () => {
    try {
      const res = await fetch("/api/wallets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: walletId,
          assigned_to_type: assignForm.type,
          assigned_to_id: assignForm.id,
          assigned_by: wallet?.user_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      toast({ title: "Wallet assigned" });
      setAssignDialog(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handlePermission = async () => {
    try {
      const res = await fetch("/api/wallets/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: walletId,
          user_id: permForm.user_id,
          role: permForm.role,
          granted_by: wallet?.user_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Permission grant failed");
      toast({ title: "Permission granted" });
      setPermissionDialog(false);
      fetchPermissions(walletId as string).then(setPermissions);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleVault = async () => {
    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vaultForm.name,
          description: vaultForm.description,
          owner_id: wallet?.user_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vault creation failed");
      toast({ title: "Vault created" });
      setVaultDialog(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!wallet) return <div>Wallet not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="font-mono">{wallet.address}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => {navigator.clipboard.writeText(wallet.address); toast({ title: "Copied address!" });}}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Address</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setShowQr(s => !s)}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show QR Code</TooltipContent>
              </Tooltip>
              {showQr && (
                <div className="absolute z-50 top-12 left-0 bg-white dark:bg-zinc-900 p-4 shadow-xl rounded-xl border">
                  <QRCode value={wallet.address} size={128} />
                  <div className="text-xs text-center mt-2">{wallet.address}</div>
                  <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowQr(false)}>Close QR</Button>
                </div>
              )}

            </CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">{wallet.chain} • {wallet.type}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaMaskConnect onConnected={addr => toast({ title: "MetaMask connected", description: addr })} />
          <div className="flex gap-2">
            <Button onClick={() => setTransferModal(true)} size="sm">
              <Send className="mr-2 h-4 w-4" /> Transfer / Allocate
            </Button>
            <Button onClick={() => setAssignModal(true)} size="sm">
              <Users className="mr-2 h-4 w-4" /> Assign
            </Button>
            <Button onClick={() => setRoleModal(true)} size="sm">
              <ShieldCheck className="mr-2 h-4 w-4" /> Roles
            </Button>
            <Button onClick={() => setPermissionDialog(true)} size="sm">
              <ShieldCheck className="mr-2 h-4 w-4" /> Permissions
            </Button>
            <Button onClick={() => setVaultDialog(true)} size="sm">
              <KeyRound className="mr-2 h-4 w-4" /> Create Vault
            </Button>
            <Button onClick={() => setVaultMemberDialog(true)} size="sm">
              <Users className="mr-2 h-4 w-4" /> Vault Members
            </Button>
          </div>
          <FundTransferModal
            open={transferModal}
            onOpenChange={setTransferModal}
            fromWalletId={wallet.id}
            options={walletOptions}
            onSuccess={() => { /* Optionally trigger transaction refresh */ }}
          />
          <AssignWalletModal
            open={assignModal}
            onOpenChange={setAssignModal}
            walletId={wallet.id}
            assignOptions={assignOptions}
            onSuccess={() => { /* Optionally refresh wallet info */ }}
          />
          {/* TODO: RoleManagementModal for full role CRUD */}
          <div className="text-xs">Created: {wallet.created_at?.slice(0, 10)}</div>
          <div className="text-xs">Linked Farm: {wallet.farm_id || "-"}</div>
          <div className="text-xs">Linked Agent: {wallet.agent_id || "-"}</div>
          <div className="text-xs">Vault: {wallet.vault_id || "-"}</div>
        </CardContent>
      </Card>
      {/* Transaction History & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History & Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <MetaMaskTransfer walletAddress={wallet.address} onSuccess={() => { /* Optionally trigger a refetch of transactions */ }} />
          <TransactionHistory walletId={wallet.id} />
        </CardContent>
      </Card>

      {/* Vault Members Modal */}
      <VaultMembersModal open={vaultMemberDialog} onOpenChange={setVaultMemberDialog} vaultId={wallet.vault_id || ""} />

      {/* Transfer Modal */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer Funds</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="To Wallet ID" value={form.to_wallet_id} onChange={e => setForm(f => ({ ...f, to_wallet_id: e.target.value }))} />
            <Input placeholder="Asset (e.g. ETH)" value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} />
            <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button onClick={handleTransfer}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Wallet</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Assign to Type (farm, agent, goal)" value={assignForm.type} onChange={e => setAssignForm(f => ({ ...f, type: e.target.value }))} />
            <Input placeholder="Assign to ID" value={assignForm.id} onChange={e => setAssignForm(f => ({ ...f, id: e.target.value }))} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Modal */}
      <Dialog open={permissionDialog} onOpenChange={setPermissionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant Permission</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="User ID" value={permForm.user_id} onChange={e => setPermForm(f => ({ ...f, user_id: e.target.value }))} />
            <Input placeholder="Role (owner, manager, agent, viewer)" value={permForm.role} onChange={e => setPermForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button onClick={handlePermission}>Grant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vault Modal */}
      <Dialog open={vaultDialog} onOpenChange={setVaultDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Vault</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Vault Name" value={vaultForm.name} onChange={e => setVaultForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Description" value={vaultForm.description} onChange={e => setVaultForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button onClick={handleVault}>Create Vault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
