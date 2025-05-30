import os
import json
import tempfile
import asyncio
import asyncpg
from typing import Dict, Any, List, Optional, Tuple
import openai
from supabase import create_client, Client

# Supported file types and their handlers
supported_file_types = {
    "pdf": "application/pdf",
    "txt": "text/plain",
    "md": "text/markdown",
    "html": "text/html",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

# Function to handle storage event webhook
async def handle_storage_event(event_data: Dict[Any, Any], supabase_url: str, supabase_key: str) -> Dict[str, Any]:
    """
    Handle Supabase Storage webhook event for document upload.
    Creates a brain_documents record with 'pending' status.
    
    Args:
        event_data: The webhook payload data
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        Dict containing the created brain_document record
    """
    try:
        # Parse event data
        bucket_id = event_data.get('bucket_id')
        farm_id = None
        file_path = event_data.get('file_path', '')
        
        # Expected path format: farm_brains/{farm_id}/uploads/{filename}
        if file_path and '/' in file_path:
            path_parts = file_path.split('/')
            if len(path_parts) >= 2 and path_parts[0] == 'farm_brains':
                farm_id = path_parts[1]
        
        if not farm_id:
            return {"error": "Invalid file path format. Expected: farm_brains/{farm_id}/uploads/{filename}"}
        
        # Get file details from path
        filename = os.path.basename(file_path)
        file_extension = os.path.splitext(filename)[1].lower().lstrip('.')
        
        # Check if file type is supported
        if file_extension not in supported_file_types:
            return {"error": f"Unsupported file type: {file_extension}"}
        
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        
        # Find the brain associated with this farm
        brain_response = await asyncio.to_thread(
            lambda: supabase.table('brains')
                .select('id')
                .eq('farm_id', farm_id)
                .limit(1)
                .execute()
        )
        
        if not brain_response.data or len(brain_response.data) == 0:
            # Create a default brain for the farm if it doesn't exist
            brain_response = await asyncio.to_thread(
                lambda: supabase.table('brains')
                    .insert({
                        'farm_id': farm_id,
                        'name': 'Default Brain',
                        'description': 'Default brain created automatically for document storage',
                        'type': 'general'
                    })
                    .execute()
            )
            
        brain_id = brain_response.data[0]['id']
        
        # Create a new brain_document record with 'pending' status
        document_response = await asyncio.to_thread(
            lambda: supabase.table('brain_documents')
                .insert({
                    'brain_id': brain_id,
                    'title': filename,
                    'description': f'Uploaded document: {filename}',
                    'source_url': None,
                    'file_path': file_path,
                    'content_type': supported_file_types[file_extension],
                    'status': 'pending',
                    'metadata': {
                        'original_filename': filename,
                        'upload_event': event_data
                    }
                })
                .execute()
        )
        
        return document_response.data[0] if document_response.data else {"error": "Failed to create document record"}
        
    except Exception as e:
        return {"error": str(e)}

# Function to update document status
async def update_doc_status_db(
    document_id: str, 
    status: str, 
    error_message: Optional[str] = None, 
    supabase_url: str = None, 
    supabase_key: str = None
) -> Dict[str, Any]:
    """
    Update the status of a brain_document record
    
    Args:
        document_id: ID of the document to update
        status: New status ('processing', 'processed', 'failed')
        error_message: Optional error message for failed processing
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        Dict containing the updated record
    """
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        update_data = {'status': status}
        if error_message:
            update_data['error_message'] = error_message
        
        response = await asyncio.to_thread(
            lambda: supabase.table('brain_documents')
                .update(update_data)
                .eq('id', document_id)
                .execute()
        )
        
        return response.data[0] if response.data else {"error": "Document not found"}
        
    except Exception as e:
        return {"error": str(e)}

# Function to download and parse document
async def download_and_parse(
    document_id: str, 
    supabase_url: str, 
    supabase_key: str
) -> Dict[str, Any]:
    """
    Download document from Supabase Storage and parse its content
    
    Args:
        document_id: ID of the document to process
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        Dict containing parsed content and metadata
    """
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Get document details
        document_response = await asyncio.to_thread(
            lambda: supabase.table('brain_documents')
                .select('*')
                .eq('id', document_id)
                .execute()
        )
        
        if not document_response.data or len(document_response.data) == 0:
            return {"error": "Document not found"}
            
        document = document_response.data[0]
        file_path = document['file_path']
        content_type = document['content_type']
        
        # Create a temporary file to download the content
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
            # Download file from Storage
            bucket = 'documents'  # Or get this from settings/config
            
            response = await asyncio.to_thread(
                lambda: supabase.storage.from_(bucket).download(file_path)
            )
            
            with open(temp_path, 'wb') as f:
                f.write(response)
            
            # Parse the file based on content type
            content = ""
            
            if content_type == "application/pdf":
                # PDF parsing
                import pypdf
                with open(temp_path, 'rb') as f:
                    pdf_reader = pypdf.PdfReader(f)
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        content += page.extract_text() + "\n\n"
                        
            elif content_type == "text/plain" or content_type == "text/markdown":
                # Simple text parsing
                with open(temp_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
            elif content_type == "text/html":
                # HTML parsing (simple version)
                from bs4 import BeautifulSoup
                with open(temp_path, 'r', encoding='utf-8') as f:
                    soup = BeautifulSoup(f.read(), 'html.parser')
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.extract()
                    content = soup.get_text()
                    
            elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                # DOCX parsing
                import docx
                doc = docx.Document(temp_path)
                content = "\n".join([para.text for para in doc.paragraphs])
            
            return {
                "document_id": document_id,
                "content": content,
                "metadata": {
                    "file_path": file_path,
                    "content_type": content_type,
                    "content_length": len(content)
                }
            }
                
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        return {"error": str(e)}

# Function to chunk text
async def chunk_text(content: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Split text into chunks with overlap
    
    Args:
        content: Full text content to chunk
        chunk_size: Maximum size of each chunk
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of chunk objects
    """
    chunks = []
    start = 0
    text_length = len(content)
    
    index = 0
    while start < text_length:
        end = min(start + chunk_size, text_length)
        
        # Adjust end to try to find a sentence boundary
        if end < text_length:
            # Try to find the last sentence boundary within the chunk
            for boundary in ['. ', '! ', '? ', '\n\n']:
                last_boundary = content[start:end].rfind(boundary)
                if last_boundary != -1:
                    end = start + last_boundary + len(boundary)
                    break
        
        chunk_text = content[start:end].strip()
        if chunk_text:
            chunks.append({
                "content": chunk_text,
                "chunk_index": index,
                "metadata": {
                    "start_char": start,
                    "end_char": end
                }
            })
        
        # Move the start position for the next chunk, considering overlap
        start = end - overlap if end < text_length else end
        index += 1
    
    return chunks

# Function to generate embedding
async def generate_embedding(text: str, openai_api_key: str) -> List[float]:
    """
    Generate vector embedding for text using OpenAI API
    
    Args:
        text: The text to embed
        openai_api_key: OpenAI API key
        
    Returns:
        List of embedding values
    """
    try:
        # Configure OpenAI with API key
        openai.api_key = openai_api_key
        
        # Generate embedding using embeddings API
        response = await asyncio.to_thread(
            lambda: openai.Embedding.create(
                model="text-embedding-ada-002", 
                input=text
            )
        )
        
        # Extract the embedding vector from the response
        embedding = response['data'][0]['embedding']
        return embedding
    
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        raise e

# Function to store chunk in database
async def store_chunk_db(
    document_id: str,
    chunk_data: Dict[str, Any],
    embedding: List[float],
    supabase_url: str,
    supabase_key: str,
    conn_string: str = None
) -> Dict[str, Any]:
    """
    Store a document chunk with its embedding in the database
    
    Args:
        document_id: ID of the parent document
        chunk_data: Chunk content and metadata
        embedding: Vector embedding of the chunk text
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        conn_string: Optional direct PostgreSQL connection string (for more efficient pgvector operations)
        
    Returns:
        Dict containing the created chunk record
    """
    # If we have a direct PostgreSQL connection string, use it for more efficient pgvector operations
    if conn_string:
        try:
            conn = await asyncpg.connect(conn_string)
            try:
                # Insert the chunk with the embedding vector
                result = await conn.fetchrow(
                    """
                    INSERT INTO document_chunks (document_id, content, chunk_index, embedding, metadata)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                    """,
                    document_id,
                    chunk_data["content"],
                    chunk_data["chunk_index"],
                    embedding,  # asyncpg supports pgvector directly
                    json.dumps(chunk_data["metadata"])
                )
                
                return {"id": result["id"], "document_id": document_id}
                
            finally:
                await conn.close()
        except Exception as e:
            print(f"PostgreSQL error: {str(e)}")
            # Fall back to Supabase if direct connection fails
    
    # Use Supabase client as fallback
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Insert chunk using Supabase's REST interface
        # Note: This requires Supabase Functions or custom API to handle the embedding vector
        response = await asyncio.to_thread(
            lambda: supabase.table('document_chunks')
                .insert({
                    'document_id': document_id,
                    'content': chunk_data["content"],
                    'chunk_index': chunk_data["chunk_index"],
                    'embedding': embedding,  # May need special handling depending on Supabase configuration
                    'metadata': chunk_data["metadata"]
                })
                .execute()
        )
        
        return response.data[0] if response.data else {"error": "Failed to store chunk"}
        
    except Exception as e:
        return {"error": f"Error storing chunk: {str(e)}"}

# Main document processing workflow
async def process_document(
    document_id: str,
    supabase_url: str,
    supabase_key: str,
    openai_api_key: str,
    conn_string: Optional[str] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> Dict[str, Any]:
    """
    Process a document through the complete ingestion pipeline
    
    Args:
        document_id: ID of the document to process
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        openai_api_key: OpenAI API key for embeddings
        conn_string: Optional direct PostgreSQL connection string
        chunk_size: Maximum size of each text chunk
        chunk_overlap: Overlap between chunks
        
    Returns:
        Processing result summary
    """
    try:
        # Update document status to processing
        await update_doc_status_db(document_id, "processing", None, supabase_url, supabase_key)
        
        # Download and parse document
        parsed_data = await download_and_parse(document_id, supabase_url, supabase_key)
        if "error" in parsed_data:
            await update_doc_status_db(document_id, "failed", parsed_data["error"], supabase_url, supabase_key)
            return {"success": False, "error": parsed_data["error"]}
        
        # Chunk the text
        chunks = await chunk_text(parsed_data["content"], chunk_size, chunk_overlap)
        
        # Process each chunk (generate embedding and store)
        chunk_results = []
        for chunk in chunks:
            # Generate embedding
            embedding = await generate_embedding(chunk["content"], openai_api_key)
            
            # Store chunk with embedding
            result = await store_chunk_db(document_id, chunk, embedding, supabase_url, supabase_key, conn_string)
            chunk_results.append(result)
        
        # Update document status to processed
        await update_doc_status_db(document_id, "processed", None, supabase_url, supabase_key)
        
        return {
            "success": True,
            "document_id": document_id,
            "chunks_processed": len(chunk_results),
            "chunks": chunk_results
        }
        
    except Exception as e:
        error_message = str(e)
        # Update document status to failed
        await update_doc_status_db(document_id, "failed", error_message, supabase_url, supabase_key)
        return {"success": False, "error": error_message}

# Windmill entrypoint for document processing workflow
async def main(
    document_id: str,
    supabase_url: str,
    supabase_key: str,
    openai_api_key: str,
    conn_string: Optional[str] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> Dict[str, Any]:
    """
    Windmill entry point for document processing
    
    Args:
        document_id: ID of the document to process
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        openai_api_key: OpenAI API key for embeddings
        conn_string: Optional direct PostgreSQL connection string
        chunk_size: Maximum size of each text chunk
        chunk_overlap: Overlap between chunks
        
    Returns:
        Processing result summary
    """
    return await process_document(
        document_id=document_id,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        openai_api_key=openai_api_key,
        conn_string=conn_string,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )

# Windmill entrypoint for webhook handler
async def handle_webhook(
    event_data: Dict[Any, Any],
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Windmill entry point for handling Supabase Storage webhook
    
    Args:
        event_data: The webhook payload data
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        Dict containing the created brain_document record
    """
    return await handle_storage_event(event_data, supabase_url, supabase_key) 