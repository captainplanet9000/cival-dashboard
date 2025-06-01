import asyncio
import json
from typing import List, Dict, Any, Optional, Union
import httpx
import asyncpg
from openai import AsyncOpenAI

async def generate_embedding(
    query: str,
    openai_api_key: str
) -> List[float]:
    """
    Generate an embedding for a query string using OpenAI's API.
    
    Args:
        query: The query text
        openai_api_key: The OpenAI API key
        
    Returns:
        List of floats representing the embedding vector
    """
    try:
        client = AsyncOpenAI(api_key=openai_api_key)
        
        # Prepare the query
        query = query.replace("\n", " ").strip()
        if not query:
            return []
        
        # Call the OpenAI API
        response = await client.embeddings.create(
            model="text-embedding-ada-002",
            input=query
        )
        
        # Extract the embedding
        embedding = response.data[0].embedding
        
        return embedding
    
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        return []

async def query_brain_db(
    brain_id: str,
    query: str,
    embedding: List[float],
    conn_string: str,
    limit: int = 5,
    threshold: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Query the brain for relevant document chunks using vector similarity search.
    
    Args:
        brain_id: The brain ID
        query: The query text
        embedding: The query embedding vector
        conn_string: The database connection string
        limit: Maximum number of results to return
        threshold: Similarity threshold (0-1)
        
    Returns:
        List of relevant document chunks with similarity scores
    """
    if not embedding:
        return []
    
    try:
        # Connect to the database
        conn = await asyncpg.connect(conn_string)
        
        try:
            # Use the query_brain function defined in the migration
            # This performs a vector similarity search using the <=> operator from pgvector
            rows = await conn.fetch(
                """
                SELECT * FROM query_brain($1, $2, $3, $4, $5)
                """,
                brain_id,
                query,
                embedding,
                limit,
                threshold
            )
            
            results = []
            for row in rows:
                # Convert row to a dictionary
                result = dict(row)
                result["similarity"] = float(result["similarity"])
                results.append(result)
            
            return results
            
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"Error in query_brain_db: {str(e)}")
        return []

async def query_brain_api(
    farm_id: str,
    query: str,
    openai_api_key: str,
    supabase_url: str,
    supabase_key: str,
    with_synthesis: bool = False,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Query a brain with natural language, optionally synthesizing an answer.
    
    Args:
        farm_id: The farm ID
        query: The natural language query
        openai_api_key: The OpenAI API key
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        with_synthesis: Whether to synthesize an answer using OpenAI
        limit: Maximum number of chunks to return
        
    Returns:
        Dictionary with results and optional synthesis
    """
    try:
        # First, find the brain for this farm
        async with httpx.AsyncClient() as client:
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
                raise Exception(f"Failed to fetch brain: {brain_response.text}")
            
            brains = brain_response.json()
            if not brains:
                return {"error": "No brain found for this farm"}
            
            brain_id = brains[0]["id"]
            
            # Generate embedding for the query
            embedding = await generate_embedding(query, openai_api_key)
            if not embedding:
                return {"error": "Failed to generate embedding"}
            
            # Get the database connection string from Supabase connection info
            db_info_response = await client.get(
                f"{supabase_url}/rest/v1/rpc/get_connection_info",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if db_info_response.status_code != 200:
                raise Exception("Failed to get connection information")
            
            conn_info = db_info_response.json()
            conn_string = f"postgresql://{conn_info['user']}:{conn_info['password']}@{conn_info['host']}:{conn_info['port']}/{conn_info['database']}"
            
            # Query the brain via direct DB connection
            results = await query_brain_db(
                brain_id,
                query,
                embedding,
                conn_string,
                limit=limit,
                threshold=0.65  # Lower threshold to get more diverse results
            )
            
            response = {
                "query": query,
                "results": results,
                "result_count": len(results)
            }
            
            # Synthesize an answer if requested
            if with_synthesis and results:
                synthesis = await synthesize_answer(query, results, openai_api_key)
                response["synthesis"] = synthesis
            
            return response
            
    except Exception as e:
        return {"error": str(e)}

async def synthesize_answer(
    query: str,
    results: List[Dict[str, Any]],
    openai_api_key: str
) -> str:
    """
    Synthesize an answer to a query using the retrieved chunks and OpenAI.
    
    Args:
        query: The natural language query
        results: The retrieved document chunks
        openai_api_key: The OpenAI API key
        
    Returns:
        Synthesized answer string
    """
    try:
        client = AsyncOpenAI(api_key=openai_api_key)
        
        # Prepare the context from retrieved chunks
        context = "\n\n".join([
            f"[Document: {r['document_title']}]\n{r['content']}"
            for r in results
        ])
        
        # Create the prompt
        prompt = f"""
You are an assistant that answers questions based on the provided information. 
Answer the query only using the context provided below. 
Be concise and specific, referring directly to the information in the context.
If the context doesn't provide enough information to answer the query, say "I don't have enough information to answer that question."

Query: {query}

Context:
{context}

Answer:
"""
        
        # Call OpenAI API
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers questions based only on the provided context."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        answer = response.choices[0].message.content.strip()
        return answer
        
    except Exception as e:
        print(f"Error in synthesize_answer: {str(e)}")
        return f"Error generating answer: {str(e)}"

async def brain_query_tool(
    message: str,
    farm_id: str,
    openai_api_key: str,
    supabase_url: str,
    supabase_key: str
) -> Dict[str, Any]:
    """
    ElizaOS tool for querying the brain knowledge base (@brain/query).
    
    Args:
        message: The query message
        farm_id: The farm ID
        openai_api_key: The OpenAI API key
        supabase_url: The Supabase project URL
        supabase_key: The Supabase service role key
        
    Returns:
        Tool response with synthesis and sources
    """
    response = await query_brain_api(
        farm_id=farm_id,
        query=message,
        openai_api_key=openai_api_key,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        with_synthesis=True,
        limit=5
    )
    
    if "error" in response:
        return {
            "success": False,
            "message": response["error"],
            "data": None
        }
    
    synthesis = response.get("synthesis", "No information found.")
    
    # Format sources from results
    sources = []
    for result in response.get("results", []):
        sources.append({
            "title": result.get("document_title", "Unknown document"),
            "content": result.get("content", ""),
            "similarity": result.get("similarity", 0)
        })
    
    return {
        "success": True,
        "message": "Query successful",
        "data": {
            "answer": synthesis,
            "sources": sources,
            "query": message
        }
    } 