"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, PieChart, LineChart, Activity, FileText, SearchIcon, 
  Calendar, Clock, Brain, BrainCircuit, Download, Share2
} from "lucide-react";

// Import recharts components
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";

interface KnowledgeAnalyticsDashboardProps {
  farmId?: string;
}

export function KnowledgeAnalyticsDashboard({ farmId }: KnowledgeAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");
  const supabase = createBrowserClient();

  // Fetch knowledge analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["knowledgeAnalytics", farmId, timeRange],
    queryFn: async () => {
      try {
        // In a real implementation, this would fetch from the database
        // For demo purposes, we'll return mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock query metrics data
        const queryData = {
          totalQueries: 287,
          topQueries: [
            { query: "How do moving averages work in trading?", count: 12 },
            { query: "What are the best risk management strategies?", count: 10 },
            { query: "How to implement a mean reversion strategy?", count: 8 },
            { query: "Compare trend following vs counter-trend strategies", count: 7 },
            { query: "What indicators work best for crypto volatility?", count: 6 }
          ],
          queryHistory: [
            { date: "2025-03-13", count: 8 },
            { date: "2025-03-14", count: 12 },
            { date: "2025-03-15", count: 9 },
            { date: "2025-03-16", count: 15 },
            { date: "2025-03-17", count: 11 },
            { date: "2025-03-18", count: 14 },
            { date: "2025-03-19", count: 10 },
            { date: "2025-03-20", count: 17 },
            { date: "2025-03-21", count: 13 },
            { date: "2025-03-22", count: 16 },
            { date: "2025-04-09", count: 18 },
            { date: "2025-04-10", count: 21 },
            { date: "2025-04-11", count: 19 },
            { date: "2025-04-12", count: 15 }
          ],
          queryTypes: [
            { type: "Knowledge Query", count: 150 },
            { type: "Strategy Analysis", count: 75 },
            { type: "Code Generation", count: 42 },
            { type: "Chat", count: 20 }
          ]
        };
        
        // Mock content metrics data
        const contentData = {
          totalDocuments: 67,
          totalKnowledgeChunks: 423,
          categoryCounts: [
            { category: "Strategy", count: 24 },
            { category: "Market Analysis", count: 18 },
            { category: "Risk Management", count: 12 },
            { category: "Technical", count: 8 },
            { category: "Documentation", count: 5 }
          ],
          topDocuments: [
            { title: "Moving Average Crossover Strategy", type: "strategy", views: 37 },
            { title: "Risk Management Best Practices", type: "documentation", views: 29 },
            { title: "Volatility Analysis Methods", type: "market_analysis", views: 25 },
            { title: "Algorithmic Trading Fundamentals", type: "technical", views: 22 },
            { title: "Quantitative Mean Reversion", type: "strategy", views: 19 }
          ],
          contentGrowth: [
            { date: "2025-01", count: 12 },
            { date: "2025-02", count: 18 },
            { date: "2025-03", count: 25 },
            { date: "2025-04", count: 12 }
          ]
        };
        
        // Mock usage metrics
        const usageData = {
          totalUsage: 768,
          usageByUser: [
            { user: "John Smith", count: 145 },
            { user: "Maria Garcia", count: 112 },
            { user: "Robert Johnson", count: 98 },
            { user: "Lisa Chen", count: 76 },
            { user: "Other Users", count: 337 }
          ],
          featureUsage: [
            { feature: "Knowledge Search", count: 287 },
            { feature: "Strategy Generation", count: 156 },
            { feature: "Document Upload", count: 67 },
            { feature: "Visualization", count: 128 },
            { feature: "Advanced Queries", count: 130 }
          ],
          usageByAgent: [
            { agent: "Market Analysis Agent", count: 187 },
            { agent: "Strategy Developer", count: 156 },
            { agent: "Risk Manager", count: 123 },
            { agent: "Portfolio Optimizer", count: 98 },
            { agent: "Trading Execution", count: 67 },
            { agent: "Manual Queries", count: 137 }
          ]
        };
        
        return {
          query: queryData,
          content: contentData,
          usage: usageData
        };
      } catch (error) {
        console.error("Error fetching knowledge analytics:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Loading state UI
  if (isLoading || !analyticsData) {
    return (
      <Card className="w-full h-full min-h-[400px]">
        <CardHeader>
          <CardTitle>Knowledge Analytics</CardTitle>
          <CardDescription>Loading dashboard data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center">
            <BrainCircuit className="h-10 w-10 text-primary animate-pulse mb-2" />
            <p className="text-muted-foreground text-sm">Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge Analytics</CardTitle>
            <CardDescription>
              Insights into your ElizaOS knowledge base utilization
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" className="h-8">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 h-9">
            <TabsTrigger value="overview" className="text-xs">
              <Activity className="h-3.5 w-3.5 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Content Analysis
            </TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">
              <SearchIcon className="h-3.5 w-3.5 mr-1" />
              Query Analytics
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{analyticsData.query.totalQueries}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">+8.2%</span> from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Knowledge Documents</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{analyticsData.content.totalDocuments}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">+12.5%</span> from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Knowledge Chunks</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-2xl font-bold">{analyticsData.content.totalKnowledgeChunks}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">+15.3%</span> from previous period
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Query Activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={analyticsData.query.queryHistory}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Content Categories</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.content.categoryCounts}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analyticsData.content.categoryCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Top Accessed Documents</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {analyticsData.content.topDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div className="flex items-center">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {doc.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span className="text-sm">{doc.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Content Analysis Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Content Growth Over Time</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={analyticsData.content.contentGrowth}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Documents Added" fill="#8884d8" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Content Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.content.categoryCounts}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analyticsData.content.categoryCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Document Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Embedding Coverage</span>
                        <span className="text-xs font-medium">98%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "98%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Chunk Quality</span>
                        <span className="text-xs font-medium">87%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "87%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Metadata Completeness</span>
                        <span className="text-xs font-medium">74%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "74%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Cross-referencing</span>
                        <span className="text-xs font-medium">62%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "62%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Knowledge Coverage</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                      <div className="text-3xl font-bold">87%</div>
                      <div className="text-xs text-muted-foreground mt-1">Strategy Coverage</div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                      <div className="text-3xl font-bold">92%</div>
                      <div className="text-xs text-muted-foreground mt-1">Market Analysis</div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                      <div className="text-3xl font-bold">78%</div>
                      <div className="text-xs text-muted-foreground mt-1">Risk Management</div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                      <div className="text-3xl font-bold">65%</div>
                      <div className="text-xs text-muted-foreground mt-1">Technical Content</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Query Analytics Tab */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Query Types</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={analyticsData.query.queryTypes}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Queries" fill="#0088FE" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Agent Usage</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.usage.usageByAgent.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name.slice(0, 12)}...: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analyticsData.usage.usageByAgent.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Top Queries</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {analyticsData.query.topQueries.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center">
                          <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs">
                            {index + 1}
                          </div>
                          <p className="text-sm">{item.query}</p>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Query Performance</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Average Response Time</span>
                        <span className="text-xs font-medium">1.23s</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "82%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Relevance Score</span>
                        <span className="text-xs font-medium">88%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "88%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">Source Citation Rate</span>
                        <span className="text-xs font-medium">96%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "96%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">User Satisfaction</span>
                        <span className="text-xs font-medium">91%</span>
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-full bg-primary rounded" style={{ width: "91%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Usage by Feature</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsBarChart
                      data={analyticsData.usage.featureUsage}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="feature" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0088FE" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
