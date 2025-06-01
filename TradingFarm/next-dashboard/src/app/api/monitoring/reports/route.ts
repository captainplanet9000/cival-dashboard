import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { ReportGenerationService } from '@/services/monitoring/report-generation-service';

/**
 * POST /api/monitoring/reports
 * Generate a monitoring report and get the download URL
 */
export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.reportType || !data.format) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields: reportType, format' }),
        { status: 400 }
      );
    }
    
    // Check allowed report types
    const allowedReportTypes = ['alerts', 'monitoring', 'compliance'];
    if (!allowedReportTypes.includes(data.reportType)) {
      return new NextResponse(
        JSON.stringify({ error: `Invalid report type. Allowed types: ${allowedReportTypes.join(', ')}` }),
        { status: 400 }
      );
    }
    
    // Check allowed formats
    const allowedFormats = ['pdf', 'csv', 'json'];
    if (!allowedFormats.includes(data.format)) {
      return new NextResponse(
        JSON.stringify({ error: `Invalid format. Allowed formats: ${allowedFormats.join(', ')}` }),
        { status: 400 }
      );
    }
    
    // Generate report
    let reportResult;
    
    switch (data.reportType) {
      case 'alerts':
        reportResult = await ReportGenerationService.generateAlertReport(
          session.user.id,
          {
            format: data.format,
            filters: data.filters,
            sortBy: data.sortBy,
            sortOrder: data.sortOrder,
            title: data.title,
            description: data.description,
          }
        );
        break;
        
      case 'monitoring':
        reportResult = await ReportGenerationService.generateMonitoringReport(
          session.user.id,
          {
            format: data.format,
            filters: data.filters,
            title: data.title,
            description: data.description,
          }
        );
        break;
        
      case 'compliance':
        reportResult = await ReportGenerationService.generateComplianceReport(
          session.user.id,
          {
            format: data.format,
            filters: data.filters,
            title: data.title,
            description: data.description,
          }
        );
        break;
    }
    
    if (!reportResult.success) {
      return new NextResponse(
        JSON.stringify({ error: reportResult.error || 'Failed to generate report' }),
        { status: 500 }
      );
    }
    
    // For a real implementation, we would store the report in a storage bucket
    // and return a signed URL. For this example, we're just storing it in memory
    // and providing some metadata.
    
    // Store report in temporary storage
    const reportId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const tempReports = global.tempReports || {};
    tempReports[reportId] = {
      data: reportResult.data,
      contentType: getContentType(data.format),
      filename: reportResult.filename,
      createdAt: new Date(),
      userId: session.user.id,
    };
    global.tempReports = tempReports;
    
    return NextResponse.json({
      success: true,
      reportId,
      metadata: reportResult.metadata,
      downloadUrl: `/api/monitoring/reports/download?id=${reportId}`,
      filename: reportResult.filename,
    });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * Get content type for the report format
 */
function getContentType(format: string): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    default:
      return 'text/plain';
  }
}
