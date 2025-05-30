import { createBrowserClient } from '@/utils/supabase/client';
import { parsePineScript } from './pinescript-parser';
import { createEmbedding } from './embedding-service';

// Maximum size for text chunks when creating embeddings
const MAX_CHUNK_SIZE = 1000;

// Chunk overlap to maintain context between chunks
const CHUNK_OVERLAP = 200;

interface IngestionOptions {
  generateEmbeddings?: boolean;
  parseContent?: boolean;
}

/**
 * Process a brain asset after upload
 * This function reads the file from storage, processes its content,
 * and updates the brain_assets table with extracted data
 */
export async function processBrainAsset(
  assetId: number, 
  options: IngestionOptions = { generateEmbeddings: true, parseContent: true }
) {
  const supabase = createBrowserClient();
  
  try {
    // Get asset information
    const { data: asset, error: assetError } = await supabase
      .from('brain_assets')
      .select('*')
      .eq('id', assetId)
      .single();
    
    if (assetError || !asset) {
      throw new Error(`Failed to retrieve asset: ${assetError?.message || 'Asset not found'}`);
    }
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('farm_brain_assets')
      .download(asset.storage_path);
    
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }
    
    // Process based on asset type
    let textContent = '';
    let metadata = asset.metadata || {};
    
    switch (asset.asset_type) {
      case 'pinescript':
        await processPineScriptAsset(supabase, asset, fileData, options);
        break;
        
      case 'pdf':
        await processPdfAsset(supabase, asset, fileData, options);
        break;
        
      case 'text':
      case 'markdown':
      case 'json':
        await processTextAsset(supabase, asset, fileData, options);
        break;
        
      default:
        console.warn(`Unknown asset type: ${asset.asset_type}`);
        textContent = await fileData.text();
        // Store raw text content without special processing
        await updateAssetContent(supabase, asset.id, textContent, {});
    }
    
    return { success: true, assetId: asset.id };
    
  } catch (error) {
    console.error('Error processing brain asset:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process a PineScript file
 */
async function processPineScriptAsset(
  supabase: any, 
  asset: any, 
  fileData: Blob,
  options: IngestionOptions
) {
  // Read the file content
  const textContent = await fileData.text();
  
  // Parse the PineScript
  const parsedScript = parsePineScript(textContent);
  
  // Update asset metadata with parsed information
  const metadata = {
    ...asset.metadata,
    parsed: {
      name: parsedScript.metadata.name,
      description: parsedScript.metadata.description,
      overlay: parsedScript.metadata.overlay,
      version: parsedScript.metadata.version,
      inputs: parsedScript.inputs,
      functions: parsedScript.functions,
      plotStatements: parsedScript.plotStatements.length
    }
  };
  
  // Update the asset with content and metadata
  await updateAssetContent(supabase, asset.id, textContent, metadata);
  
  // Generate embeddings if requested
  if (options.generateEmbeddings) {
    await generateEmbeddingsForAsset(supabase, asset.id, textContent);
  }
}

/**
 * Process a PDF file
 */
async function processPdfAsset(
  supabase: any, 
  asset: any, 
  fileData: Blob,
  options: IngestionOptions
) {
  // For PDF processing, we'd typically use a PDF parser
  // For now, we'll just note that proper PDF processing would be implemented here
  // and would extract text from the PDF
  
  // Mock PDF text extraction
  const textContent = 'PDF text extraction would happen here';
  
  // Update the asset with content
  await updateAssetContent(supabase, asset.id, textContent, asset.metadata);
  
  // Generate embeddings if requested
  if (options.generateEmbeddings) {
    await generateEmbeddingsForAsset(supabase, asset.id, textContent);
  }
}

/**
 * Process a text-based asset (plain text, markdown, JSON)
 */
async function processTextAsset(
  supabase: any, 
  asset: any, 
  fileData: Blob,
  options: IngestionOptions
) {
  // Read the file content
  const textContent = await fileData.text();
  
  // For JSON, we might want to parse and validate
  let metadata = asset.metadata || {};
  if (asset.asset_type === 'json') {
    try {
      const jsonData = JSON.parse(textContent);
      metadata = {
        ...metadata,
        jsonStructure: Object.keys(jsonData)
      };
    } catch (e) {
      console.warn('Invalid JSON format in asset', asset.id);
    }
  }
  
  // Update the asset with content
  await updateAssetContent(supabase, asset.id, textContent, metadata);
  
  // Generate embeddings if requested
  if (options.generateEmbeddings) {
    await generateEmbeddingsForAsset(supabase, asset.id, textContent);
  }
}

/**
 * Update an asset's content and metadata
 */
async function updateAssetContent(
  supabase: any, 
  assetId: number, 
  content: string, 
  metadata: any
) {
  // Generate a summary if the content is not too long
  let summary = '';
  if (content.length < 10000) {
    // In a real implementation, we might use an AI to generate a summary
    summary = content.slice(0, 150) + '...';
  }
  
  // Update the asset record
  const { error } = await supabase
    .from('brain_assets')
    .update({
      content_text: content,
      summary,
      metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', assetId);
  
  if (error) {
    throw new Error(`Failed to update asset content: ${error.message}`);
  }
}

/**
 * Generate embeddings for an asset's text content
 */
async function generateEmbeddingsForAsset(supabase: any, assetId: number, content: string) {
  try {
    // Split the content into chunks
    const chunks = chunkText(content, MAX_CHUNK_SIZE, CHUNK_OVERLAP);
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding using OpenAI or similar service
      const embedding = await createEmbedding(chunk);
      
      // Store the embedding in the database
      const { error } = await supabase
        .from('brain_asset_embeddings')
        .insert({
          brain_asset_id: assetId,
          chunk_index: i,
          chunk_text: chunk,
          embedding
        });
      
      if (error) {
        console.error(`Error storing embedding for chunk ${i}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return false;
  }
}

/**
 * Split text into chunks for embedding generation
 */
function chunkText(text: string, maxLength: number, overlap: number): string[] {
  const chunks: string[] = [];
  
  // If text is shorter than max length, return it as a single chunk
  if (text.length <= maxLength) {
    return [text];
  }
  
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Find a good place to break the text (preferably at a paragraph or sentence)
    let endIndex = Math.min(startIndex + maxLength, text.length);
    
    // Try to break at a paragraph
    const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
    if (paragraphBreak > startIndex && paragraphBreak > startIndex + maxLength / 2) {
      endIndex = paragraphBreak;
    } else {
      // Try to break at a sentence
      const sentenceBreak = text.lastIndexOf('. ', endIndex);
      if (sentenceBreak > startIndex && sentenceBreak > startIndex + maxLength / 2) {
        endIndex = sentenceBreak + 1; // Include the period
      }
    }
    
    // Extract the chunk
    chunks.push(text.substring(startIndex, endIndex).trim());
    
    // Move to the next position, accounting for overlap
    startIndex = endIndex - overlap;
    if (startIndex < 0) startIndex = 0;
  }
  
  return chunks;
}
