"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { FileType, Calendar, Tag, Clock, HelpCircle } from "lucide-react";

interface BrainFile {
  id: string;
  file_id: string;
  file_name: string;
  file_type: string;
  description: string | null;
  tags: string[] | null;
  brain_id: string | null;
  embedding_status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface TimeframeOption {
  label: string;
  days: number;
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "All Time", days: 9999 },
];

const FILE_TYPE_COLORS = [
  "#8884d8", // purple
  "#82ca9d", // green
  "#ffc658", // yellow
  "#ff8042", // orange
  "#0088fe", // blue
  "#00C49F", // teal
  "#FFBB28", // amber
  "#FF8042", // coral
  "#a4de6c", // lime
  "#d0ed57", // light green
];

export function BrainAnalytics({ brainId }: { brainId?: string }) {
  const [timeframe, setTimeframe] = useState<number>(30);
  const supabase = createBrowserClient();

  // Fetch brain files
  const { data: brainFiles = [], isLoading } = useQuery({
    queryKey: ["brainFiles", brainId],
    queryFn: async () => {
      let query = supabase.from("brain_file_metadata").select("*");

      if (brainId) {
        query = query.eq("brain_id", brainId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  // Filter files by timeframe
  const filteredFiles = useMemo(() => {
    if (timeframe === 9999) return brainFiles;
    
    const cutoffDate = subDays(new Date(), timeframe);
    return brainFiles.filter((file) => 
      isWithinInterval(parseISO(file.created_at), {
        start: cutoffDate,
        end: new Date(),
      })
    );
  }, [brainFiles, timeframe]);

  // Calculate file type distribution
  const fileTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    
    filteredFiles.forEach((file) => {
      // Simplify file type for display
      const fileType = file.file_type.split('/').pop() || file.file_type;
      typeCounts[fileType] = (typeCounts[fileType] || 0) + 1;
    });
    
    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredFiles]);

  // Calculate embedding status distribution
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    
    filteredFiles.forEach((file) => {
      statusCounts[file.embedding_status] = (statusCounts[file.embedding_status] || 0) + 1;
    });
    
    return Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredFiles]);

  // Calculate uploads over time (daily)
  const uploadTrendsData = useMemo(() => {
    if (filteredFiles.length === 0) return [];
    
    const uploadCounts: Record<string, number> = {};
    
    // Determine appropriate interval based on timeframe
    const dateFormat = timeframe <= 30 ? "MMM dd" : "MMM yyyy";
    
    filteredFiles.forEach((file) => {
      const date = format(parseISO(file.created_at), dateFormat);
      uploadCounts[date] = (uploadCounts[date] || 0) + 1;
    });
    
    return Object.entries(uploadCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredFiles, timeframe]);

  // Calculate tag distribution
  const tagData = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    
    filteredFiles.forEach((file) => {
      if (file.tags && Array.isArray(file.tags)) {
        file.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Limit to top 8 tags
  }, [filteredFiles]);

  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-md shadow-md p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Brain Analytics</CardTitle>
            <CardDescription>
              Insights about your brain content and usage
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option.days}
                onClick={() => setTimeframe(option.days)}
                className={`px-3 py-1 text-xs rounded-md ${
                  timeframe === option.days
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[300px] bg-muted rounded-lg" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">
              {timeframe === 9999
                ? "Upload some files to see analytics."
                : `No files uploaded in the last ${timeframe} days.`}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Upload Trends</TabsTrigger>
              <TabsTrigger value="types">File Types</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Type Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      <FileType className="h-4 w-4 mr-2 text-muted-foreground" />
                      <CardTitle className="text-sm">File Type Distribution</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fileTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={1}
                            dataKey="value"
                            label={({ name, percent }) => 
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine={false}
                          >
                            {fileTypeData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={FILE_TYPE_COLORS[index % FILE_TYPE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Embedding Status */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <CardTitle className="text-sm">Processing Status</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey="value"
                            fill="#8884d8"
                            radius={[4, 4, 0, 0]}
                          >
                            {statusData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={FILE_TYPE_COLORS[index % FILE_TYPE_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trends">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">Upload Trends</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={uploadTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Uploads"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="types">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <FileType className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">File Type Distribution</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={fileTypeData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Files"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        >
                          {fileTypeData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={FILE_TYPE_COLORS[index % FILE_TYPE_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tags">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">Tag Distribution</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    {tagData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius={90} data={tagData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                          <Radar
                            name="Tags"
                            dataKey="value"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Tag className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No tags found. Add tags to your files to see analytics.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
