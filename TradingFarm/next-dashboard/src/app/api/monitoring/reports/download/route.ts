import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * GET /api/monitoring/reports/download
 * Download a previously generated report
 */
export async function GET(request: Request) {
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');
    
    if (!reportId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400 }
      );
    }
    
    // Get report from temporary storage
    const tempReports = global.tempReports || {};
    const report = tempReports[reportId];
    
    if (!report) {
      return new NextResponse(
        JSON.stringify({ error: 'Report not found or expired' }),
        { status: 404 }
      );
    }
    
    // Check if the report belongs to the authenticated user
    if (report.userId !== session.user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'You do not have permission to access this report' }),
        { status: 403 }
      );
    }
    
    // Audit log for compliance
    await supabase
      .from('audit_logs')
      .insert({
        user_id: session.user.id,
        action: 'REPORT_DOWNLOAD',
        resource: `report/${reportId}`,
        resource_type: 'REPORT',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS',
        details: {
          filename: report.filename,
          content_type: report.contentType,
        },
      });
    
    // Return the report with appropriate headers
    return new NextResponse(report.data, {
      headers: {
        'Content-Type': report.contentType,
        'Content-Disposition': `attachment; filename="${report.filename}"`,
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
