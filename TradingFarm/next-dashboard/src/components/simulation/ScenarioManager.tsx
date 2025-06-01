"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BookOpen, Copy, Download, FileText, History, 
  PlusCircle, Search, Star, Trash2, Upload, Zap, 
  Calendar, ClipboardList, PencilRuler
} from "lucide-react";

interface ScenarioEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  impact: number;
  duration: number;
}

interface MarketScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  initialMarketState: {
    trend: "bullish" | "bearish" | "neutral";
    volatility: number;
    volume: number;
  };
  events: ScenarioEvent[];
  tags: string[];
  createdAt: string;
  createdBy: string;
  isBuiltIn: boolean;
  isFavorite: boolean;
}

interface ScenarioManagerProps {
  onSelectScenario?: (scenarioId: string) => void;
  onCreateScenario?: (scenario: any) => void;
  selectedScenarioId?: string;
}

export function ScenarioManager({
  onSelectScenario,
  onCreateScenario,
  selectedScenarioId
}: ScenarioManagerProps) {
  // Sample scenarios
  const defaultScenarios: MarketScenario[] = [
    {
      id: "scenario-1",
      name: "Bull Market Rally",
      description: "Simulates a strong bull market with steady uptrend and occasional consolidation periods",
      category: "bullish",
      duration: 180,
      initialMarketState: {
        trend: "bullish",
        volatility: 15,
        volume: 80
      },
      events: [
        {
          id: "event-1-1",
          timestamp: "2025-01-15T00:00:00Z",
          type: "news",
          description: "Positive economic data release",
          impact: 2,
          duration: 2
        },
        {
          id: "event-1-2",
          timestamp: "2025-02-01T00:00:00Z",
          type: "fundamental",
          description: "Interest rate decrease announcement",
          impact: 4,
          duration: 5
        }
      ],
      tags: ["bull-market", "uptrend", "low-volatility"],
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "System",
      isBuiltIn: true,
      isFavorite: true
    },
    {
      id: "scenario-2",
      name: "Market Crash",
      description: "Simulates a market crash with sharp decline followed by volatility",
      category: "bearish",
      duration: 90,
      initialMarketState: {
        trend: "bearish",
        volatility: 45,
        volume: 120
      },
      events: [
        {
          id: "event-2-1",
          timestamp: "2025-01-05T00:00:00Z",
          type: "crisis",
          description: "Banking system crisis",
          impact: 8,
          duration: 7
        },
        {
          id: "event-2-2",
          timestamp: "2025-01-12T00:00:00Z",
          type: "liquidity",
          description: "Liquidity crunch in markets",
          impact: 6,
          duration: 10
        }
      ],
      tags: ["crash", "high-volatility", "crisis"],
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "System",
      isBuiltIn: true,
      isFavorite: false
    },
    {
      id: "scenario-3",
      name: "Sideways Market",
      description: "Rangebound market with low volatility and no clear trend",
      category: "neutral",
      duration: 120,
      initialMarketState: {
        trend: "neutral",
        volatility: 12,
        volume: 60
      },
      events: [
        {
          id: "event-3-1",
          timestamp: "2025-02-10T00:00:00Z",
          type: "news",
          description: "Mixed economic indicators",
          impact: 1,
          duration: 1
        }
      ],
      tags: ["sideways", "consolidation", "low-volatility"],
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "System",
      isBuiltIn: true,
      isFavorite: true
    },
    {
      id: "scenario-4",
      name: "Recovery Phase",
      description: "Market recovery after prolonged downtrend",
      category: "bullish",
      duration: 150,
      initialMarketState: {
        trend: "bullish",
        volatility: 25,
        volume: 90
      },
      events: [
        {
          id: "event-4-1",
          timestamp: "2025-03-01T00:00:00Z",
          type: "policy",
          description: "Stimulus package announcement",
          impact: 5,
          duration: 3
        }
      ],
      tags: ["recovery", "medium-volatility", "bullish"],
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "System",
      isBuiltIn: true,
      isFavorite: false
    }
  ];
  
  const [scenarios, setScenarios] = useState<MarketScenario[]>(defaultScenarios);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("library");
  const [eventType, setEventType] = useState("news");
  const [showBuiltInOnly, setShowBuiltInOnly] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<MarketScenario | null>(null);
  
  // Event types for dropdown
  const eventTypes = [
    { label: "News Event", value: "news" },
    { label: "Economic Data", value: "economic" },
    { label: "Policy Change", value: "policy" },
    { label: "Market Crisis", value: "crisis" },
    { label: "Technical Event", value: "technical" }
  ];
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Toggle favorite status
  const toggleFavorite = (scenarioId: string) => {
    setScenarios(prev => 
      prev.map(scenario => 
        scenario.id === scenarioId ? 
          { ...scenario, isFavorite: !scenario.isFavorite } : 
          scenario
      )
    );
  };
  
  // Select a scenario
  const handleSelectScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    setSelectedScenario(scenario || null);
    
    if (onSelectScenario) {
      onSelectScenario(scenarioId);
    }
  };
  
  // Filter scenarios based on search query and filters
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = 
      scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      scenario.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = showBuiltInOnly ? scenario.isBuiltIn : true;
    
    return matchesSearch && matchesFilter;
  });
  
  // Get category badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "bullish":
        return <Badge className="bg-green-500">Bullish</Badge>;
      case "bearish":
        return <Badge className="bg-red-500">Bearish</Badge>;
      case "neutral":
        return <Badge variant="outline">Neutral</Badge>;
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Market Scenario Manager</CardTitle>
            <CardDescription>
              Create and manage market scenarios for simulation
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!selectedScenario}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Scenario
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="library" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library">
              <BookOpen className="h-4 w-4 mr-2" />
              Scenario Library
            </TabsTrigger>
            <TabsTrigger value="builder">
              <PencilRuler className="h-4 w-4 mr-2" />
              Scenario Builder
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Historical Events
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="library" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scenarios..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="show-builtin" className="text-sm cursor-pointer">
                  Built-in only
                </Label>
                <Switch
                  id="show-builtin"
                  checked={showBuiltInOnly}
                  onCheckedChange={setShowBuiltInOnly}
                />
              </div>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScenarios.map((scenario) => (
                    <TableRow 
                      key={scenario.id}
                      className={selectedScenarioId === scenario.id ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleFavorite(scenario.id)}
                        >
                          <Star className={`h-4 w-4 ${scenario.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{scenario.name}</div>
                        <div className="text-xs text-muted-foreground">{scenario.description.substring(0, 50)}...</div>
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(scenario.category)}
                      </TableCell>
                      <TableCell>
                        {scenario.duration} days
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scenario.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {scenario.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{scenario.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSelectScenario(scenario.id)}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={scenario.isBuiltIn}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredScenarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No scenarios found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="builder" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input id="scenario-name" placeholder="Enter scenario name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario-description">Description</Label>
                  <Textarea 
                    id="scenario-description" 
                    placeholder="Describe the market scenario..." 
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenario-category">Market Category</Label>
                    <Select defaultValue="neutral">
                      <SelectTrigger id="scenario-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bullish">Bullish</SelectItem>
                        <SelectItem value="bearish">Bearish</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="volatile">Volatile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scenario-duration">Duration (days)</Label>
                    <Input 
                      id="scenario-duration" 
                      type="number" 
                      min={1} 
                      max={365} 
                      defaultValue={90} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="volatility">Market Volatility</Label>
                    <span className="text-sm text-muted-foreground">30%</span>
                  </div>
                  <Slider
                    id="volatility"
                    defaultValue={[30]}
                    max={100}
                    step={1}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="volume">Trading Volume</Label>
                    <span className="text-sm text-muted-foreground">75%</span>
                  </div>
                  <Slider
                    id="volume"
                    defaultValue={[75]}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Market Events</h3>
                  <Button size="sm" variant="outline">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
                
                <div className="border rounded-md p-4 space-y-3">
                  <div className="text-sm font-medium">New Event</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="event-type">Event Type</Label>
                      <Select 
                        value={eventType} 
                        onValueChange={setEventType}
                      >
                        <SelectTrigger id="event-type">
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="event-time">Day</Label>
                      <Input 
                        id="event-time" 
                        type="number" 
                        min={1} 
                        defaultValue={14} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Input 
                      id="event-description" 
                      placeholder="Describe the event..." 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="event-impact">Market Impact</Label>
                        <span className="text-sm text-muted-foreground">5</span>
                      </div>
                      <Slider
                        id="event-impact"
                        defaultValue={[5]}
                        max={10}
                        step={1}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="event-duration">Duration (days)</Label>
                      <Input 
                        id="event-duration" 
                        type="number" 
                        min={1} 
                        defaultValue={3} 
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button size="sm">Add Event</Button>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <div className="px-3 py-2 bg-muted/50 text-sm font-medium">
                    Scenario Events Timeline
                  </div>
                  <div className="p-3 text-center text-sm text-muted-foreground py-12">
                    No events added yet
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline">Save as Draft</Button>
                  <Button>Create Scenario</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Historical Market Events</h3>
              <div className="space-x-2">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Filter by Date
                </Button>
                <Button variant="outline" size="sm">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Event Categories
                </Button>
              </div>
            </div>
            
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Historical event library will be available here</p>
              <p className="text-xs mt-1">Import historical data or select from our pre-built library</p>
              <Button variant="outline" className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                Import Historical Data
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
