/**
 * AI Advisor Page
 * Showcases the AI-powered trading strategy and portfolio optimization features
 */

import { Metadata } from "next";
import { AIStrategyAdvisor } from "@/components/ai/ai-strategy-advisor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "AI Advisor | Trading Farm Dashboard",
  description: "AI-powered trading strategy and portfolio optimization",
};

export default function AIAdvisorPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Trading Advisor</h1>
        <p className="text-muted-foreground mt-2">
          Get AI-powered insights for trading strategies, risk assessment, and portfolio optimization.
        </p>
      </div>

      <div className="grid gap-8">
        <AIStrategyAdvisor />
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">About This Feature</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-2">Strategy Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Generate custom trading strategies based on your risk tolerance, capital, and market preferences. Get detailed entry and exit conditions, risk management rules, and expected performance metrics.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-2">Risk Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Assess the risks of specific trading strategies or market approaches. Identify potential failure points, estimate risk metrics, and get suggestions for risk mitigation techniques.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-2">Portfolio Optimization</h3>
              <p className="text-sm text-muted-foreground">
                Optimize your crypto portfolio for better risk-adjusted returns. Get personalized allocation recommendations based on your risk profile and investment horizon.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-sm font-medium mb-2">Notes</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>AI recommendations are for informational purposes only and do not constitute financial advice.</li>
            <li>This feature requires your own OpenAI API key. Your key is used only for generating recommendations and is not stored.</li>
            <li>For best results, provide as much context as possible about market conditions and trading preferences.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
