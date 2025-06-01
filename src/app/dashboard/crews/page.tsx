'use client'; // Can be server if data is purely static like this example

import React from 'react';
import { CrewDefinitionDisplay } from '@/components/crew/CrewDefinitionDisplay';
import { type StaticCrewDefinition } from '@/lib/types/crew';
import { Separator } from '@/components/ui/separator';

// Sample static data for the trading_crew
// This mirrors the structure defined in python-ai-services/agents/trading_crew.py
const sampleTradingCrew: StaticCrewDefinition = {
  id: "trading_crew_main",
  name: "Trading Analysis & Advisory Crew",
  description: "A sequential crew that first analyzes a market symbol based on provided data and then formulates trading advice.",
  process: "sequential", // From CrewAI Process enum
  agents: [
    { 
      id: "market_analyst", 
      role: "Market Analyst", 
      goal: "Analyze current market conditions and price data for a given financial symbol to identify potential trends or insights.", 
      backstory: "You are an experienced market analyst with a knack for interpreting charts and data to provide clear, concise summaries of market sentiment and potential price movements. Focus on the provided data and avoid making speculative long-term predictions.",
      llmIdentifier: "gemini-1.5-flash-latest (Default for Crew)" // Assuming this is the default LLM used by the crew
    },
    { 
      id: "trade_advisor", 
      role: "Trade Advisor", 
      goal: "Based on market analysis, formulate a simple trading advisory (BUY, SELL, or HOLD) with a brief rationale and confidence score.", 
      backstory: "You are a cautious trade advisor. Given a market analysis, you will decide if a clear trading signal exists. If the signal is strong, you recommend BUY or SELL. If the signal is weak or unclear, you recommend HOLD. Your advice must include a confidence score between 0.0 and 1.0.",
      llmIdentifier: "gemini-1.5-flash-latest (Default for Crew)" // Assuming this is the default LLM used by the crew
    }
  ],
  tasks: [
    { 
      id: "market_analysis_task", 
      name: "Market Analysis Task",
      description: "Analyze the provided market data summary for the financial symbol: {symbol}. Focus on identifying any immediate bullish, bearish, or neutral signals from this data. Your output should be a concise analysis summary.", 
      assignedAgentId: "market_analyst", // Refers to agent by id
      expectedOutput: "A brief text summary (1-2 paragraphs) of the market analysis, highlighting key observations and potential direction based *only* on the provided data summary."
    },
    { 
      id: "trade_advising_task", 
      name: "Trade Advising Task",
      description: "Based on the market analysis output for symbol: {symbol}, determine a trading action (BUY, SELL, or HOLD). Provide a confidence score (0.0 to 1.0) and a brief rationale for your advice. If the analysis is inconclusive or doesn't present a strong signal, recommend HOLD.", 
      assignedAgentId: "trade_advisor", // Refers to agent by id
      dependencies: ["market_analysis_task"], // Refers to task by id
      expectedOutput: "A JSON string representing the trading advice. The JSON object should conform to the TradeSignal model, containing fields: 'symbol', 'action', 'confidence', 'timestamp', 'execution_price' (optional), 'rationale'."
    }
  ]
};

// Placeholder for another sample crew if desired
// const anotherSampleCrew: StaticCrewDefinition = { ... };

export default function CrewsPage() {
  return (
    <div className="container mx-auto py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Crew Definitions</h1>
        <p className="text-muted-foreground">
          Static overview of defined CrewAI structures in the system.
        </p>
      </header>
      
      <CrewDefinitionDisplay crew={sampleTradingCrew} />

      {/* Example of displaying another crew if you have more */}
      {/* <Separator className="my-12" /> */}
      {/* <CrewDefinitionDisplay crew={anotherSampleCrew} /> */}
      
    </div>
  );
}
