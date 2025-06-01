import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Allowed file types and their corresponding asset types
const ALLOWED_FILE_TYPES: Record<string, string> = {
  'text/x-pine': 'pinescript',
  'application/pdf': 'pdf',
  'text/plain': 'text',
  'text/markdown': 'markdown',
  'application/json': 'json',
};

// Helper function to determine asset type from content type
function getAssetType(contentType: string): string {
  // Handle special case for PineScript files which might come as text/plain
  if (contentType === 'text/plain' && 
      (req.headers.get('x-file-extension')?.endsWith('.pine') || 
       req.headers.get('x-filename')?.endsWith('.pine'))) {
    return 'pinescript';
  }
  
  return ALLOWED_FILE_TYPES[contentType] || 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    // Create Supabase server client
    const supabase = createServerClient();
    
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please login first' },
        { status: 401 }
      );
    }
    
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || file.name;
    const description = formData.get('description') as string || '';
    
    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large: maximum size is 10MB' },
        { status: 400 }
      );
    }
    
    // Determine asset type
    const assetType = getAssetType(file.type);
    if (assetType === 'unknown') {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }
    
    // Create storage path
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storagePath = `${session.user.id}/${fileName}`;
    
    // Upload file to Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('farm_brain_assets')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (storageError) {
      console.error('Storage upload error:', storageError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }
    
    // Create metadata entry in the brain_assets table
    const { data: assetData, error: assetError } = await supabase
      .from('brain_assets')
      .insert({
        filename: file.name,
        title,
        description,
        asset_type: assetType,
        storage_path: storagePath,
        source: 'user_upload',
        metadata: { originalType: file.type },
        owner_id: session.user.id
      })
      .select()
      .single();
    
    if (assetError) {
      console.error('Asset record creation error:', assetError);
      // Attempt to clean up the uploaded file
      await supabase.storage.from('farm_brain_assets').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create asset record' },
        { status: 500 }
      );
    }
    
    // Return success response with the asset data
    return NextResponse.json({
      message: 'File uploaded successfully',
      asset: assetData
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
