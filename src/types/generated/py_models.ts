// src/types/generated/py_models.ts
// These types are manually generated as a workaround for issues with
// automated Pydantic-to-TypeScript generation in the current environment.
// For future Pydantic model changes, these will need manual updates or
// a local generation process by the user.

export interface MarketDataInterface {
  symbol: string;
  price: number;
  timestamp: string; // Assuming ISO date string from Python's datetime
  volume?: number | null;
  open?: number | null;   // Pydantic model uses alias 'open' for 'open_price'
  high?: number | null;  // Pydantic model uses alias 'high' for 'high_price'
  low?: number | null;   // Pydantic model uses alias 'low' for 'low_price'
  close?: number | null; // Pydantic model uses alias 'close' for 'close_price'
}

export type TradeAction = "BUY" | "SELL" | "HOLD";

export interface TradeSignalInterface {
  symbol: string;
  action: TradeAction;
  confidence: number; // Should be between 0.0 and 1.0
  timestamp: string; // Assuming ISO date string from Python's datetime
  rationale: string;
  metadata?: Record<string, any> | null;
}
