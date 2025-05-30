"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { riskManagementService } from "@/utils/trading/risk-management-service";

export function PositionSizingCalculator() {
  const [capital, setCapital] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(1); // percent
  const [stopLossPercent, setStopLossPercent] = useState(2); // percent
  const [positionSize, setPositionSize] = useState<number | null>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert percent to decimal
    const risk = riskPerTrade / 100;
    const stopLoss = stopLossPercent / 100;
    const size = riskManagementService.calculatePositionSize(capital, risk, stopLoss);
    setPositionSize(size);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Position Sizing Calculator</CardTitle>
      </CardHeader>
      <form onSubmit={handleCalculate}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="capital">Trading Capital ($)</Label>
            <Input
              id="capital"
              type="number"
              min={0}
              value={capital}
              onChange={e => setCapital(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="risk">Risk per Trade (%)</Label>
            <Input
              id="risk"
              type="number"
              min={0.01}
              step={0.01}
              value={riskPerTrade}
              onChange={e => setRiskPerTrade(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="stopLoss">Stop Loss (%)</Label>
            <Input
              id="stopLoss"
              type="number"
              min={0.01}
              step={0.01}
              value={stopLossPercent}
              onChange={e => setStopLossPercent(Number(e.target.value))}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full">Calculate Position Size</Button>
          {positionSize !== null && (
            <div className="text-center mt-2 text-lg font-semibold text-blue-700">
              Recommended Position Size: <span className="text-black">{positionSize.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
