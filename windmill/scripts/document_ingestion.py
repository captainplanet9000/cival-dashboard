import asyncio
import json
import os
import re
import hashlib
import tempfile
from typing import List, Dict, Any, Optional
import httpx
import asyncpg
from openai import AsyncOpenAI
from pydantic import BaseModel

# Document processing libraries
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    import markdown
except ImportError:
    markdown = None

# Types and models
class ChunkData(BaseModel):
    content: str
    metadata: Dict[str, Any]
    chunk_index: int

class WebhookPayload(BaseModel):
    record: Dict[str, Any]
    old_record: Optional[Dict[str, Any]] = None
    table: str
    schema: str
    type: str

async def handle_webhook(
    event_data: Dict[str, Any],
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Handle the webhook event from Supabase Storage.
    
    Args:
        event_data: The webhook payload
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Dictionary with document ID and status
    """
    try:
        # Parse the webhook data
        if "record" not in event_data:
            return {"error": "Invalid webhook data format"}
        
        # Extract metadata from the storage event
        storage_path = event_data["record"].get("path", "")
        if not storage_path:
            return {"error": "No file path provided"}
        
        # Expected format: farm_brains/{farm_id}/uploads/{filename}
        path_parts = storage_path.strip("/").split("/")
        if len(path_parts) < 4 or path_parts[0] != "farm_brains":
            return {"error": f"Invalid storage path format: {storage_path}"}
        
        farm_id = path_parts[1]
        filename = path_parts[-1]
        
        # Get file extension and determine content type
        _, file_ext = os.path.splitext(filename)
        file_ext = file_ext.lower().lstrip(".")
        
        content_type_map = {
            "pdf": "pdf",
            "docx": "docx",
            "doc": "docx",
            "txt": "text",
            "md": "markdown",
            "html": "html",
            "htm": "html",
        }
        
        content_type = content_type_map.get(file_ext, "unknown")
        if content_type == "unknown":
            return {"error": f"Unsupported file type: {file_ext}"}
        
        # Find or create brain for this farm
        async with httpx.AsyncClient() as client:
            # Check for existing brain
            brain_response = await client.get(
                f"{supabase_url}/rest/v1/brains",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                },
                params={
                    "select": "*",
                    "farm_id": f"eq.{farm_id}",
                    "limit": "1"
                }
            )
            
            if brain_response.status_code != 200:
                return {"error": f"Failed to fetch brain: {brain_response.text}"}
            
            brains = brain_response.json()
            
            # If no brain exists, create one
            if not brains:
                brain_create_response = await client.post(
                    f"{supabase_url}/rest/v1/brains",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json={
                        "farm_id": farm_id,
                        "name": "Main Brain",
                        "description": "Primary knowledge base for farm",
                        "type": "general"
                    }
                )
                
                if brain_create_response.status_code != 201:
                    return {"error": f"Failed to create brain: {brain_create_response.text}"}
                
                brain = brain_create_response.json()[0]
            else:
                brain = brains[0]
            
            brain_id = brain["id"]
            
            # Create a document record
            document_create_response = await client.post(
                f"{supabase_url}/rest/v1/brain_documents",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={
                    "brain_id": brain_id,
                    "title": filename,
                    "description": f"Uploaded document: {filename}",
                    "file_path": storage_path,
                    "content_type": content_type,
                    "status": "pending",
                    "metadata": {
                        "original_filename": filename,
                        "file_extension": file_ext,
                        "file_size": event_data["record"].get("metadata", {}).get("size", 0)
                    }
                }
            )
            
            if document_create_response.status_code != 201:
                return {"error": f"Failed to create document: {document_create_response.text}"}
            
            document = document_create_response.json()[0]
            document_id = document["id"]
            
            return {
                "document_id": document_id,
                "brain_id": brain_id,
                "farm_id": farm_id,
                "filename": filename,
                "content_type": content_type,
                "status": "pending",
                "storage_path": storage_path
            }
            
    except Exception as e:
        return {"error": str(e)}

async def update_doc_status_db(
    document_id: str,
    status: str,
    supabase_url: str,
    supabase_key: str,
    error_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update the status of a document in the database.
    
    Args:
        document_id: The document ID
        status: The new status
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        error_message: Optional error message
        
    Returns:
        Updated document object
    """
    try:
        update_data = {"status": status}
        if error_message:
            update_data["error_message"] = error_message
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{supabase_url}/rest/v1/brain_documents",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                params={
                    "id": f"eq.{document_id}"
                },
                json=update_data
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to update document status: {response.text}")
            
            return response.json()[0]
            
    except Exception as e:
        print(f"Error in update_doc_status_db: {str(e)}")
        return {"error": str(e)}

