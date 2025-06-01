'use client';

import React from 'react';
import { 
  Wallet, 
  Layers, 
  Network, 
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { DeFiMetrics } from './ElizaDeFiConsoleWidget';
import { Card, CardContent } from '@/components/ui/card';

interface DeFiMetricsCardsProps {
  metrics: DeFiMetrics;
}

export function DeFiMetricsCards({ metrics }: DeFiMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Value</p>
              <h3 className="text-2xl font-bold">
                ${metrics.total_value_usd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">+4.3%</span>
            <span className="text-xs text-muted-foreground ml-1">vs last week</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Positions</p>
              <h3 className="text-2xl font-bold">{metrics.total_positions}</h3>
            </div>
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
              <Wallet className="h-4 w-4 text-blue-500 dark:text-blue-300" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {metrics.position_types.slice(0, 3).map((type) => (
                <span key={type} className="text-xs bg-muted px-1.5 py-0.5 rounded-sm">
                  {type}
                </span>
              ))}
              {metrics.position_types.length > 3 && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-sm">
                  +{metrics.position_types.length - 3} more
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Protocols</p>
              <h3 className="text-2xl font-bold">{metrics.distinct_protocols}</h3>
            </div>
            <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-2">
              <Layers className="h-4 w-4 text-purple-500 dark:text-purple-300" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3">
            {metrics.distinct_protocols < 5 ? (
              <div className="text-xs text-muted-foreground">
                Consider adding more protocols for diversification
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Good protocol diversification
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Chains</p>
              <h3 className="text-2xl font-bold">{metrics.distinct_chains}</h3>
            </div>
            <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-2">
              <Network className="h-4 w-4 text-amber-500 dark:text-amber-300" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3">
            {metrics.distinct_chains < 3 ? (
              <div className="text-xs text-muted-foreground">
                Consider exploring more chains
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Good cross-chain diversification
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
