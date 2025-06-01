/**
 * ElizaOS Knowledge API Routes
 * 
 * Handles CRUD operations for knowledge management in ElizaOS
 * Supports document ingestion, retrieval, and semantic search
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getWebSocketClient } from '@/utils/websocket/client';
import { KNOWLEDGE_EVENTS } from '@/utils/websocket/events';
import { z } from 'zod';
import knowledgeService from '@/services/knowledge-service';
import { rateLimit } from '@/utils/api/rate-limit';

// Rate limiting configuration
const RATE_LIMIT = 100;  // requests per window
const RATE_WINDOW = 60 * 1000;  // 1 minute in milliseconds

// Cache of requests for rate limiting
const requestCache = new Map<string, number>();

/**
 * Check rate limit for the request
 */
function checkRateLimit(request: NextRequest): { limited: boolean, remaining: number } {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  
  // Clean up old entries
  requestCache.forEach((timestamp, key) => {
    if (timestamp < windowStart) {
      requestCache.delete(key);
    }
  });
  
  // Count requests in current window
  let requestCount = 0;
  requestCache.forEach((timestamp, key) => {
    if (key.startsWith(ip) && timestamp >= windowStart) {
      requestCount++;
    }
  });
  
  // Check if limit exceeded
  if (requestCount >= RATE_LIMIT) {
    return { limited: true, remaining: 0 };
  }
  
  // Record this request
  const requestId = `${ip}:${now}`;
  requestCache.set(requestId, now);
  
  return { limited: false, remaining: RATE_LIMIT - requestCount - 1 };
}

/**
 * Helper to return consistent error responses
 */
function errorResponse(message: string, status: number = 400, details: any = null): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      details: details
    },
    { status }
  );
}

// Document creation schema
const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  document_type: z.string().min(1, "Document type is required"),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  farm_id: z.number().optional(),
  is_public: z.boolean().optional().default(false),
});

// Document update schema
const updateDocumentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  document_type: z.string().optional(),
  is_public: z.boolean().optional(),
});

// Search query schema
const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().optional().default(10),
  threshold: z.number().optional().default(0.6),
});

// Document sharing schema
const shareDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  agentIds: z.array(z.string().uuid("Invalid agent ID")).optional(),
  farmIds: z.array(z.number()).optional(),
  userIds: z.array(z.string().uuid("Invalid user ID")).optional(),
  permissionLevel: z.enum(["read", "write", "admin"]).optional().default("read"),
  isPublic: z.boolean().optional(),
});

/**
 * POST handler to create a new knowledge document
 */
export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }

  try {
    // Validate authentication
    const supabase = createServerClient();
    const { data: { session }} = await supabase.auth.getSession();
    
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = createDocumentSchema.safeParse(body);
    
    if (!parseResult.success) {
      return errorResponse('Invalid request data', 400, parseResult.error.format());
    }
    
    const documentData = parseResult.data;
    
    // Add user ID to the document
    documentData.created_by = session.user.id;
    
    // Add the document to the knowledge base
    const result = await knowledgeService.addDocument(documentData);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to add document', 500);
    }
    
    // Notify via WebSocket
    const wsClient = getWebSocketClient();
    wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_ADDED, {
      documentId: result.data.id,
      title: result.data.title,
      createdBy: session.user.id
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating document:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

/**
 * GET handler to search or list knowledge documents
 */
export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }

  try {
    // Validate authentication
    const supabase = createServerClient();
    const { data: { session }} = await supabase.auth.getSession();
    
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Get search query from URL parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const documentId = searchParams.get('id');
    
    // If document ID is provided, return that specific document
    if (documentId) {
      const result = await knowledgeService.getDocument(documentId);
      
      if (!result.success) {
        return errorResponse(result.error || 'Document not found', 404);
      }
      
      return NextResponse.json(result);
    }
    
    // If search query is provided, search for documents
    if (query) {
      // Parse and validate search parameters
      const parseResult = searchQuerySchema.safeParse({
        query,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 10,
        threshold: searchParams.get('threshold') ? parseFloat(searchParams.get('threshold') as string) : 0.6,
      });
      
      if (!parseResult.success) {
        return errorResponse('Invalid search parameters', 400, parseResult.error.format());
      }
      
      // Search documents
      const result = await knowledgeService.searchKnowledge(parseResult.data.query);
      
      // Notify via WebSocket
      const wsClient = getWebSocketClient();
      wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_QUERIED, {
        query: parseResult.data.query,
        resultCount: result.success ? result.data.length : 0,
        userId: session.user.id
      });
      
      return NextResponse.json(result);
    }
    
    // List all documents if no query or ID
    const result = await knowledgeService.listDocuments();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error searching/listing documents:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

