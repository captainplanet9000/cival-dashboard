"use client";

import React, { useState } from "react";
import { 
  Search, BookOpen, FileText, Database, 
  Brain, CheckCircle, PlusCircle 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Simulated knowledge entries
const KNOWLEDGE_ENTRIES = [
  {
    id: "k1",
    title: "Bitcoin Mean Reversion Strategy",
    type: "Strategy Document",
    category: "Trading",
    updatedAt: "2025-03-20",
    excerpt: "This strategy utilizes mean reversion principles combined with volatility indicators...",
  },
  {
    id: "k2",
    title: "Exchange API Rate Limits",
    type: "Reference",
    category: "Technical",
    updatedAt: "2025-03-18",
    excerpt: "Documentation of rate limits for all integrated exchanges and API management...",
  },
  {
    id: "k3",
    title: "Risk Management Protocol",
    type: "SOP",
    category: "Operations",
    updatedAt: "2025-03-15",
    excerpt: "Standard procedures for managing risk exposure, stop-loss settings, and position sizing...",
  },
  {
    id: "k4",
    title: "Market Volatility Analysis",
    type: "Research",
    category: "Market Analysis",
    updatedAt: "2025-03-10",
    excerpt: "Research on volatility patterns across major cryptocurrencies and correlation studies...",
  },
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredEntries = KNOWLEDGE_ENTRIES.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || entry.category.toLowerCase() === activeCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search the knowledge base..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Trading">Trading</TabsTrigger>
          <TabsTrigger value="Technical">Technical</TabsTrigger>
          <TabsTrigger value="Operations">Operations</TabsTrigger>
          <TabsTrigger value="Market Analysis">Market Analysis</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">{entry.title}</CardTitle>
                {entry.type === "SOP" && (
                  <div className="flex items-center text-xs font-medium text-green-500">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Active
                  </div>
                )}
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs mr-2">
                  {entry.type}
                </span>
                <span className="text-xs">Updated {entry.updatedAt}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 line-clamp-2">{entry.excerpt}</p>
              <Button variant="link" className="mt-2 h-8 p-0">
                View Document
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No entries found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filters, or create a new entry.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredEntries.length} entries shown
        </div>
        <Button variant="outline" size="sm">
          View Knowledge Graph
        </Button>
      </div>
    </div>
  );
}
