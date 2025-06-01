/**
 * API Route for Knowledge Documents
 */
import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get all documents
    const { data: documents, error } = await supabase
      .from('brain_documents')
      .select('id, name, description, metadata, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      documents: documents || []
    });
  } catch (error: any) {
    console.error('Unexpected error in documents API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