/**
 * PUT handler to update a knowledge document
 */
export async function PUT(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }

  try {
    // Validate authentication
    const supabase = createServerClient();
    const { data: { session }} = await supabase.auth.getSession();
    
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Get document ID from URL parameters
    const documentId = request.nextUrl.searchParams.get('id');
    if (!documentId) {
      return errorResponse('Document ID is required', 400);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateDocumentSchema.safeParse(body);
    
    if (!parseResult.success) {
      return errorResponse('Invalid request data', 400, parseResult.error.format());
    }
    
    // Check if document exists and user has access
    const { data: document } = await supabase
      .from('elizaos_knowledge_documents')
      .select('id, created_by')
      .eq('id', documentId)
      .single();
    
    if (!document) {
      return errorResponse('Document not found', 404);
    }
    
    // Only allow update if user is the creator or admin
    // TODO: Check for admin role or permissions
    if (document.created_by !== session.user.id) {
      return errorResponse('Unauthorized to update this document', 403);
    }
    
    // Update document in database
    const { data, error } = await supabase
      .from('elizaos_knowledge_documents')
      .update({
        ...parseResult.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) {
      return errorResponse(`Failed to update document: ${error.message}`, 500);
    }
    
    // Notify via WebSocket
    const wsClient = getWebSocketClient();
    wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_UPDATED, {
      documentId,
      title: data.title,
      updatedBy: session.user.id
    });
    
    return NextResponse.json({ 
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error updating document:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

/**
 * DELETE handler to remove a knowledge document
 */
export async function DELETE(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }

  try {
    // Validate authentication
    const supabase = createServerClient();
    const { data: { session }} = await supabase.auth.getSession();
    
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Get document ID from URL parameters
    const documentId = request.nextUrl.searchParams.get('id');
    if (!documentId) {
      return errorResponse('Document ID is required', 400);
    }
    
    // Check if document exists and user has access
    const { data: document } = await supabase
      .from('elizaos_knowledge_documents')
      .select('id, created_by')
      .eq('id', documentId)
      .single();
    
    if (!document) {
      return errorResponse('Document not found', 404);
    }
    
    // Only allow deletion if user is the creator or admin
    // TODO: Check for admin role or permissions
    if (document.created_by !== session.user.id) {
      return errorResponse('Unauthorized to delete this document', 403);
    }
    
    // Delete document
    const result = await knowledgeService.deleteDocument(documentId);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to delete document', 500);
    }
    
    // Notify via WebSocket
    const wsClient = getWebSocketClient();
    wsClient.send(KNOWLEDGE_EVENTS.KNOWLEDGE_DELETED, {
      documentId,
      deletedBy: session.user.id
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

/**
 * PATCH handler to share a document with agents, farms, or users
 */
export async function PATCH(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }

  try {
    // Validate authentication
    const supabase = createServerClient();
    const { data: { session }} = await supabase.auth.getSession();
    
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = shareDocumentSchema.safeParse(body);
    
    if (!parseResult.success) {
      return errorResponse('Invalid request data', 400, parseResult.error.format());
    }
    
    // Check if document exists and user has access
    const { data: document } = await supabase
      .from('elizaos_knowledge_documents')
      .select('id, created_by')
      .eq('id', parseResult.data.documentId)
      .single();
    
    if (!document) {
      return errorResponse('Document not found', 404);
    }
    
    // Only allow sharing if user is the creator or admin
    // TODO: Check for admin role or permissions
    if (document.created_by !== session.user.id) {
      return errorResponse('Unauthorized to share this document', 403);
    }
    
    // Share document with specified entities
    const result = await knowledgeService.shareKnowledge(
      parseResult.data.documentId,
      {
        agentIds: parseResult.data.agentIds,
        farmIds: parseResult.data.farmIds,
        userIds: parseResult.data.userIds,
        permissionLevel: parseResult.data.permissionLevel,
        isPublic: parseResult.data.isPublic
      }
    );
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to share document', 500);
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sharing document:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
