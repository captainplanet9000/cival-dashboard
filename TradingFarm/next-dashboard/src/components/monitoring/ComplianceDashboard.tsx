'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Download, 
  RefreshCw, 
  Shield, 
  Calendar,
  Clock,
  BarChart3
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDropzone } from '@/components/ui/file-dropzone';

interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  lastChecked: string;
  details: string;
  requiredAction?: string;
}

interface ComplianceReport {
  id: string;
  name: string;
  type: string;
  status: 'completed' | 'pending' | 'failed';
  generatedAt: string;
  downloadUrl?: string;
  period: string;
  size?: string;
}

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'valid' | 'expired' | 'pending';
  downloadUrl: string;
  size: string;
}

interface TradeException {
  id: string;
  timestamp: string;
  symbol: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  status: 'open' | 'resolved' | 'ignored';
  resolvedAt?: string;
}

export default function ComplianceDashboard() {
  const [complianceChecks, setComplianceChecks] = React.useState<ComplianceCheck[]>([]);
  const [complianceReports, setComplianceReports] = React.useState<ComplianceReport[]>([]);
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [tradeExceptions, setTradeExceptions] = React.useState<TradeException[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [reportType, setReportType] = React.useState('all');
  const [complianceScore, setComplianceScore] = React.useState(0);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();

  // Fetch compliance data
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Fetch compliance checks
        const { data: checksData, error: checksError } = await supabase
          .from('compliance_checks')
          .select('*')
          .eq('user_id', user.id)
          .order('last_checked', { ascending: false });
          
        if (checksError) throw checksError;
        
        setComplianceChecks(checksData?.map((check: any) => ({
          id: check.id,
          name: check.name,
          description: check.description,
          category: check.category,
          status: check.status,
          lastChecked: check.last_checked,
          details: check.details,
          requiredAction: check.required_action
        })) || []);
        
        // Fetch compliance reports
        const { data: reportsData, error: reportsError } = await supabase
          .from('compliance_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false });
          
        if (reportsError) throw reportsError;
        
        setComplianceReports(reportsData?.map((report: any) => ({
          id: report.id,
          name: report.name,
          type: report.type,
          status: report.status,
          generatedAt: report.generated_at,
          downloadUrl: report.download_url,
          period: report.period,
          size: report.size
        })) || []);
        
        // Fetch regulatory documents
        const { data: documentsData, error: documentsError } = await supabase
          .from('regulatory_documents')
          .select('*')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });
          
        if (documentsError) throw documentsError;
        
        setDocuments(documentsData?.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          uploadedAt: doc.uploaded_at,
          expiresAt: doc.expires_at,
          status: doc.status,
          downloadUrl: doc.download_url,
          size: doc.size
        })) || []);
        
        // Fetch trade exceptions
        const { data: exceptionsData, error: exceptionsError } = await supabase
          .from('trade_exceptions')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false });
          
        if (exceptionsError) throw exceptionsError;
        
        setTradeExceptions(exceptionsData?.map((exception: any) => ({
          id: exception.id,
          timestamp: exception.timestamp,
          symbol: exception.symbol,
          type: exception.type,
          severity: exception.severity,
          description: exception.description,
          status: exception.status,
          resolvedAt: exception.resolved_at
        })) || []);
        
        // Calculate compliance score
        if (checksData) {
          const passedChecks = checksData.filter((check: any) => check.status === 'pass').length;
          const totalChecks = checksData.length;
          setComplianceScore(totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0);
        }
      } catch (error) {
        console.error('Error fetching compliance data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load compliance data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Run compliance checks
  const runComplianceChecks = async () => {
    try {
      setLoading(true);
      
      toast({
        title: 'Running Compliance Checks',
        description: 'This may take a moment...',
      });
      
      // Call RPC to run compliance checks
      const { data, error } = await supabase.rpc('run_compliance_checks');
      
      if (error) throw error;
      
      toast({
        title: 'Compliance Checks Completed',
        description: 'All checks have been updated',
      });
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error running compliance checks:', error);
      toast({
        title: 'Error',
        description: 'Failed to run compliance checks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate report
  const generateReport = async (type: string) => {
    try {
      setLoading(true);
      
      toast({
        title: 'Generating Report',
        description: 'This may take a moment...',
      });
      
      // Call RPC to generate report
      const { data, error } = await supabase.rpc('generate_compliance_report', {
        p_report_type: type,
        p_start_date: dateRange.from.toISOString(),
        p_end_date: dateRange.to.toISOString()
      });
      
      if (error) throw error;
      
      toast({
        title: 'Report Generated',
        description: `${type} report has been generated successfully`,
      });
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (files: any[]) => {
    try {
      if (files.length === 0) return;
      
      toast({
        title: 'Document Uploaded',
        description: 'Your document is being processed',
      });
      
      // Insert document record
      const { data, error } = await supabase
        .from('regulatory_documents')
        .insert({
          name: files[0].name,
          type: determineDocumentType(files[0].name),
          uploaded_at: new Date().toISOString(),
          status: 'pending',
          download_url: files[0].url,
          size: formatFileSize(files[0].size)
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh documents
      window.location.reload();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to process document',
        variant: 'destructive',
      });
    }
  };

  // Helper function to determine document type
  const determineDocumentType = (filename: string): string => {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('kyc')) return 'KYC Verification';
    if (lowerFilename.includes('tax')) return 'Tax Document';
    if (lowerFilename.includes('id') || lowerFilename.includes('identification')) return 'ID Verification';
    if (lowerFilename.includes('agreement')) return 'Agreement';
    if (lowerFilename.includes('statement')) return 'Account Statement';
    
    return 'Other';
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Compliance & Reporting</h2>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Compliance Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <Shield className="h-10 w-10 mb-2 text-primary" />
            <h3 className="text-lg font-medium mb-2">Compliance Score</h3>
            <div className="w-full max-w-md mb-2">
              <Progress value={complianceScore} className="h-2" />
            </div>
            <div className="flex items-center">
              <span className={`text-2xl font-bold ${
                complianceScore >= 80 ? 'text-green-500' : 
                complianceScore >= 60 ? 'text-amber-500' : 
                'text-red-500'
              }`}>
                {complianceScore}%
              </span>
              <Badge className="ml-2 bg-muted text-muted-foreground">
                {complianceScore >= 80 ? 'Good' : 
                complianceScore >= 60 ? 'Needs Attention' : 
                'Action Required'}
              </Badge>
            </div>
            {complianceScore < 80 && (
              <p className="text-sm text-muted-foreground mt-2">
                Address failing compliance checks to improve your score
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Compliance Checks</h3>
            <Button onClick={runComplianceChecks} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Run Checks
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Check</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={5}>
                            <div className="h-10 animate-pulse bg-muted rounded"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : complianceChecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No compliance checks available
                        </TableCell>
                      </TableRow>
                    ) : (
                      complianceChecks.map((check: ComplianceCheck) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-medium">
                            <div>
                              {check.name}
                              <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{check.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={check.status === 'pass' ? 'default' : check.status === 'warning' ? 'outline' : 'destructive'}
                              className={check.status === 'warning' ? 'border-amber-500 text-amber-500 bg-amber-50' : ''}
                            >
                              {check.status === 'pass' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {check.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {check.status === 'fail' && <XCircle className="h-3 w-3 mr-1" />}
                              {check.status === 'pass' ? 'Pass' : 
                               check.status === 'warning' ? 'Warning' :
                               check.status === 'fail' ? 'Fail' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(check.lastChecked).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {check.status !== 'pass' && check.requiredAction && (
                              <Button variant="outline" size="sm">
                                Resolve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onSelect={setDateRange}
            />
            
            <div className="flex gap-2">
              <Select defaultValue="regulatoryReport" onValueChange={setReportType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulatoryReport">Regulatory Report</SelectItem>
                  <SelectItem value="tradingActivityReport">Trading Activity</SelectItem>
                  <SelectItem value="taxReport">Tax Report</SelectItem>
                  <SelectItem value="riskReport">Risk Report</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={() => generateReport(reportType)}>
                Generate Report
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generated compliance and activity reports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <div className="h-10 animate-pulse bg-muted rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : complianceReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No reports available
                      </TableCell>
                    </TableRow>
                  ) : (
                    complianceReports.map((report: ComplianceReport) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.name}
                        </TableCell>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>{report.period}</TableCell>
                        <TableCell>
                          {new Date(report.generatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === 'completed' ? 'default' : report.status === 'pending' ? 'outline' : 'destructive'}
                            className={report.status === 'pending' ? 'border-amber-500 text-amber-500 bg-amber-50' : ''}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {report.status === 'completed' && report.downloadUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={report.downloadUrl} download>
                                <Download className="h-4 w-4 mr-1" /> Download
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Documents</CardTitle>
              <CardDescription>
                Upload and manage your regulatory documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileDropzone
                bucketName="regulatory-documents"
                acceptedFileTypes={['.pdf', '.jpg', '.png', '.docx']}
                onUploadComplete={handleDocumentUpload}
              />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <div className="h-10 animate-pulse bg-muted rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No documents available
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc: DocumentItem) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div>
                              {doc.name}
                              <p className="text-xs text-muted-foreground">{doc.size}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={doc.status === 'valid' ? 'default' : doc.status === 'pending' ? 'outline' : 'destructive'}
                            className={doc.status === 'pending' ? 'border-amber-500 text-amber-500 bg-amber-50' : ''}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <a href={doc.downloadUrl} download>
                              <Download className="h-4 w-4 mr-1" /> Download
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Exceptions Tab */}
        <TabsContent value="exceptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Exceptions</CardTitle>
              <CardDescription>
                Trading activity that requires review or remediation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={7}>
                          <div className="h-10 animate-pulse bg-muted rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : tradeExceptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No exceptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tradeExceptions.map((exception: TradeException) => (
                      <TableRow key={exception.id}>
                        <TableCell>
                          {new Date(exception.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{exception.symbol}</TableCell>
                        <TableCell>{exception.type}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={exception.severity === 'high' ? 'destructive' : exception.severity === 'medium' ? 'outline' : 'default'}
                            className={exception.severity === 'medium' ? 'border-amber-500 text-amber-500 bg-amber-50' : ''}
                          >
                            {exception.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {exception.description}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={exception.status === 'resolved' ? 'default' : exception.status === 'ignored' ? 'outline' : 'destructive'}
                            className={
                              exception.status === 'resolved' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                              exception.status === 'ignored' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 
                              'bg-red-100 text-red-800 hover:bg-red-200'
                            }
                          >
                            {exception.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {exception.status === 'open' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline">
                                Resolve
                              </Button>
                              <Button size="sm" variant="ghost">
                                Ignore
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
