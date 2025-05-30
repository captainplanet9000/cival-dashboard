'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createBrowserClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Brain, 
  LineChart, 
  AlertTriangle, 
  Shield, 
  Lightbulb, 
  DollarSign, 
  RefreshCw,
  Filter,
  GanttChartSquare,
  ListFilter
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DeFiProtocolsList } from './DeFiProtocolsList';
import { DeFiPositionsTable } from './DeFiPositionsTable';
import { DeFiRiskAssessment } from './DeFiRiskAssessment';
import { DeFiMetricsCards } from './DeFiMetricsCards';
import { useToast } from '@/components/ui/use-toast';

// Types for DeFi Analysis
export type DeFiRiskLevel = 'low' | 'medium' | 'high' | 'very_high';
export type DeFiProtocolCategory = 'lending' | 'dex' | 'yield' | 'derivatives' | 'bridges' | 'payments' | 'insurance' | 'staking' | 'aggregator' | 'other';

export interface DeFiProtocol {
  id: string;
  protocol_id: string;
  name: string;
  category: DeFiProtocolCategory;
  risk_level: DeFiRiskLevel;
  tvl: number;
  chains: string[];
  tokens: string[];
  audit_status: boolean;
  description: string;
}

export interface DeFiPosition {
  id: string;
  protocol_id: string;
  protocol_name: string;
  position_type: string;
  chain: string;
  asset_symbol: string;
  amount: number;
  usd_value: number;
  apy: number;
  start_date: string;
  end_date: string | null;
  status: string;
  transaction_hash: string;
  risk_level: DeFiRiskLevel;
}

export interface DeFiMetrics {
  total_positions: number;
  distinct_protocols: number;
  distinct_chains: number;
  total_value_usd: number;
  position_types: string[];
  last_updated: string;
}

