"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowDown, Filter, Cpu, ServerCrash, RefreshCw, Database, DollarSign, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

// Define trading events constants to match ElizaOS integration
export const TRADING_EVENTS = {
  MARKET_UPDATE: 'market:update',
  TRADE_EXECUTED: 'trade:executed',
  PORTFOLIO_UPDATE: 'portfolio:update',
  AGENT_STATUS: 'agent:status',
  KNOWLEDGE_QUERY: 'knowledge:query',
  SYSTEM_STATUS: 'system:status',
  ERROR: 'system:error',
};

// Mock socket event data - would be replaced with real socket connection
const mockEvents: SocketEvent[] = [
  { id: 'evt-001', type: TRADING_EVENTS.MARKET_UPDATE, timestamp: new Date().getTime() - 35000, content: 'BTC price update: $58,432.45 (1.2%)', severity: 'info' },
  { id: 'evt-002', type: TRADING_EVENTS.TRADE_EXECUTED, timestamp: new Date().getTime() - 28000, content: 'Buy order executed: 0.25 ETH at $3,142.18', severity: 'success' },
  { id: 'evt-003', type: TRADING_EVENTS.PORTFOLIO_UPDATE, timestamp: new Date().getTime() - 25000, content: 'Portfolio value: $124,532.87 (+2.4% today)', severity: 'info' },
  { id: 'evt-004', type: TRADING_EVENTS.AGENT_STATUS, timestamp: new Date().getTime() - 18000, content: 'Arbitrage Agent detected price discrepancy on Binance', severity: 'warning' },
  { id: 'evt-005', type: TRADING_EVENTS.ERROR, timestamp: new Date().getTime() - 12000, content: 'Connection timeout with Kraken API', severity: 'error' },
  { id: 'evt-006', type: TRADING_EVENTS.SYSTEM_STATUS, timestamp: new Date().getTime() - 8000, content: 'Data pipeline throughput: 1250 events/sec', severity: 'info' },
  { id: 'evt-007', type: TRADING_EVENTS.KNOWLEDGE_QUERY, timestamp: new Date().getTime() - 5000, content: 'Knowledge update: BTC volatility pattern identified', severity: 'info' },
  { id: 'evt-008', type: TRADING_EVENTS.TRADE_EXECUTED, timestamp: new Date().getTime() - 2000, content: 'Sell order executed: 1,200 XRP at $0.72', severity: 'success' },
];