async def download_and_parse(
    document_id: str,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    Download a document from Supabase Storage and parse its content.
    
    Args:
        document_id: The document ID
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Dictionary with parsed content
    """
    try:
        # Fetch document details
        async with httpx.AsyncClient() as client:
            doc_response = await client.get(
                f"{supabase_url}/rest/v1/brain_documents",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                },
                params={
                    "select": "*",
                    "id": f"eq.{document_id}"
                }
            )
            
            if doc_response.status_code != 200:
                raise Exception(f"Failed to fetch document: {doc_response.text}")
            
            docs = doc_response.json()
            if not docs:
                raise Exception(f"Document not found: {document_id}")
            
            document = docs[0]
            file_path = document.get("file_path")
            content_type = document.get("content_type")
            
            if not file_path:
                raise Exception("Document has no file_path")
            
            # Download the file from Supabase Storage
            storage_prefix = "/storage/v1/object"
            download_url = f"{supabase_url}{storage_prefix}/public/{file_path}"
            
            download_response = await client.get(
                download_url,
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}"
                }
            )
            
            if download_response.status_code != 200:
                raise Exception(f"Failed to download file: {download_response.text}")
            
            # Save the file to a temporary location
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(download_response.content)
                temp_path = temp_file.name
            
            # Parse the file based on content type
            content = ""
            try:
                if content_type == "pdf":
                    if not PyPDF2:
                        raise ImportError("PyPDF2 is not installed")
                    
                    content = _parse_pdf(temp_path)
                elif content_type == "docx":
                    if not docx:
                        raise ImportError("python-docx is not installed")
                    
                    content = _parse_docx(temp_path)
                elif content_type == "text":
                    with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                elif content_type == "markdown":
                    if not markdown:
                        raise ImportError("markdown is not installed")
                    
                    with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                        md_content = f.read()
                        html_content = markdown.markdown(md_content)
                        if BeautifulSoup:
                            content = BeautifulSoup(html_content, "html.parser").get_text()
                        else:
                            # Basic fallback if BeautifulSoup is not available
                            content = re.sub(r'<[^<]+?>', '', html_content)
                elif content_type == "html":
                    if not BeautifulSoup:
                        raise ImportError("BeautifulSoup is not installed")
                    
                    with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                        html_content = f.read()
                        content = BeautifulSoup(html_content, "html.parser").get_text()
                else:
                    raise ValueError(f"Unsupported content type: {content_type}")
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(temp_path)
                except:
                    pass
            
            return {
                "document_id": document_id,
                "content": content,
                "content_type": content_type,
                "title": document.get("title", ""),
                "metadata": document.get("metadata", {})
            }
            
    except Exception as e:
        print(f"Error in download_and_parse: {str(e)}")
        return {"error": str(e)}

def _parse_pdf(file_path: str) -> str:
    """Parse a PDF file and return its text content."""
    if not PyPDF2:
        raise ImportError("PyPDF2 is not installed")
    
    content = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            content += page.extract_text() + "\n\n"
    
    return content

def _parse_docx(file_path: str) -> str:
    """Parse a DOCX file and return its text content."""
    if not docx:
        raise ImportError("python-docx is not installed")
    
    doc = docx.Document(file_path)
    content = "\n\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
    
    return content

def chunk_text(
    content: str,
    chunk_size: int = 1000,
    overlap: int = 200
) -> List[ChunkData]:
    """
    Split the text into chunks with overlap.
    
    Args:
        content: The text content to chunk
        chunk_size: The maximum size of each chunk
        overlap: The overlap between chunks
        
    Returns:
        List of ChunkData objects
    """
    if not content:
        return []
    
    # Clean the text
    content = re.sub(r'\s+', ' ', content).strip()
    
    # Split the text into sentences
    sentences = re.split(r'(?<=[.!?])\s+', content)
    
    chunks = []
    current_chunk = ""
    current_chunk_size = 0
    chunk_index = 0
    
    for sentence in sentences:
        sentence_len = len(sentence)
        
        if current_chunk_size + sentence_len <= chunk_size:
            # Add sentence to current chunk
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
            current_chunk_size += sentence_len
        else:
            # Current chunk is full, save it
            if current_chunk:
                chunks.append(ChunkData(
                    content=current_chunk,
                    chunk_index=chunk_index,
                    metadata={"length": current_chunk_size}
                ))
                chunk_index += 1
                
                # Start a new chunk with overlap
                overlap_text = " ".join(current_chunk.split(" ")[-overlap:]) if overlap > 0 else ""
                current_chunk = overlap_text + " " + sentence
                current_chunk_size = len(current_chunk)
            else:
                # Edge case: single sentence exceeds chunk size
                chunks.append(ChunkData(
                    content=sentence[:chunk_size],
                    chunk_index=chunk_index,
                    metadata={"length": min(sentence_len, chunk_size)}
                ))
                chunk_index += 1
                
                # Continue with the rest of the sentence
                if sentence_len > chunk_size:
                    current_chunk = sentence[chunk_size:]
                    current_chunk_size = len(current_chunk)
                else:
                    current_chunk = ""
                    current_chunk_size = 0
    
    # Add the last chunk if there's anything left
    if current_chunk:
        chunks.append(ChunkData(
            content=current_chunk,
            chunk_index=chunk_index,
            metadata={"length": current_chunk_size}
        ))
    
    return chunks

async def generate_embedding(
    text: str,
    openai_api_key: str
) -> List[float]:
    """
    Generate an embedding for a piece of text using OpenAI's API.
    
    Args:
        text: The text to generate an embedding for
        openai_api_key: The OpenAI API key
        
    Returns:
        List of floats representing the embedding vector
    """
    try:
        client = AsyncOpenAI(api_key=openai_api_key)
        
        # Prepare the text
        text = text.replace("\n", " ").strip()
        if not text:
            return []
        
        # Call the OpenAI API
        response = await client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        
        # Extract the embedding
        embedding = response.data[0].embedding
        
        return embedding
    
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        return []

async def store_chunk_db(
    document_id: str,
    chunk_data: Dict[str, Any],
    embedding: List[float],
    supabase_url: str,
    supabase_key: str,
    conn_string: str
) -> Dict[str, Any]:
    """
    Store a document chunk with its embedding in the database.
    
    Args:
        document_id: The document ID
        chunk_data: The chunk data
        embedding: The embedding vector
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        conn_string: The database connection string
        
    Returns:
        Stored chunk object
    """
    if not embedding:
        return {"error": "Empty embedding vector"}
    
    try:
        # Store in document_chunks table directly using asyncpg
        # This is more efficient than using the REST API for vector data
        conn = await asyncpg.connect(conn_string)
        
        try:
            chunk_id = await conn.fetchval(
                """
                INSERT INTO document_chunks 
                (document_id, content, chunk_index, embedding, metadata)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
                """,
                document_id,
                chunk_data["content"],
                chunk_data["chunk_index"],
                embedding,
                json.dumps(chunk_data["metadata"])
            )
            
            return {
                "id": chunk_id,
                "document_id": document_id,
                "chunk_index": chunk_data["chunk_index"],
                "content_length": len(chunk_data["content"]),
                "embedding_dimensions": len(embedding)
            }
            
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"Error in store_chunk_db: {str(e)}")
        
        # Fallback to REST API if direct DB connection fails
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{supabase_url}/rest/v1/document_chunks",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json={
                        "document_id": document_id,
                        "content": chunk_data["content"],
                        "chunk_index": chunk_data["chunk_index"],
                        "embedding": embedding,
                        "metadata": chunk_data["metadata"]
                    }
                )
                
                if response.status_code != 201:
                    raise Exception(f"Failed to store chunk: {response.text}")
                
                return response.json()[0]
                
        except Exception as fallback_error:
            return {"error": f"Primary error: {str(e)}, Fallback error: {str(fallback_error)}"} 