export interface DeFiRiskAssessment {
  high_risk_percentage: number;
  high_risk_value_percentage: number;
  risk_score: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface DeFiAnalysisResult {
  protocols: DeFiProtocol[];
  positions: DeFiPosition[];
  metrics: DeFiMetrics;
  risk_assessment: DeFiRiskAssessment;
  timestamp: string;
}

export interface ElizaDeFiConsoleWidgetProps {
  className?: string;
}

export function ElizaDeFiConsoleWidget({ className }: ElizaDeFiConsoleWidgetProps) {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [analysis, setAnalysis] = React.useState<DeFiAnalysisResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = React.useState<DeFiRiskLevel>('very_high');
  const [selectedCategories, setSelectedCategories] = React.useState<DeFiProtocolCategory[]>([]);
  const [selectedChains, setSelectedChains] = React.useState<string[]>([]);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();

  // Fetch DeFi analysis data
  const fetchDeFiAnalysis = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_defi_analysis', {
        p_risk_level_max: selectedRiskLevel,
        p_categories: selectedCategories.length > 0 ? selectedCategories : null,
        p_chains: selectedChains.length > 0 ? selectedChains : null,
        p_include_positions: true
      });
      
      if (error) throw error;
      
      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching DeFi analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to load DeFi analysis data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  React.useEffect(() => {
    fetchDeFiAnalysis();
  }, [selectedRiskLevel, selectedCategories, selectedChains]);

  // Handle filter changes
  const handleRiskLevelChange = (value: string) => {
    setSelectedRiskLevel(value as DeFiRiskLevel);
  };

  const toggleCategoryFilter = (category: DeFiProtocolCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleChainFilter = (chain: string) => {
    setSelectedChains(prev => 
      prev.includes(chain) 
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  // Helper for rendering the Eliza chat interface
  const renderElizaInterface = () => {
    if (!analysis) return null;
    
    // Extract key insights
    const { risk_assessment, metrics } = analysis;
    
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src="/images/eliza-avatar.png" alt="Eliza" />
            <AvatarFallback>
              <Brain className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Eliza DeFi Advisor</p>
            <div className="rounded-lg bg-accent p-3">
              <p className="text-sm">
                {`Based on your ${metrics.distinct_protocols} DeFi protocols across ${metrics.distinct_chains} chains, I've analyzed your portfolio worth $${metrics.total_value_usd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}.`}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Risk Assessment: </span>
                {risk_assessment.recommendation}
              </p>
              <p className="mt-2 text-sm">
                <Lightbulb className="inline-block h-4 w-4 mr-1 text-amber-500" />
                <span className="font-medium">Top Insight: </span>
                {risk_assessment.high_risk_value_percentage > 30 
                  ? "You have significant exposure to high-risk protocols. Consider rebalancing to reduce risk."
                  : risk_assessment.high_risk_value_percentage > 15
                  ? "Your portfolio has a balanced risk profile, but there's room for improvement."
                  : "Your portfolio demonstrates good risk management practices."}
              </p>
            </div>
          </div>
        </div>
        
        {risk_assessment.risk_score !== 'low' && (
          <div className="flex items-start gap-3 justify-end">
            <div className="flex flex-col gap-1">
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-sm">
                  <span className="font-medium">What steps would you recommend to reduce my portfolio risk?</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-right">You</p>
            </div>
            <Avatar className="h-8 w-8 border">
              <AvatarFallback>You</AvatarFallback>
            </Avatar>
          </div>
        )}
        
        {risk_assessment.risk_score !== 'low' && (
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src="/images/eliza-avatar.png" alt="Eliza" />
              <AvatarFallback>
                <Brain className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="rounded-lg bg-accent p-3">
                <p className="text-sm">
                  Here are some recommendations to improve your risk profile:
                </p>
                <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
                  {risk_assessment.high_risk_value_percentage > 30 && (
                    <li>Reduce positions in high-risk protocols by at least 15-20%</li>
                  )}
                  <li>Increase diversification across different protocol categories</li>
                  <li>Consider adding positions in established lending protocols with strong security records</li>
                  <li>Maintain no more than 20% of your portfolio in experimental or new DeFi products</li>
                  <li>Set up alerts for significant TVL changes in your chosen protocols</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-4">
          <Button variant="outline" className="w-full">
            <span>Ask Eliza a question about your DeFi portfolio</span>
          </Button>
        </div>
      </div>
    );
  };

  // All available chains from protocol data
  const availableChains = React.useMemo(() => {
    if (!analysis?.protocols) return [];
    const chainsSet = new Set<string>();
    analysis.protocols.forEach(protocol => {
      protocol.chains.forEach(chain => chainsSet.add(chain));
    });
    return Array.from(chainsSet);
  }, [analysis?.protocols]);

  // All available categories from protocol data
  const availableCategories = React.useMemo(() => {
    if (!analysis?.protocols) return [];
    const categoriesSet = new Set<DeFiProtocolCategory>();
    analysis.protocols.forEach(protocol => {
      categoriesSet.add(protocol.category);
    });
    return Array.from(categoriesSet);
  }, [analysis?.protocols]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-primary" />
              Eliza DeFi Console
            </CardTitle>
            <CardDescription>
              AI-powered DeFi portfolio analysis and recommendations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchDeFiAnalysis()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="protocols">Protocols</TabsTrigger>
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="advisor">Advisor</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="px-6 pt-4 pb-2 border-b">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-sm font-medium mr-2">Filters:</span>
              </div>
              
              <Select value={selectedRiskLevel} onValueChange={handleRiskLevelChange}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk Only</SelectItem>
                  <SelectItem value="medium">Up to Medium Risk</SelectItem>
                  <SelectItem value="high">Up to High Risk</SelectItem>
                  <SelectItem value="very_high">All Risk Levels</SelectItem>
                </SelectContent>
              </Select>
              
              <Accordion type="multiple" className="w-auto">
                <AccordionItem value="categories" className="border-none">
                  <AccordionTrigger className="py-0 text-sm">
                    <div className="flex items-center gap-1">
                      <GanttChartSquare className="h-4 w-4" />
                      <span>Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-1 pt-2">
                      {availableCategories.map((category) => (
                        <Badge 
                          key={category}
                          variant={selectedCategories.includes(category) ? "default" : "outline"} 
                          className="cursor-pointer"
                          onClick={() => toggleCategoryFilter(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <Accordion type="multiple" className="w-auto">
                <AccordionItem value="chains" className="border-none">
                  <AccordionTrigger className="py-0 text-sm">
                    <div className="flex items-center gap-1">
                      <ListFilter className="h-4 w-4" />
                      <span>Chains {selectedChains.length > 0 && `(${selectedChains.length})`}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-1 pt-2">
                      {availableChains.map((chain) => (
                        <Badge 
                          key={chain}
                          variant={selectedChains.includes(chain) ? "default" : "outline"} 
                          className="cursor-pointer"
                          onClick={() => toggleChainFilter(chain)}
                        >
                          {chain}
                        </Badge>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          
          <TabsContent value="overview" className="m-0 p-6 space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 animate-pulse bg-muted rounded"></div>
                <div className="h-40 animate-pulse bg-muted rounded"></div>
                <div className="h-60 animate-pulse bg-muted rounded"></div>
              </div>
            ) : !analysis ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No DeFi data available</p>
              </div>
            ) : (
              <>
                <DeFiMetricsCards metrics={analysis.metrics} />
                <DeFiRiskAssessment riskAssessment={analysis.risk_assessment} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Protocol Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {analysis.protocols.length > 0 ? (
                        <div className="space-y-2">
                          {analysis.protocols.slice(0, 5).map(protocol => (
                            <div key={protocol.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback>{protocol.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{protocol.name}</span>
                              </div>
                              <Badge variant={
                                protocol.risk_level === 'low' ? 'outline' : 
                                protocol.risk_level === 'medium' ? 'secondary' : 
                                'destructive'
                              }>
                                {protocol.risk_level}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No protocols available</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Recent Positions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {analysis.positions.length > 0 ? (
                        <div className="space-y-2">
                          {analysis.positions.slice(0, 5).map(position => (
                            <div key={position.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm">{position.protocol_name} - {position.asset_symbol}</span>
                              </div>
                              <span className="text-sm font-medium">
                                ${position.usd_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No positions available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="protocols" className="m-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <div className="h-60 animate-pulse bg-muted rounded"></div>
              </div>
            ) : !analysis?.protocols ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No protocol data available</p>
              </div>
            ) : (
              <DeFiProtocolsList protocols={analysis.protocols} />
            )}
          </TabsContent>
          
          <TabsContent value="positions" className="m-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <div className="h-60 animate-pulse bg-muted rounded"></div>
              </div>
            ) : !analysis?.positions ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No position data available</p>
              </div>
            ) : (
              <DeFiPositionsTable positions={analysis.positions} />
            )}
          </TabsContent>
          
          <TabsContent value="advisor" className="m-0 p-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 animate-pulse bg-muted rounded"></div>
                <div className="h-40 animate-pulse bg-muted rounded"></div>
              </div>
            ) : !analysis ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No DeFi data available for advisor</p>
              </div>
            ) : (
              renderElizaInterface()
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-2 pb-4 px-6">
        Last updated: {analysis ? new Date(analysis.timestamp).toLocaleString() : 'Never'}
      </CardFooter>
    </Card>
  );
}
