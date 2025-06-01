'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, RotateCcw, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Mock intents for demonstration
const MOCK_INTENTS = [
  { id: 1, text: "Create a new trading strategy based on RSI" },
  { id: 2, text: "Show me performance of all agents" },
  { id: 3, text: "Summarize market conditions" },
  { id: 4, text: "Switch all agents to conservative mode" },
  { id: 5, text: "Buy 0.1 BTC at market price" },
];

// Mock response generation for the ElizaOS assistant
const generateMockResponse = (command: string): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      const responses = [
        {
          triggers: ['hello', 'hi', 'hey'],
          response: "Hello! I'm ElizaOS, your trading assistant. How can I help you today?"
        },
        {
          triggers: ['create', 'new', 'strategy', 'rsi'],
          response: "I'll create a new RSI-based strategy. Would you like me to set parameters automatically based on historical data, or would you prefer to set them manually?"
        },
        {
          triggers: ['performance', 'agent', 'agents'],
          response: "Here's the performance summary for all agents:\n\n- TrendFollower: +6.2% (24h), Win rate: 72%\n- MeanReversion: +3.5% (24h), Win rate: 68%\n- VolatilityHarvester: -0.8% (24h), Win rate: 58%\n\nTotal P&L: +$4,327.65 (24h)"
        },
        {
          triggers: ['market', 'condition', 'summarize'],
          response: "Current market analysis:\n- BTC trending sideways with low volatility\n- ETH showing bullish divergence on 4H chart\n- Overall market sentiment: Neutral\n- Risk indicator: Moderate\n\nRecommendation: Cautious position sizing until clear trend emerges."
        },
        {
          triggers: ['conservative', 'switch', 'mode'],
          response: "I've switched all agents to conservative mode. Position sizes reduced by 50%, stop losses tightened, and take profit levels adjusted. You can revert this change at any time."
        },
        {
          triggers: ['buy', 'btc', 'market'],
          response: "Order placed: Buy 0.1 BTC at market price\nExecution price: $64,243.50\nFee: $6.42\nTotal: $6,430.92\n\nWould you like me to set up a trailing stop loss?"
        }
      ];

      // Default response if no match
      let responseText = "I'm processing your request. Let me analyze this and get back to you with the best approach.";
      
      // Check for matching triggers
      for (const resp of responses) {
        if (resp.triggers.some(trigger => command.toLowerCase().includes(trigger))) {
          responseText = resp.response;
          break;
        }
      }
      
      resolve(responseText);
    }, 1500); // Simulate AI thinking time
  });
};

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'elizaos';
  timestamp: Date;
};

export default function ElizaOSCommandConsole() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: "Welcome to ElizaOS Command Console. How can I assist with your trading activities today?",
      sender: 'elizaos',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Get AI response
      const responseText = await generateMockResponse(input);
      
      // Add AI response
      const elizaResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'elizaos',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, elizaResponse]);
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble processing your request. Please try again.",
        sender: 'elizaos',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Card className="w-full h-full shadow-lg border-t-4 border-t-blue-600 dark:border-t-blue-400">
      <CardHeader className="px-4 py-2 flex flex-row items-center justify-between bg-muted/20">
        <CardTitle className="text-lg flex items-center">
          <Bot className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
          ElizaOS Command Console
        </CardTitle>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={toggleExpanded} className="h-8 w-8 p-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <>
          <CardContent className="p-0">
            <div className="h-64 overflow-y-auto p-4 space-y-4 bg-background/50">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-line">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-4 py-2 rounded-lg bg-muted">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showSuggestions && (
              <div className="px-4 py-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {MOCK_INTENTS.map(intent => (
                    <Badge
                      key={intent.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSuggestionClick(intent.text)}
                    >
                      {intent.text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border flex space-x-2">
              <Input
                placeholder="Type a command..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={handleSendMessage} disabled={loading || !input.trim()}>
                {loading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
