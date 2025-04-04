import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, PieChart, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { toast } from 'sonner';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Type definitions for cache stats
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  pattern_deletes: number;
  errors: number;
  hit_rate: number;
  memory_used: number;
  total_connections: number;
  uptime: number;
}

interface DailyStats {
  [date: string]: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    pattern_deletes: number;
    errors: number;
    hit_rate: number;
  };
}

// Format bytes to human-readable format
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format time in seconds to human-readable format
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${days}d ${hours}h ${minutes}m`;
};

const CacheAnalyticsDashboard = () => {
  const [currentStats, setCurrentStats] = useState<CacheStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('7');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchCacheStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/cache/analytics');
      const data = await response.json();
      
      if (data.success) {
        setCurrentStats(data.data);
      } else {
        toast.error('Failed to fetch cache statistics');
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      toast.error('Error fetching cache statistics');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDailyStats = async (days: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cache/analytics?daily=true&days=${days}`);
      const data = await response.json();
      
      if (data.success) {
        setDailyStats(data.data);
      } else {
        toast.error('Failed to fetch daily cache statistics');
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      toast.error('Error fetching daily cache statistics');
    } finally {
      setLoading(false);
    }
  };

  const clearAllCache = async () => {
    if (!window.confirm('Are you sure you want to clear all cached data? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Cache cleared successfully');
        fetchCacheStats();
        fetchDailyStats(timeRange);
      } else {
        toast.error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Error clearing cache');
    }
  };

  useEffect(() => {
    fetchCacheStats();
    fetchDailyStats(timeRange);
    
    // Set up refresh interval - every 5 minutes
    const intervalId = setInterval(() => {
      fetchCacheStats();
      fetchDailyStats(timeRange);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchDailyStats(timeRange);
  }, [timeRange]);

  // Chart configurations
  const hitRateChartData = {
    labels: dailyStats ? Object.keys(dailyStats).reverse() : [],
    datasets: [
      {
        label: 'Hit Rate (%)',
        data: dailyStats ? Object.keys(dailyStats).map(date => dailyStats[date].hit_rate).reverse() : [],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const operationsChartData = {
    labels: dailyStats ? Object.keys(dailyStats).reverse() : [],
    datasets: [
      {
        label: 'Hits',
        data: dailyStats ? Object.keys(dailyStats).map(date => dailyStats[date].hits).reverse() : [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
      },
      {
        label: 'Misses',
        data: dailyStats ? Object.keys(dailyStats).map(date => dailyStats[date].misses).reverse() : [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
      },
      {
        label: 'Sets',
        data: dailyStats ? Object.keys(dailyStats).map(date => dailyStats[date].sets).reverse() : [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
      },
    ],
  };

  const cacheDistributionData = {
    labels: ['Hits', 'Misses'],
    datasets: [
      {
        data: currentStats ? [currentStats.hits, currentStats.misses] : [0, 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Cache Analytics</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => {
              fetchCacheStats();
              fetchDailyStats(timeRange);
            }} 
            size="sm" 
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={clearAllCache} size="sm" variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Cache
          </Button>
        </div>
      </div>

      {currentStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.hit_rate}%</div>
              <Progress className="mt-2" value={currentStats.hit_rate} />
              <p className="text-xs text-muted-foreground mt-2">
                {currentStats.hits} hits / {currentStats.hits + currentStats.misses} requests
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Operations</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.sets.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total cache entries created
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Deletes:</span>
                  <span>{currentStats.deletes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pattern Deletes:</span>
                  <span>{currentStats.pattern_deletes.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(currentStats.memory_used)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Redis memory usage
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Server Status</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M3 9h18" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">Active</div>
              <div className="text-xs text-muted-foreground mt-2">
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span>{formatUptime(currentStats.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connections:</span>
                  <span>{currentStats.total_connections}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="hit-rate">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="hit-rate">Hit Rate Trend</TabsTrigger>
          <TabsTrigger value="operations">Cache Operations</TabsTrigger>
          <TabsTrigger value="distribution">Cache Distribution</TabsTrigger>
        </TabsList>
        
        <div className="mb-4">
          <div className="flex justify-end space-x-2">
            <Button 
              variant={timeRange === '7' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeRange('7')}
            >
              7 Days
            </Button>
            <Button 
              variant={timeRange === '14' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeRange('14')}
            >
              14 Days
            </Button>
            <Button 
              variant={timeRange === '30' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeRange('30')}
            >
              30 Days
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <TabsContent value="hit-rate" className="mt-0">
              <CardDescription className="mb-4">Cache hit rate percentage over time</CardDescription>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="h-80">
                  <Line 
                    data={hitRateChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          title: {
                            display: true,
                            text: 'Hit Rate (%)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Date'
                          }
                        }
                      }
                    }} 
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="operations" className="mt-0">
              <CardDescription className="mb-4">Daily cache operations breakdown</CardDescription>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="h-80">
                  <Bar 
                    data={operationsChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Count'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Date'
                          }
                        }
                      }
                    }} 
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="distribution" className="mt-0">
              <CardDescription className="mb-4">Current cache hit/miss distribution</CardDescription>
              {!currentStats ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="h-80 flex justify-center items-center">
                  <div className="w-1/2 h-full">
                    <Pie 
                      data={cacheDistributionData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right'
                          }
                        }
                      }} 
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default CacheAnalyticsDashboard;
