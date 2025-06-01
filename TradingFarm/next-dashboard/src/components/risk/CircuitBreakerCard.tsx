"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { riskManagementService, CircuitBreaker } from "@/utils/trading/risk-management-service";
import { useToast } from "@/components/ui/use-toast";

interface CircuitBreakerCardProps {
  userId: string;
}

export function CircuitBreakerCard({ userId }: CircuitBreakerCardProps) {
  const { toast } = useToast();
  const [circuit, setCircuit] = useState<CircuitBreaker | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [triggerType, setTriggerType] = useState<'drawdown' | 'volatility' | 'manual'>('drawdown');
  const [threshold, setThreshold] = useState(10); // percent
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    riskManagementService.getCircuitBreaker(userId).then((circuit) => {
      if (circuit) {
        setCircuit(circuit);
        setEnabled(circuit.enabled);
        setTriggerType(circuit.trigger_type);
        setThreshold(circuit.threshold * 100);
        setStatus(circuit.status);
      }
    });
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const config = {
      enabled,
      trigger_type: triggerType,
      threshold: threshold / 100, // store as decimal
      status: 'active',
    };
    const updated = await riskManagementService.upsertCircuitBreaker(userId, config);
    setCircuit(updated);
    setLoading(false);
    toast({
      title: 'Circuit Breaker Updated',
      description: 'Your circuit breaker settings have been saved.'
    });
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Circuit Breaker</CardTitle>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enabled</Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          <div>
            <Label htmlFor="triggerType">Trigger Type</Label>
            <select
              id="triggerType"
              className="w-full border rounded px-2 py-1"
              value={triggerType}
              onChange={e => setTriggerType(e.target.value as any)}
            >
              <option value="drawdown">Drawdown</option>
              <option value="volatility">Volatility</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <Label htmlFor="threshold">Threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{status}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
