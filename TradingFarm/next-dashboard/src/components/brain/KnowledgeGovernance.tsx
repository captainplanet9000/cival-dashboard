"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { 
  ShieldCheck, AlertTriangle, ClockCountdown, Clock, CheckCircle2, 
  FileWarning, AlertCircle, FileCheck, Download, Sigma, 
  RefreshCw, CheckCheck, Book, FileText, Share2, Search, Trash
} from "lucide-react";
import { format } from "date-fns";

interface KnowledgeGovernanceProps {
  farmId?: string;
}

interface ComplianceCheck {
  id: string;
  name: string;
  status: 'passed' | 'warning' | 'failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  details: string;
  checked_at: string;
}

interface KnowledgeQualityScore {
  category: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
  details: string;
}

interface AuditLogItem {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  details: Record<string, any>;
  timestamp: string;
}

export function KnowledgeGovernance({ farmId }: KnowledgeGovernanceProps) {
  const [activeTab, setActiveTab] = useState("compliance");
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Fetch compliance data
  const { data: complianceData, isLoading: isLoadingCompliance } = useQuery({
    queryKey: ["knowledgeCompliance", farmId],
    queryFn: async () => {
      try {
        // In a real implementation, this would fetch from an API
        // For demo purposes, we'll return mock data
        
        // Mock compliance checks
        const complianceChecks: ComplianceCheck[] = [
          {
            id: "check1",
            name: "Sensitive Data Detection",
            status: 'passed',
            severity: 'high',
            category: 'Data Protection',
            details: "No sensitive data detected in knowledge files",
            checked_at: "2025-04-12T09:34:22Z"
          },
          {
            id: "check2",
            name: "Retention Policy Compliance",
            status: 'warning',
            severity: 'medium',
            category: 'Data Lifecycle',
            details: "3 files exceed maximum retention period of 90 days",
            checked_at: "2025-04-12T09:34:22Z"
          },
          {
            id: "check3",
            name: "File Format Validation",
            status: 'passed',
            severity: 'low',
            category: 'Data Quality',
            details: "All files use approved formats",
            checked_at: "2025-04-12T09:34:22Z"
          },
          {
            id: "check4",
            name: "Access Controls",
            status: 'warning',
            severity: 'high',
            category: 'Security',
            details: "2 documents have excessive sharing permissions",
            checked_at: "2025-04-12T09:34:22Z"
          },
          {
            id: "check5",
            name: "Content Classification",
            status: 'failed',
            severity: 'critical',
            category: 'Classification',
            details: "5 files missing required classification metadata",
            checked_at: "2025-04-12T09:34:22Z"
          }
        ];
        
        // Mock quality scores
        const qualityScores: KnowledgeQualityScore[] = [
          {
            category: "Completeness",
            score: 87,
            status: 'good',
            details: "Most knowledge assets have complete metadata"
          },
          {
            category: "Accuracy",
            score: 92,
            status: 'good',
            details: "High factual accuracy across knowledge base"
          },
          {
            category: "Consistency",
            score: 79,
            status: 'warning',
            details: "Some inconsistencies in trading strategy descriptions"
          },
          {
            category: "Structure",
            score: 68,
            status: 'warning',
            details: "Improvement needed in document organization"
          },
          {
            category: "Metadata",
            score: 45,
            status: 'poor',
            details: "Significant gaps in tagging and categorization"
          }
        ];
        
        // Mock audit log
        const auditLog: AuditLogItem[] = [
          {
            id: "log1",
            user: {
              id: "user1",
              name: "Maria Rodriguez",
              email: "maria@tradingfarm.com"
            },
            action: "UPLOAD",
            resource_type: "BRAIN_FILE",
            resource_id: "file1",
            resource_name: "Moving Average Crossover Strategy",
            details: {
              file_size: "2.4MB",
              file_type: "PDF"
            },
            timestamp: "2025-04-12T14:23:45Z"
          },
          {
            id: "log2",
            user: {
              id: "user2",
              name: "Alex Chen",
              email: "alex@tradingfarm.com"
            },
            action: "SHARE",
            resource_type: "BRAIN_FILE",
            resource_id: "file1",
            resource_name: "Moving Average Crossover Strategy",
            details: {
              shared_with: "james@tradingfarm.com",
              access_level: "VIEW"
            },
            timestamp: "2025-04-12T14:45:12Z"
          },
          {
            id: "log3",
            user: {
              id: "system",
              name: "System",
              email: "system@tradingfarm.com"
            },
            action: "PROCESS",
            resource_type: "KNOWLEDGE_CHUNK",
            resource_id: "chunk1",
            resource_name: "Risk Management Principles",
            details: {
              chunk_count: 15,
              embedding_model: "eliza-embedding-1"
            },
            timestamp: "2025-04-12T15:12:33Z"
          },
          {
            id: "log4",
            user: {
              id: "user3",
              name: "James Wilson",
              email: "james@tradingfarm.com"
            },
            action: "QUERY",
            resource_type: "KNOWLEDGE_BASE",
            resource_id: "kb1",
            resource_name: "Trading Knowledge Base",
            details: {
              query: "What are the best volatility indicators?",
              matches: 5
            },
            timestamp: "2025-04-12T15:34:22Z"
          },
          {
            id: "log5",
            user: {
              id: "user1",
              name: "Maria Rodriguez",
              email: "maria@tradingfarm.com"
            },
            action: "DELETE",
            resource_type: "BRAIN_FILE",
            resource_id: "file2",
            resource_name: "Outdated Trading Strategy",
            details: {
              reason: "Information no longer relevant"
            },
            timestamp: "2025-04-12T16:05:18Z"
          }
        ];
        
        // Calculate overall compliance score
        const complianceStatuses = complianceChecks.map(check => check.status);
        const passedCount = complianceStatuses.filter(s => s === 'passed').length;
        const warningCount = complianceStatuses.filter(s => s === 'warning').length;
        const failedCount = complianceStatuses.filter(s => s === 'failed').length;
        
        const totalChecks = complianceChecks.length;
        const weightedScore = ((passedCount * 1) + (warningCount * 0.5) + (failedCount * 0)) / totalChecks;
        const overallComplianceScore = Math.round(weightedScore * 100);
        
        // Calculate overall quality score
        const overallQualityScore = Math.round(
          qualityScores.reduce((sum, item) => sum + item.score, 0) / qualityScores.length
        );
        
        return {
          complianceChecks,
          qualityScores,
          auditLog,
          overallComplianceScore,
          overallQualityScore,
          checkCounts: {
            passed: passedCount,
            warning: warningCount,
            failed: failedCount,
            total: totalChecks
          }
        };
      } catch (error) {
        console.error("Error fetching compliance data:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Get severity badge variant
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'high':
        return <Badge variant="default">High</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge variant="outline" className="text-green-600 bg-green-50 hover:bg-green-100 border-green-200">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Passed
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Warning
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="text-red-600 bg-red-50 hover:bg-red-100 border-red-200">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get quality status badge
  const getQualityStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return (
          <Badge variant="outline" className="text-green-600 bg-green-50 hover:bg-green-100 border-green-200">
            Good
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200">
            Needs Improvement
          </Badge>
        );
      case 'poor':
        return (
          <Badge variant="outline" className="text-red-600 bg-red-50 hover:bg-red-100 border-red-200">
            Poor
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'UPLOAD':
        return <FileText className="h-4 w-4" />;
      case 'SHARE':
        return <Share2 className="h-4 w-4" />;
      case 'PROCESS':
        return <RefreshCw className="h-4 w-4" />;
      case 'QUERY':
        return <Search className="h-4 w-4" />;
      case 'DELETE':
        return <Trash className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Handle export report
  const handleExportReport = () => {
    toast({
      title: "Report exported",
      description: "Compliance report has been downloaded.",
    });
  };

  // Handle refresh check
  const handleRefreshCheck = () => {
    toast({
      title: "Compliance check initiated",
      description: "A new compliance check is running.",
    });
  };

  if (isLoadingCompliance) {
    return (
      <Card className="w-full h-full min-h-[400px]">
        <CardHeader>
          <CardTitle>Knowledge Governance</CardTitle>
          <CardDescription>Loading governance data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-10 w-10 text-primary animate-pulse mb-2" />
            <p className="text-muted-foreground text-sm">Loading governance data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Knowledge Governance</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshCheck}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Run Checks
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export Report
          </Button>
        </div>
      </div>
      
      {complianceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Compliance Status</CardTitle>
              <CardDescription>
                Overall compliance with data governance policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center pt-2 pb-4">
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32">
                    <circle
                      className="text-muted/20"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className={`${
                        complianceData.overallComplianceScore >= 80
                          ? "text-green-500"
                          : complianceData.overallComplianceScore >= 60
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                      strokeWidth="8"
                      strokeDasharray={`${(complianceData.overallComplianceScore / 100) * 351.85} 351.85`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                      transform="rotate(-90 64 64)"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold">
                      {complianceData.overallComplianceScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">Compliance</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 w-full mt-4">
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/30">
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-bold">{complianceData.checkCounts.passed}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Passed</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/30">
                    <div className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-bold">{complianceData.checkCounts.warning}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Warnings</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/30">
                    <div className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-bold">{complianceData.checkCounts.failed}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Failed</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="w-full text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 mr-1" />
                Last check: {format(new Date(complianceData.complianceChecks[0].checked_at), "MMM d, yyyy HH:mm")}
              </div>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Knowledge Quality</CardTitle>
              <CardDescription>
                Quality assessment of knowledge assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2 pb-4">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {complianceData.overallQualityScore}/100
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Overall Quality Score</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {complianceData.qualityScores.map((score) => (
                    <div key={score.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{score.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{score.score}/100</span>
                          {getQualityStatusBadge(score.status)}
                        </div>
                      </div>
                      <Progress value={score.score} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">{score.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="compliance" className="flex items-center">
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Compliance Checks
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center">
            <ClockCountdown className="h-4 w-4 mr-1.5" />
            Audit Log
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="compliance" className="space-y-4 mt-4">
          {complianceData && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceData.complianceChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>
                          <div className="font-medium">{check.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{check.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(check.severity)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(check.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{check.details}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="audit" className="space-y-4 mt-4">
          {complianceData && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceData.auditLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="text-xs whitespace-nowrap">
                            {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={`https://avatar.vercel.sh/${log.user.email}?size=24`} />
                              <AvatarFallback>
                                {log.user.name.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-xs">{log.user.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {getActionIcon(log.action)}
                            <span className="capitalize">{log.action.toLowerCase()}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{log.resource_name}</div>
                          <div className="text-xs text-muted-foreground">{log.resource_type}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="flex gap-1">
                                <span className="text-muted-foreground">{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