interface SocketEvent {
  id: string;
  type: string;
  timestamp: number;
  content: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

interface EventItemProps {
  event: SocketEvent;
}

const EventItem = ({ event }: EventItemProps) => {
  const getIcon = () => {
    switch (event.type) {
      case TRADING_EVENTS.MARKET_UPDATE:
        return <DollarSign className="w-4 h-4" />;
      case TRADING_EVENTS.TRADE_EXECUTED:
        return <RefreshCw className="w-4 h-4" />;
      case TRADING_EVENTS.PORTFOLIO_UPDATE:
        return <Database className="w-4 h-4" />;
      case TRADING_EVENTS.AGENT_STATUS:
      case TRADING_EVENTS.KNOWLEDGE_QUERY:
        return <Cpu className="w-4 h-4" />;
      case TRADING_EVENTS.ERROR:
        return <ServerCrash className="w-4 h-4" />;
      default:
        return <Cpu className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (event.severity) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getEventType = () => {
    switch (event.type) {
      case TRADING_EVENTS.MARKET_UPDATE: return 'Market';
      case TRADING_EVENTS.TRADE_EXECUTED: return 'Trade';
      case TRADING_EVENTS.PORTFOLIO_UPDATE: return 'Portfolio';
      case TRADING_EVENTS.AGENT_STATUS: return 'Agent';
      case TRADING_EVENTS.KNOWLEDGE_QUERY: return 'Knowledge';
      case TRADING_EVENTS.SYSTEM_STATUS: return 'System';
      case TRADING_EVENTS.ERROR: return 'Error';
      default: return 'Event';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-2 border-b border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center space-x-2">
        <div className={`p-1.5 rounded-full ${getColor()}`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {getEventType()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-1 text-sm">{event.content}</p>
        </div>
      </div>
    </motion.div>
  );
};

export interface SocketEventStreamProps {
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SocketEventStream({
  maxEvents = 20,
  autoRefresh = true,
  refreshInterval = 5000
}: SocketEventStreamProps): JSX.Element {
  const [events, setEvents] = useState<SocketEvent[]>(mockEvents);
  const [filters, setFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null);

  // Simulate real-time socket events
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      const newEventTypes = [
        TRADING_EVENTS.MARKET_UPDATE,
        TRADING_EVENTS.TRADE_EXECUTED,
        TRADING_EVENTS.PORTFOLIO_UPDATE,
        TRADING_EVENTS.AGENT_STATUS,
        TRADING_EVENTS.KNOWLEDGE_QUERY,
        TRADING_EVENTS.SYSTEM_STATUS,
      ];
      
      const randomType = newEventTypes[Math.floor(Math.random() * newEventTypes.length)];
      const severityOptions: ('info' | 'success' | 'warning' | 'error')[] = ['info', 'success', 'warning', 'error'];
      const severityWeight = [0.7, 0.2, 0.08, 0.02]; // Weighted probabilities
      
      // Choose severity based on weighted probability
      let severityIndex = 0;
      const rand = Math.random();
      let cumulativeProbability = 0;
      for (let i = 0; i < severityWeight.length; i++) {
        cumulativeProbability += severityWeight[i];
        if (rand <= cumulativeProbability) {
          severityIndex = i;
          break;
        }
      }
      const severity = severityOptions[severityIndex];
      
      let content = '';
      switch (randomType) {
        case TRADING_EVENTS.MARKET_UPDATE:
          const coin = ['BTC', 'ETH', 'SOL', 'AVAX', 'DOT'][Math.floor(Math.random() * 5)];
          const price = (Math.random() * 50000 + 1000).toFixed(2);
          const change = (Math.random() * 5 - 2.5).toFixed(2);
          content = `${coin} price update: $${price} (${change}%)`;
          break;
        case TRADING_EVENTS.TRADE_EXECUTED:
          const action = Math.random() > 0.5 ? 'Buy' : 'Sell';
          const amount = (Math.random() * 10).toFixed(2);
          const tradeCoin = ['BTC', 'ETH', 'LINK', 'UNI', 'AAVE'][Math.floor(Math.random() * 5)];
          const tradePrice = (Math.random() * 5000 + 100).toFixed(2);
          content = `${action} order executed: ${amount} ${tradeCoin} at $${tradePrice}`;
          break;
        case TRADING_EVENTS.PORTFOLIO_UPDATE:
          const value = (Math.random() * 200000 + 50000).toFixed(2);
          const daily = (Math.random() * 8 - 3).toFixed(2);
          content = `Portfolio value: $${value} (${daily}% today)`;
          break;
        default:
          const messages = [
            'ElizaOS knowledge update applied',
            'Farm efficiency optimization complete',
            'Rebalancing strategy initiated',
            'Agent behavior pattern identified',
            'Market sentiment analysis complete'
          ];
          content = messages[Math.floor(Math.random() * messages.length)];
      }
      
      const newEvent: SocketEvent = {
        id: `evt-${Date.now()}`,
        type: randomType,
        timestamp: Date.now(),
        content,
        severity
      };
      
      setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, maxEvents]);

  // Auto scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [events]);

  const filteredEvents = filters.length > 0
    ? events.filter(event => filters.includes(event.type))
    : events;

  const toggleFilter = (eventType: string) => {
    if (filters.includes(eventType)) {
      setFilters(filters.filter(f => f !== eventType));
    } else {
      setFilters([...filters, eventType]);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Event Stream</CardTitle>
            <CardDescription>Real-time socket events from trading farms</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Filter</span>
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setEvents(mockEvents)}
            >
              <RefreshCw className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setEvents([])}
            >
              Clear
            </Button>
          </div>
        </div>
        
        {isFilterOpen && (
          <div className="flex flex-wrap gap-2 mt-2 pb-2">
            {Object.values(TRADING_EVENTS).map((eventType) => {
              // This creates a button-like effect while properly handling the Badge component's limitations
              return (
                <div 
                  key={eventType}
                  className="cursor-pointer"
                  onClick={() => toggleFilter(eventType)}
                >
                  <Badge 
                    variant={filters.includes(eventType) ? "default" : "outline"}
                    className="hover:bg-opacity-80"
                  >
                    {eventType.split(':')[0]}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
          {filteredEvents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>No events to display</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEvents.map((event, index) => (
                <div key={index}>
                  <EventItem event={event} />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {filteredEvents.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground flex justify-between items-center">
            <span>Showing {filteredEvents.length} of {events.length} events</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2"
              onClick={() => {
                if (scrollAreaRef.current) {
                  scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
                }
              }}
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Latest
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
