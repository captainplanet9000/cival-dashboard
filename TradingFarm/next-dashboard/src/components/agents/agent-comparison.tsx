/**
 * Agent Comparison Component
 * Provides visual comparison of performance metrics between multiple agents
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, RadarChart } from '@/components/charts';
import { AlertTriangle, ArrowDown, ArrowUp, Info, Minus, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface AgentComparisonProps {
  data: any;
  timeframe: 'daily' | 'weekly' | 'monthly';
  onRefresh: () => void;
  mainAgentId: string;
}

export function AgentComparison({ data, timeframe, onRefresh, mainAgentId }: AgentComparisonProps) {
  const [comparisonMetric, setComparisonMetric] = useState('successRate');
  const [chartType, setChartType] = useState('bar');
  
  // Get agent color for consistent display
  const getAgentColor = (index: number) => {
    const colors = [
      'rgba(59, 130, 246, 1)', // blue
      'rgba(16, 185, 129, 1)', // green
      'rgba(239, 68, 68, 1)',  // red
      'rgba(217, 119, 6, 1)',  // amber
      'rgba(124, 58, 237, 1)', // purple
      'rgba(6, 182, 212, 1)',  // cyan
      'rgba(236, 72, 153, 1)', // pink
      'rgba(139, 92, 246, 1)', // indigo
    ];
    
    return colors[index % colors.length];
  };
  
  // Function to get comparison data for charts
  const getComparisonChartData = () => {
    if (!data || !data.agents || data.agents.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'No Data',
            data: [0],
            backgroundColor: 'rgba(200, 200, 200, 0.5)',
          }
        ]
      };
    }
    
    // Add labels based on metric and timeframe
    let metricLabel = '';
    switch (comparisonMetric) {
      case 'successRate':
        metricLabel = 'Success Rate (%)';
        break;
      case 'avgResponseTime':
        metricLabel = 'Avg. Response Time (ms)';
        break;
      case 'errorRate':
        metricLabel = 'Error Rate (%)';
        break;
      case 'throughput':
        metricLabel = 'Requests Processed';
        break;
      case 'uptime':
        metricLabel = 'Uptime (%)';
        break;
      default:
        metricLabel = 'Value';
    }
    
    // Create datasets for each agent
    let datasets = [];
    
    // For bar or line charts
    if (chartType === 'bar' || chartType === 'line') {
      // Get time period labels based on timeframe
      let labels = [];
      if (timeframe === 'daily') {
        // Last 7 days
        labels = data.timeLabels || Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return format(date, 'MMM dd');
        });
      } else if (timeframe === 'weekly') {
        // Last 4 weeks
        labels = data.timeLabels || Array.from({ length: 4 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - ((3 - i) * 7));
          return `Week ${i + 1}`;
        });
      } else {
        // Last 6 months
        labels = data.timeLabels || Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          return format(date, 'MMM yyyy');
        });
      }
      
      // Create a dataset for each agent
      datasets = data.agents.map((agent: any, index: number) => {
        const color = getAgentColor(index);
        
        // Transform data based on metric
        let metricData = agent.metrics[comparisonMetric] || [];
        
        // For percentages, multiply by 100
        if (comparisonMetric === 'successRate' || comparisonMetric === 'errorRate' || comparisonMetric === 'uptime') {
          metricData = metricData.map((value: number) => value * 100);
        }
        
        return {
          label: agent.name || `Agent ${agent.id}`,
          data: metricData,
          backgroundColor: `${color}80`,
          borderColor: color,
          borderWidth: agent.id === mainAgentId ? 3 : 1,
          borderDash: agent.id === mainAgentId ? [] : [],
          tension: 0.2,
          fill: chartType === 'line',
        };
      });
      
      return { labels, datasets };
    } 
    // For radar chart
    else if (chartType === 'radar') {
      // Use metrics as labels
      const labels = [
        'Success Rate',
        'Response Time',
        'Error Rate',
        'Throughput',
        'Uptime'
      ];
      
      // Create a dataset for each agent using their average values
      datasets = data.agents.map((agent: any, index: number) => {
        const color = getAgentColor(index);
        
        // Extract average values for each metric and normalize them
        const avgSuccessRate = agent.averages.successRate * 100;
        // For response time, lower is better, so invert the scale
        const maxResponseTime = Math.max(...data.agents.map((a: any) => a.averages.avgResponseTime));
        const normalizedResponseTime = maxResponseTime > 0 
          ? 100 - ((agent.averages.avgResponseTime / maxResponseTime) * 100)
          : 50;
        // For error rate, lower is better, so invert the scale
        const errorRate = 100 - (agent.averages.errorRate * 100);
        // Normalize throughput to 0-100 scale
        const maxThroughput = Math.max(...data.agents.map((a: any) => a.averages.throughput));
        const normalizedThroughput = maxThroughput > 0 
          ? (agent.averages.throughput / maxThroughput) * 100
          : 50;
        // Uptime as percentage
        const uptime = agent.averages.uptime * 100;
        
        return {
          label: agent.name || `Agent ${agent.id}`,
          data: [
            avgSuccessRate,
            normalizedResponseTime,
            errorRate,
            normalizedThroughput,
            uptime
          ],
          backgroundColor: `${color}40`,
          borderColor: color,
          borderWidth: agent.id === mainAgentId ? 3 : 1,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: color,
          pointRadius: agent.id === mainAgentId ? 5 : 3,
        };
      });
      
      return { labels, datasets };
    }
    
    return { labels: [], datasets: [] };
  };
  
  // Get options for charts
  const getChartOptions = () => {
    // Options for bar or line charts
    if (chartType === 'bar' || chartType === 'line') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: getMetricLabel(),
            },
            // Set max to 100 for percentage metrics
            ...(comparisonMetric === 'successRate' || 
               comparisonMetric === 'errorRate' || 
               comparisonMetric === 'uptime') && { max: 100 },
          }
        },
        plugins: {
          legend: {
            position: 'top' as const,
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                
                if (comparisonMetric === 'successRate' || 
                    comparisonMetric === 'errorRate' || 
                    comparisonMetric === 'uptime') {
                  label += `${context.parsed.y.toFixed(1)}%`;
                } else if (comparisonMetric === 'avgResponseTime') {
                  label += `${context.parsed.y.toFixed(0)} ms`;
                } else {
                  label += context.parsed.y.toFixed(1);
                }
                
                return label;
              }
            }
          }
        }
      };
    } 
    // Options for radar chart
    else if (chartType === 'radar') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              showLabelBackdrop: false,
              font: {
                size: 10
              }
            },
            pointLabels: {
              font: {
                size: 12
              }
            },
            grid: {
              circular: true
            },
            angleLines: {
              display: true
            }
          }
        },
        plugins: {
          legend: {
            position: 'top' as const,
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.dataset.label || '';
                const value = context.raw.toFixed(1);
                const metric = context.chart.data.labels[context.dataIndex];
                
                return `${label}: ${value} (${metric})`;
              }
            }
          }
        }
      };
    }
    
    return {};
  };
  
  // Helper to generate metric label
  const getMetricLabel = () => {
    switch (comparisonMetric) {
      case 'successRate':
        return 'Success Rate (%)';
      case 'avgResponseTime':
        return 'Avg. Response Time (ms)';
      case 'errorRate':
        return 'Error Rate (%)';
      case 'throughput':
        return 'Requests Processed';
      case 'uptime':
        return 'Uptime (%)';
      default:
        return 'Value';
    }
  };
  
  // Format comparison values
  const formatComparisonValue = (value: number, metric: string) => {
    switch (metric) {
      case 'successRate':
      case 'errorRate':
      case 'uptime':
        return `${(value * 100).toFixed(1)}%`;
      case 'avgResponseTime':
        return `${value.toFixed(0)} ms`;
      default:
        return value.toFixed(1);
    }
  };
  
  // Get trend icon based on metric and value
  const getTrendIcon = (metric: string, value: number) => {
    // For response time and error rate, down is better
    const isDownBetter = metric === 'avgResponseTime' || metric === 'errorRate';
    
    if (value > 0) {
      return isDownBetter ? 
        <TrendingDown className="h-4 w-4 text-red-500" /> : 
        <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return isDownBetter ? 
        <TrendingUp className="h-4 w-4 text-green-500" /> : 
        <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Generate compact performance summary table
  const renderComparisonTable = () => {
    if (!data || !data.agents || data.agents.length === 0) {
      return <p className="text-muted-foreground">No comparison data available</p>;
    }
    
    // Find the main agent for comparison
    const mainAgent = data.agents.find((agent: any) => agent.id === mainAgentId);
    if (!mainAgent) {
      return <p className="text-muted-foreground">Main agent data not available</p>;
    }
    
    // Other agents to compare with
    const otherAgents = data.agents.filter((agent: any) => agent.id !== mainAgentId);
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium">Metric</th>
              <th className="text-right py-2 px-2 font-medium">
                {mainAgent.name || `Agent ${mainAgent.id}`}
              </th>
              {otherAgents.map((agent: any) => (
                <th key={agent.id} className="text-right py-2 px-2 font-medium">
                  {agent.name || `Agent ${agent.id}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Success Rate Row */}
            <tr className="border-b">
              <td className="py-2 px-2 text-sm">Success Rate</td>
              <td className="text-right py-2 px-2 font-medium">
                {formatComparisonValue(mainAgent.averages.successRate, 'successRate')}
              </td>
              {otherAgents.map((agent: any) => {
                const diff = agent.averages.successRate - mainAgent.averages.successRate;
                return (
                  <td key={agent.id} className="text-right py-2 px-2">
                    <div className="flex items-center justify-end">
                      {getTrendIcon('successRate', diff)}
                      <span className="ml-1">
                        {formatComparisonValue(agent.averages.successRate, 'successRate')}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Response Time Row */}
            <tr className="border-b">
              <td className="py-2 px-2 text-sm">Avg. Response Time</td>
              <td className="text-right py-2 px-2 font-medium">
                {formatComparisonValue(mainAgent.averages.avgResponseTime, 'avgResponseTime')}
              </td>
              {otherAgents.map((agent: any) => {
                const diff = agent.averages.avgResponseTime - mainAgent.averages.avgResponseTime;
                return (
                  <td key={agent.id} className="text-right py-2 px-2">
                    <div className="flex items-center justify-end">
                      {getTrendIcon('avgResponseTime', diff)}
                      <span className="ml-1">
                        {formatComparisonValue(agent.averages.avgResponseTime, 'avgResponseTime')}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Error Rate Row */}
            <tr className="border-b">
              <td className="py-2 px-2 text-sm">Error Rate</td>
              <td className="text-right py-2 px-2 font-medium">
                {formatComparisonValue(mainAgent.averages.errorRate, 'errorRate')}
              </td>
              {otherAgents.map((agent: any) => {
                const diff = agent.averages.errorRate - mainAgent.averages.errorRate;
                return (
                  <td key={agent.id} className="text-right py-2 px-2">
                    <div className="flex items-center justify-end">
                      {getTrendIcon('errorRate', diff)}
                      <span className="ml-1">
                        {formatComparisonValue(agent.averages.errorRate, 'errorRate')}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Throughput Row */}
            <tr className="border-b">
              <td className="py-2 px-2 text-sm">Throughput</td>
              <td className="text-right py-2 px-2 font-medium">
                {formatComparisonValue(mainAgent.averages.throughput, 'throughput')}
              </td>
              {otherAgents.map((agent: any) => {
                const diff = agent.averages.throughput - mainAgent.averages.throughput;
                return (
                  <td key={agent.id} className="text-right py-2 px-2">
                    <div className="flex items-center justify-end">
                      {getTrendIcon('throughput', diff)}
                      <span className="ml-1">
                        {formatComparisonValue(agent.averages.throughput, 'throughput')}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Uptime Row */}
            <tr>
              <td className="py-2 px-2 text-sm">Uptime</td>
              <td className="text-right py-2 px-2 font-medium">
                {formatComparisonValue(mainAgent.averages.uptime, 'uptime')}
              </td>
              {otherAgents.map((agent: any) => {
                const diff = agent.averages.uptime - mainAgent.averages.uptime;
                return (
                  <td key={agent.id} className="text-right py-2 px-2">
                    <div className="flex items-center justify-end">
                      {getTrendIcon('uptime', diff)}
                      <span className="ml-1">
                        {formatComparisonValue(agent.averages.uptime, 'uptime')}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Comparison Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={comparisonMetric}
            onValueChange={setComparisonMetric}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Success Rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="successRate">Success Rate</SelectItem>
              <SelectItem value="avgResponseTime">Response Time</SelectItem>
              <SelectItem value="errorRate">Error Rate</SelectItem>
              <SelectItem value="throughput">Throughput</SelectItem>
              <SelectItem value="uptime">Uptime</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-1">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'radar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('radar')}
            >
              <Scale className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Badge variant="outline" className="py-2 px-4 text-xs">
          <Info className="h-3 w-3 mr-1" />
          Comparing {data?.agents?.length || 0} agents
        </Badge>
      </div>
      
      {/* Performance Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Comparison</CardTitle>
          <CardDescription>
            {chartType === 'radar' 
              ? 'Overall performance comparison across key metrics'
              : `Comparing ${getMetricLabel()} over time`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {chartType === 'bar' && (
              <BarChart data={getComparisonChartData()} options={getChartOptions()} />
            )}
            {chartType === 'line' && (
              <LineChart data={getComparisonChartData()} options={getChartOptions()} />
            )}
            {chartType === 'radar' && (
              <RadarChart data={getComparisonChartData()} options={getChartOptions()} />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>
            Average metrics comparison across agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderComparisonTable()}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>Values show the difference compared to the main agent</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
