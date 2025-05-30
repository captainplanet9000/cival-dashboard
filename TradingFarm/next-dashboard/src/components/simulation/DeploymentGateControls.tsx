"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, Rocket, AlertTriangle, CheckCircle, AlertCircle, 
  PlayCircle, LockIcon, RefreshCw, ArrowRight, Cpu,
  CheckIcon, ExternalLink, Hourglass, ClipboardCheck 
} from "lucide-react";

interface DeploymentGateControlsProps {
  agent?: {
    id: string;
    name: string;
    version: string;
    status: "pending" | "approved" | "deployed" | "rejected";
    readiness: number;
    readinessChecks: {
      id: string;
      name: string;
      status: "passed" | "failed" | "pending";
      description: string;
      details?: string;
    }[];
    deploymentEnvironments: {
      id: string;
      name: string;
      status: "available" | "unavailable" | "deployed";
      description: string;
    }[];
    approvals: {
      role: string;
      status: "pending" | "approved" | "rejected";
      approver?: string;
      timestamp?: string;
      notes?: string;
    }[];
  };
  onApprove?: (agentId: string, notes: string) => void;
  onReject?: (agentId: string, reason: string) => void;
  onDeploy?: (agentId: string, environmentId: string) => void;
  onRunReadinessChecks?: (agentId: string) => void;
}

