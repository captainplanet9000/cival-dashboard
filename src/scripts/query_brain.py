import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
import openai
from supabase import create_client, Client

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('brain_query')

class BrainQueryService:
    """Service for querying brain documents using vector similarity search"""
    
    def __init__(self, supabase_url: str, supabase_key: str, openai_api_key: str):
        """
        Initialize the BrainQueryService
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
            openai_api_key: OpenAI API key for embeddings
        """
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.openai_api_key = openai_api_key
        
        # Initialize Supabase client
        self.supabase = create_client(supabase_url, supabase_key)
        
        # Set OpenAI API key
        openai.api_key = openai_api_key
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate vector embedding for text using OpenAI API
        
        Args:
            text: The text to embed
            
        Returns:
            List of embedding values
        """
        try:
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
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def query_brain_database(
        self, 
        brain_id: str, 
        embedding: List[float], 
        limit: int = 5, 
        threshold: float = 0.7,
        conn_string: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query brain documents using vector similarity search
        
        Args:
            brain_id: ID of the brain to query
            embedding: Query embedding vector
            limit: Maximum number of results to return
            threshold: Minimum similarity threshold (0-1)
            conn_string: Optional direct PostgreSQL connection string
            
        Returns:
            List of document chunks matching the query
        """
        try:
            # Use SQL function defined in migration
            response = await asyncio.to_thread(
                lambda: self.supabase.rpc(
                    'query_brain',
                    {
                        'p_brain_id': brain_id,
                        'p_query': None,  # We're using embedding directly
                        'p_embedding': embedding,
                        'p_limit': limit,
                        'p_threshold': threshold
                    }
                ).execute()
            )
            
            if not response.data:
                return []
                
            return response.data
            
        except Exception as e:
            logger.error(f"Error querying brain database: {str(e)}")
            return []
    
    async def get_brain_for_farm(self, farm_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the brain associated with a farm
        
        Args:
            farm_id: ID of the farm
            
        Returns:
            Brain record or None if not found
        """
        try:
            response = await asyncio.to_thread(
                lambda: self.supabase.table('brains')
                    .select('*')
                    .eq('farm_id', farm_id)
                    .is_('is_active', True)
                    .limit(1)
                    .execute()
            )
            
            if not response.data or len(response.data) == 0:
                return None
                
            return response.data[0]
            
        except Exception as e:
            logger.error(f"Error getting brain for farm: {str(e)}")
            return None
    
    async def query_brain(
        self, 
        farm_id: str, 
        query: str, 
        limit: int = 5, 
        threshold: float = 0.7,
        generate_summary: bool = False
    ) -> Dict[str, Any]:
        """
        Main method to query a farm's brain with natural language
        
        Args:
            farm_id: ID of the farm
            query: Natural language query
            limit: Maximum number of results to return
            threshold: Minimum similarity threshold (0-1)
            generate_summary: Whether to generate an LLM synthesis of results
            
        Returns:
            Dict with query results and optional summary
        """
        try:
            # Get the brain for this farm
            brain = await self.get_brain_for_farm(farm_id)
            if not brain:
                return {
                    "success": False,
                    "error": f"No active brain found for farm {farm_id}"
                }
                
            brain_id = brain['id']
            
            # Generate embedding for the query
            embedding = await self.generate_embedding(query)
            
            # Query the brain with the embedding
            results = await self.query_brain_database(brain_id, embedding, limit, threshold)
            
            if not results:
                return {
                    "success": True,
                    "results": [],
                    "message": "No relevant documents found for the query",
                    "brain_id": brain_id,
                    "brain_name": brain['name']
                }
                
            # Format results for return
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "chunk_id": result["chunk_id"],
                    "document_id": result["document_id"],
                    "document_title": result["document_title"],
                    "content": result["content"],
                    "similarity": result["similarity"]
                })
            
            response = {
                "success": True,
                "results": formatted_results,
                "brain_id": brain_id,
                "brain_name": brain['name']
            }
            
            # Generate summary if requested
            if generate_summary and formatted_results:
                summary = await self.generate_summary(query, formatted_results)
                response["summary"] = summary
                
            return response
            
        except Exception as e:
            logger.error(f"Error in query_brain: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_summary(self, query: str, results: List[Dict[str, Any]]) -> str:
        """
        Generate an LLM synthesis of query results
        
        Args:
            query: The original query
            results: List of document chunks and their contents
            
        Returns:
            Synthesized summary
        """
        try:
            # Create a context from the results
            context = "\n\n".join([
                f"DOCUMENT: {r['document_title']}\n{r['content']}" 
                for r in results
            ])
            
            # Create a prompt for the LLM
            prompt = f"""
            You are an assistant helping to analyze information from a knowledge base.
            
            USER QUERY: {query}
            
            CONTEXT FROM KNOWLEDGE BASE:
            {context}
            
            Based only on the information provided in the CONTEXT, please provide a comprehensive, accurate, and helpful response to the user's query.
            If the information in the context is not sufficient to fully answer the query, acknowledge the limitations of what you can provide.
            Do not make up information not present in the context.
            """
            
            # Call OpenAI Chat API
            response = await asyncio.to_thread(
                lambda: openai.ChatCompletion.create(
                    model="gpt-4",  # or a more suitable model
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return "Error generating summary. Please check the individual results."

# Windmill entrypoint for querying a brain
async def query_brain(
    farm_id: str,
    query: str,
    supabase_url: str,
    supabase_key: str,
    openai_api_key: str,
    limit: int = 5,
    threshold: float = 0.7,
    generate_summary: bool = False
) -> Dict[str, Any]:
    """
    Windmill entry point for querying a brain
    
    Args:
        farm_id: ID of the farm
        query: Natural language query
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        openai_api_key: OpenAI API key for embeddings and optional synthesis
        limit: Maximum number of results to return
        threshold: Minimum similarity threshold (0-1)
        generate_summary: Whether to generate an LLM synthesis of results
        
    Returns:
        Dict with query results and optional summary
    """
    service = BrainQueryService(supabase_url, supabase_key, openai_api_key)
    return await service.query_brain(farm_id, query, limit, threshold, generate_summary)

# Entry point for testing the script directly
async def main():
    # Sample parameters for testing
    await query_brain(
        farm_id="test_farm_id",
        query="What are the best trading strategies for volatile markets?",
        supabase_url="https://example.supabase.co",
        supabase_key="your_key_here",
        openai_api_key="your_openai_key_here",
        generate_summary=True
    )

if __name__ == "__main__":
    asyncio.run(main()) 