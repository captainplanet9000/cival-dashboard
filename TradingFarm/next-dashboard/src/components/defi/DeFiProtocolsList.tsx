'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Info, 
  ChevronDown,
  ChevronUp,
  Coins
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeFiProtocol } from './ElizaDeFiConsoleWidget';

interface DeFiProtocolsListProps {
  protocols: DeFiProtocol[];
}

export function DeFiProtocolsList({ protocols }: DeFiProtocolsListProps) {
  const [expandedProtocols, setExpandedProtocols] = React.useState<Record<string, boolean>>({});

  // Toggle expanded state for a protocol
  const toggleExpand = (id: string) => {
    setExpandedProtocols(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Format TVL value with appropriate suffix (B, M, K)
  const formatTVL = (tvl: number) => {
    if (tvl >= 1_000_000_000) {
      return `$${(tvl / 1_000_000_000).toFixed(2)}B`;
    } else if (tvl >= 1_000_000) {
      return `$${(tvl / 1_000_000).toFixed(2)}M`;
    } else if (tvl >= 1_000) {
      return `$${(tvl / 1_000).toFixed(2)}K`;
    }
    return `$${tvl.toFixed(2)}`;
  };

  // Get appropriate color for risk level
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'outline';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      case 'very_high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Render chain badges
  const renderChains = (chains: string[]) => {
    // Show first 3 chains directly, rest in tooltip if > 3
    const displayChains = chains.slice(0, 3);
    const remainingCount = chains.length - 3;

    return (
      <div className="flex flex-wrap gap-1">
        {displayChains.map(chain => (
          <Badge key={chain} variant="outline" className="text-xs">
            {chain}
          </Badge>
        ))}
        
        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-help">
                  +{remainingCount} more
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  {chains.slice(3).map(chain => (
                    <span key={chain} className="text-xs">{chain}</span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  return (
    <div className="p-1">
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Protocol</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>TVL</TableHead>
              <TableHead>Chains</TableHead>
              <TableHead>Audited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {protocols.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                  No protocols available with the current filters
                </TableCell>
              </TableRow>
            ) : (
              protocols.map(protocol => (
                <React.Fragment key={protocol.id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {protocol.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{protocol.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {protocol.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskBadgeVariant(protocol.risk_level)}>
                        {protocol.risk_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-muted-foreground" />
                        {formatTVL(protocol.tvl)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderChains(protocol.chains)}
                    </TableCell>
                    <TableCell>
                      {protocol.audit_status ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleExpand(protocol.id)}
                        >
                          <Info className="h-4 w-4" />
                          <span className="sr-only">Details</span>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Visit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Row */}
                  {expandedProtocols[protocol.id] && (
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={7} className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium">Description</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {protocol.description || 'No description available'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium">Supported Tokens</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {protocol.tokens.map(token => (
                                  <Badge key={token} variant="outline" className="text-xs uppercase">
                                    {token}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium">Risk Factors</h4>
                              <div className="mt-1 text-sm">
                                <ul className="list-disc list-inside text-muted-foreground">
                                  {protocol.risk_level === 'high' || protocol.risk_level === 'very_high' ? (
                                    <>
                                      <li>Complex financial mechanisms</li>
                                      <li>Relatively new or experimental</li>
                                      <li>Higher capital efficiency but greater risk</li>
                                    </>
                                  ) : protocol.risk_level === 'medium' ? (
                                    <>
                                      <li>Established protocol with moderate complexity</li>
                                      <li>Has a track record but may have some risks</li>
                                      <li>Reasonable risk-reward balance</li>
                                    </>
                                  ) : (
                                    <>
                                      <li>Well-established with strong security record</li>
                                      <li>Multiple security audits</li>
                                      <li>Conservative financial approach</li>
                                    </>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
