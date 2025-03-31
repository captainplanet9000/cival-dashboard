import React from 'react';
import PerformanceAnalysisDashboard from '@/components/analytics/performance-analysis-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
        <p className="text-muted-foreground">
          AI-powered performance analysis and predictive insights for your trading strategies.
        </p>
      </div>
      
      <PerformanceAnalysisDashboard />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>About AI-Powered Analysis</CardTitle>
            <CardDescription>How our system analyzes your trading performance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              The AI-powered performance analysis engine uses machine learning to evaluate trading performance across multiple dimensions.
              It analyzes historical trading data, market conditions, and agent behavior to identify patterns and provide actionable insights.
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
              <li>Automatic anomaly detection in trading patterns</li>
              <li>Performance metric benchmarking against baselines</li>
              <li>Risk exposure analysis and mitigation suggestions</li>
              <li>Behavioral pattern analysis of trading agents</li>
              <li>Market regime detection and strategy adaptation</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Predictive Analytics</CardTitle>
            <CardDescription>Forecast future performance with confidence</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              The predictive analytics engine uses advanced statistical models and machine learning to forecast future performance under various market conditions.
              It provides probability distributions of expected returns, risk assessments, and actionable recommendations to optimize your strategies.
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
              <li>Monte Carlo simulations for return distributions</li>
              <li>Stress testing under extreme market conditions</li>
              <li>Multi-scenario analysis with confidence intervals</li>
              <li>Optimal parameter recommendations</li>
              <li>AI-driven market regime predictions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 