export function DeploymentGateControls({
  agent,
  onApprove,
  onReject,
  onDeploy,
  onRunReadinessChecks
}: DeploymentGateControlsProps) {
  // Default agent data if none provided
  const defaultAgent = {
    id: "agent-123",
    name: "Momentum Trader v1.5",
    version: "1.5.0",
    status: "pending",
    readiness: 75,
    readinessChecks: [
      {
        id: "check-1",
        name: "Performance Metrics",
        status: "passed",
        description: "Verify agent meets minimum performance requirements",
        details: "All performance metrics exceed thresholds. Sharpe ratio: 1.85, Win rate: 62.3%, Max drawdown: 12.8%"
      },
      {
        id: "check-2",
        name: "Backtesting Results",
        status: "passed",
        description: "Verify agent has been thoroughly backtested",
        details: "Backtested on 5 years of historical data across 3 market regimes. All tests passed."
      },
      {
        id: "check-3",
        name: "Risk Assessment",
        status: "pending",
        description: "Evaluate risk profile and exposure limits",
        details: "Awaiting final risk assessment review."
      },
      {
        id: "check-4",
        name: "Documentation",
        status: "failed",
        description: "Verify all required documentation is complete",
        details: "Missing deployment guide and parameter descriptions."
      },
      {
        id: "check-5",
        name: "Compliance Check",
        status: "passed",
        description: "Verify agent meets all compliance requirements",
        details: "All compliance checks passed. Agent adheres to trading guidelines."
      }
    ],
    deploymentEnvironments: [
      {
        id: "env-1",
        name: "Development",
        status: "available",
        description: "Testing environment with simulated market data"
      },
      {
        id: "env-2",
        name: "Staging",
        status: "available",
        description: "Pre-production environment with real market data but paper trading"
      },
      {
        id: "env-3",
        name: "Production",
        status: "unavailable",
        description: "Live trading environment with real market data and capital"
      },
      {
        id: "env-4",
        name: "Paper Trading",
        status: "available",
        description: "Paper trading with real market data but no real capital"
      }
    ],
    approvals: [
      {
        role: "Strategy Manager",
        status: "approved",
        approver: "Jane Smith",
        timestamp: "2025-04-10T14:30:00.000Z",
        notes: "Strategy looks solid. Good risk-adjusted returns."
      },
      {
        role: "Risk Officer",
        status: "pending",
        approver: "",
        timestamp: "",
        notes: ""
      },
      {
        role: "Compliance Officer",
        status: "approved",
        approver: "Michael Chen",
        timestamp: "2025-04-11T09:15:00.000Z",
        notes: "All compliance checks passed."
      }
    ]
  };
  
  const agentData = agent || defaultAgent;
  
  // State for approvals
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState("");
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle approve
  const handleApprove = () => {
    if (onApprove) {
      onApprove(agentData.id, approvalNotes);
    }
    setShowApproveDialog(false);
    setApprovalNotes("");
  };
  
  // Handle reject
  const handleReject = () => {
    if (onReject) {
      onReject(agentData.id, rejectionReason);
    }
    setShowRejectDialog(false);
    setRejectionReason("");
  };
  
  // Handle deploy
  const handleDeploy = () => {
    if (onDeploy && selectedEnvironment) {
      onDeploy(agentData.id, selectedEnvironment);
    }
    setShowDeployDialog(false);
    setSelectedEnvironment("");
  };
  
  // Run readiness checks
  const handleRunReadinessChecks = () => {
    if (onRunReadinessChecks) {
      onRunReadinessChecks(agentData.id);
    }
  };
  
  // Get status badge
  const getStatusBadge = () => {
    switch (agentData.status) {
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Approved
          </Badge>
        );
      case "deployed":
        return (
          <Badge className="bg-blue-500">
            <Rocket className="h-3.5 w-3.5 mr-1" />
            Deployed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Hourglass className="h-3.5 w-3.5 mr-1" />
            Pending Approval
          </Badge>
        );
    }
  };
  
  // Get check status icon
  const getCheckStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Hourglass className="h-4 w-4 text-amber-500" />;
    }
  };
  
  // Calculate failed and pending checks
  const failedChecks = agentData.readinessChecks.filter(check => check.status === "failed").length;
  const pendingChecks = agentData.readinessChecks.filter(check => check.status === "pending").length;
  
  // Determine if deployment can proceed
  const canDeploy = agentData.status === "approved" && failedChecks === 0 && pendingChecks === 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Deployment Gate</CardTitle>
            <CardDescription>
              Validation and approval process for agent deployment
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{agentData.name}</h3>
            <p className="text-sm text-muted-foreground">Version {agentData.version}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRunReadinessChecks}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Checks
            </Button>
            
            {agentData.status === "pending" && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            
            {canDeploy && (
              <Button 
                size="sm"
                onClick={() => setShowDeployDialog(true)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Deployment Readiness</span>
            </Label>
            <span className="text-sm font-medium">{agentData.readiness}%</span>
          </div>
          <Progress value={agentData.readiness} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Checks Passed: {agentData.readinessChecks.filter(check => check.status === "passed").length}/{agentData.readinessChecks.length}</span>
            <div className="flex gap-3">
              <span className="text-amber-500">Pending: {pendingChecks}</span>
              <span className="text-red-500">Failed: {failedChecks}</span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="readiness">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="readiness">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Readiness Checks
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <Shield className="h-4 w-4 mr-2" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="environments">
              <Cpu className="h-4 w-4 mr-2" />
              Environments
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="readiness" className="space-y-4 pt-4">
            {failedChecks > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed Checks</AlertTitle>
                <AlertDescription>
                  This agent has {failedChecks} failed readiness checks that must be resolved before deployment.
                </AlertDescription>
              </Alert>
            )}
            
            {pendingChecks > 0 && (
              <Alert variant="warning" className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                <Hourglass className="h-4 w-4" />
                <AlertTitle>Pending Checks</AlertTitle>
                <AlertDescription>
                  This agent has {pendingChecks} pending readiness checks that must be completed before deployment.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3">
              {agentData.readinessChecks.map((check) => (
                <div 
                  key={check.id} 
                  className={`p-3 rounded-md border ${
                    check.status === 'passed' ? 'border-green-200 bg-green-50 dark:bg-green-900/10' :
                    check.status === 'failed' ? 'border-red-200 bg-red-50 dark:bg-red-900/10' :
                    'border-amber-200 bg-amber-50 dark:bg-amber-900/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      {getCheckStatusIcon(check.status)}
                      <div>
                        <div className="font-medium">{check.name}</div>
                        <div className="text-sm text-muted-foreground">{check.description}</div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={
                        check.status === 'passed' ? 'text-green-500 border-green-200' :
                        check.status === 'failed' ? 'text-red-500 border-red-200' :
                        'text-amber-500 border-amber-200'
                      }
                    >
                      {check.status}
                    </Badge>
                  </div>
                  {check.details && (
                    <div className="mt-2 text-xs p-2 bg-background/50 rounded border">
                      {check.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="approvals" className="space-y-4 pt-4">
            <div className="space-y-3">
              {agentData.approvals.map((approval, index) => (
                <div 
                  key={index} 
                  className="p-3 rounded-md border"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{approval.role}</div>
                      {approval.approver && (
                        <div className="text-sm text-muted-foreground">
                          {approval.approver} • {formatTimestamp(approval.timestamp || "")}
                        </div>
                      )}
                    </div>
                    <Badge 
                      variant={
                        approval.status === 'approved' ? 'default' :
                        approval.status === 'rejected' ? 'destructive' :
                        'outline'
                      }
                    >
                      {approval.status === 'approved' && (
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      )}
                      {approval.status === 'rejected' && (
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      )}
                      {approval.status === 'pending' && (
                        <Hourglass className="h-3.5 w-3.5 mr-1" />
                      )}
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </Badge>
                  </div>
                  {approval.notes && (
                    <div className="mt-2 text-sm p-2 bg-muted rounded">
                      <span className="font-medium">Notes: </span>
                      {approval.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {agentData.approvals.some(a => a.status === "pending") && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Pending Approvals</AlertTitle>
                <AlertDescription>
                  This agent requires additional approvals before it can be deployed.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="environments" className="space-y-4 pt-4">
            <div className="space-y-3">
              {agentData.deploymentEnvironments.map((env) => (
                <div 
                  key={env.id} 
                  className="flex justify-between items-center p-3 rounded-md border"
                >
                  <div>
                    <div className="font-medium">{env.name}</div>
                    <div className="text-sm text-muted-foreground">{env.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        env.status === 'deployed' ? 'default' :
                        env.status === 'unavailable' ? 'outline' :
                        'secondary'
                      }
                    >
                      {env.status === 'deployed' && <Rocket className="h-3.5 w-3.5 mr-1" />}
                      {env.status.charAt(0).toUpperCase() + env.status.slice(1)}
                    </Badge>
                    
                    {env.status === 'available' && canDeploy && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedEnvironment(env.id);
                          setShowDeployDialog(true);
                        }}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Deploy
                      </Button>
                    )}
                    
                    {env.status === 'deployed' && (
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {!canDeploy && (
              <Alert>
                <LockIcon className="h-4 w-4" />
                <AlertTitle>Deployment Locked</AlertTitle>
                <AlertDescription>
                  All readiness checks must pass and the agent must be approved before deployment.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Agent</DialogTitle>
            <DialogDescription>
              Approving this agent will mark it as ready for deployment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes or comments about your approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            {(failedChecks > 0 || pendingChecks > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This agent still has {failedChecks} failed and {pendingChecks} pending readiness checks.
                  It's recommended to resolve these issues before approval.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agent</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this agent for deployment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason <span className="text-red-500">*</span></Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this agent is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Deploy Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Agent</DialogTitle>
            <DialogDescription>
              Select an environment to deploy this agent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment <span className="text-red-500">*</span></Label>
              <Select 
                value={selectedEnvironment} 
                onValueChange={setSelectedEnvironment}
              >
                <SelectTrigger id="environment">
                  <SelectValue placeholder="Select Environment" />
                </SelectTrigger>
                <SelectContent>
                  {agentData.deploymentEnvironments
                    .filter(env => env.status === 'available')
                    .map(env => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <Alert className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Deployment Warning</AlertTitle>
              <AlertDescription>
                Deploying this agent will make it active in the selected environment.
                Please ensure all validations and approvals are complete.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeploy}
              disabled={!selectedEnvironment}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
