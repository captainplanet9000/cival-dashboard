import React, { useState } from "react";
import { YieldStrategyCard } from "./yield-strategy-card";
import { YieldStrategy, StrategyType } from "@/types/yield-strategy.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "../ui/empty-state";

interface YieldStrategiesListProps {
  strategies: YieldStrategy[];
  farmId: string;
}

export function YieldStrategiesList({ strategies, farmId }: YieldStrategiesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyType, setStrategyType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("apy");

  // Filter strategies
  const filteredStrategies = strategies.filter((strategy) => {
    // Filter by search term
    const matchesSearch = 
      strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (strategy.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    // Filter by strategy type
    const matchesType = strategyType === "all" || strategy.strategyType === strategyType;
    
    return matchesSearch && matchesType;
  });

  // Sort strategies
  const sortedStrategies = [...filteredStrategies].sort((a, b) => {
    switch (sortBy) {
      case "apy":
        return (b.currentApy || 0) - (a.currentApy || 0);
      case "value":
        return b.totalValueUsd - a.totalValueUsd;
      case "earned":
        return b.totalEarnedUsd - a.totalEarnedUsd;
      case "name":
        return a.name.localeCompare(b.name);
      case "risk":
        return a.riskLevel - b.riskLevel;
      default:
        return 0;
    }
  });

  // Group strategies by active status
  const activeStrategies = sortedStrategies.filter((s) => s.isActive);
  const inactiveStrategies = sortedStrategies.filter((s) => !s.isActive);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            className="w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={strategyType} onValueChange={setStrategyType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Strategy Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apy">Highest APY</SelectItem>
              <SelectItem value="value">Highest Value</SelectItem>
              <SelectItem value="earned">Most Earned</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="risk">Lowest Risk</SelectItem>
            </SelectContent>
          </Select>
          
          <Link href={`/dashboard/farms/${farmId}/strategies/new`}>
            <Button size="sm" className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              New Strategy
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="active">
            Active ({activeStrategies.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveStrategies.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          {activeStrategies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeStrategies.map((strategy) => (
                <YieldStrategyCard 
                  key={strategy.id} 
                  strategy={strategy} 
                  farmId={farmId} 
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Plus className="h-8 w-8" />}
              title="No active strategies"
              description="You don't have any active yield strategies. Create one to start optimizing returns."
              action={
                <Link href={`/dashboard/farms/${farmId}/strategies/new`}>
                  <Button>Create Strategy</Button>
                </Link>
              }
            />
          )}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-4">
          {inactiveStrategies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveStrategies.map((strategy) => (
                <YieldStrategyCard 
                  key={strategy.id} 
                  strategy={strategy} 
                  farmId={farmId} 
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<SlidersHorizontal className="h-8 w-8" />}
              title="No inactive strategies"
              description="You don't have any inactive yield strategies."
              action={null}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
