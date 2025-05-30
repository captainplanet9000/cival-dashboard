'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Info, Lightbulb } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeFiRiskAssessment as RiskAssessmentType } from './ElizaDeFiConsoleWidget';

interface DeFiRiskAssessmentProps {
  riskAssessment: RiskAssessmentType;
}

export function DeFiRiskAssessment({ riskAssessment }: DeFiRiskAssessmentProps) {
  // Helper to get risk level color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-amber-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Helper to get risk level description
  const getRiskDescription = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'Your portfolio has a conservative risk profile with most assets in audited, established protocols.';
      case 'medium':
        return 'Your portfolio has a balanced risk profile with some exposure to higher-risk protocols.';
      case 'high':
        return 'Your portfolio has significant exposure to high-risk protocols that require close monitoring.';
      default:
        return 'Unable to assess portfolio risk.';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-1">
          <Shield className="h-4 w-4 text-primary" />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score Display */}
        <div className="flex gap-4 justify-between items-center">
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Portfolio Risk Score</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        Risk score is calculated based on protocol risk levels, TVL, audit status, and your exposure.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge 
                variant={riskAssessment.risk_score === 'low' ? 'outline' : 
                        riskAssessment.risk_score === 'medium' ? 'secondary' : 
                        'destructive'}
              >
                {riskAssessment.risk_score}
              </Badge>
            </div>
            <Progress 
              value={
                riskAssessment.risk_score === 'low' ? 33 : 
                riskAssessment.risk_score === 'medium' ? 66 : 
                100
              } 
              className="h-2"
            />
          </div>
        </div>

        {/* Risk Description */}
        <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
          {getRiskDescription(riskAssessment.risk_score)}
        </div>

        {/* Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">High-Risk Positions</span>
              <span className="text-xs font-medium">{riskAssessment.high_risk_percentage}%</span>
            </div>
            <Progress 
              value={riskAssessment.high_risk_percentage} 
              className="h-1.5"
              indicatorClassName={riskAssessment.high_risk_percentage > 50 ? 'bg-red-500' : 'bg-amber-500'}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">Value in High-Risk</span>
              <span className="text-xs font-medium">{riskAssessment.high_risk_value_percentage}%</span>
            </div>
            <Progress 
              value={riskAssessment.high_risk_value_percentage} 
              className="h-1.5"
              indicatorClassName={riskAssessment.high_risk_value_percentage > 50 ? 'bg-red-500' : 'bg-amber-500'}
            />
          </div>
        </div>

        {/* Recommendation Banner */}
        <div className="flex gap-2 items-start p-3 rounded-md bg-primary/10 mt-2">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-primary mb-1">Recommendation</h4>
            <p className="text-sm">{riskAssessment.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
