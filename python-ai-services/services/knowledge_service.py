import uuid
from supabase import Client as SupabaseClient
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sentence_transformers import SentenceTransformer
from ..models.knowledge_models import SharedKnowledgeItem
import logging
import os

logger = logging.getLogger(__name__)

DEFAULT_EMBEDDING_MODEL_NAME = os.getenv("KNOWLEDGE_EMBEDDING_MODEL", 'all-MiniLM-L6-v2')
EXPECTED_DB_EMBEDDING_DIM = 1536 

class SharedKnowledgeService:
    _loaded_embedding_models: Dict[str, SentenceTransformer] = {}
    _model_dimensions: Dict[str, int] = {}

    def __init__(self, supabase: SupabaseClient, embedding_model_name: Optional[str] = None):
        self.supabase = supabase
        self.embedding_model: Optional[SentenceTransformer] = None
        self.model_actual_dimension: Optional[int] = None
        model_to_load = embedding_model_name if embedding_model_name else DEFAULT_EMBEDDING_MODEL_NAME
        
        if model_to_load:
            if model_to_load in SharedKnowledgeService._loaded_embedding_models:
                self.embedding_model = SharedKnowledgeService._loaded_embedding_models[model_to_load]
                self.model_actual_dimension = SharedKnowledgeService._model_dimensions[model_to_load]
                logger.info(f"Reusing loaded SentenceTransformer model '{model_to_load}'. Dimension: {self.model_actual_dimension}")
            else:
                try:
                    logger.info(f"Attempting to load SentenceTransformer model: '{model_to_load}'")
                    model_instance = SentenceTransformer(model_to_load)
                    test_embedding = model_instance.encode("test")
                    actual_dimension = len(test_embedding) # type: ignore
                    
                    SharedKnowledgeService._loaded_embedding_models[model_to_load] = model_instance
                    SharedKnowledgeService._model_dimensions[model_to_load] = actual_dimension
                    self.embedding_model = model_instance
                    self.model_actual_dimension = actual_dimension
                    logger.info(f"SentenceTransformer model '{model_to_load}' loaded. Output: {self.model_actual_dimension}.")
                    if self.model_actual_dimension != EXPECTED_DB_EMBEDDING_DIM:
                        logger.warning(f"MISMATCH: Model '{model_to_load}' dim {self.model_actual_dimension} != DB dim {EXPECTED_DB_EMBEDDING_DIM}.")
                except Exception as e:
                    logger.error(f"Failed to load SentenceTransformer model '{model_to_load}': {e}", exc_info=True)
        else:
            logger.warning("No embedding model name; embedding generation disabled.")

    def _generate_embedding(self, text: str) -> Optional[List[float]]: # This remains sync as encode() is CPU-bound
        if self.embedding_model and text:
            if self.model_actual_dimension != EXPECTED_DB_EMBEDDING_DIM:
                logger.error(f"Cannot embed: Model dim ({self.model_actual_dimension}) != DB dim ({EXPECTED_DB_EMBEDDING_DIM}).")
                return None
            try:
                return self.embedding_model.encode(text).tolist()
            except Exception as e:
                logger.error(f"Embedding generation failed: {e}", exc_info=True)
        elif not self.embedding_model:
             logger.warning("Embedding generation skipped: No model.")
        return None

    async def add_knowledge_item(
        self, content_text: str, source_agent_id: Optional[uuid.UUID] = None,
        tags: Optional[List[str]] = None, symbols_referenced: Optional[List[str]] = None,
        knowledge_type: Optional[str] = None, importance_score: float = 0.5,
        confidence_score: Optional[float] = None, metadata: Optional[Dict[str, Any]] = None,
        embedding: Optional[List[float]] = None
    ) -> SharedKnowledgeItem:
        if embedding is None and self.embedding_model:
            logger.info(f"Attempting to generate embedding for content (async wrapper): {content_text[:50]}...")
            # Run sync CPU-bound encode in a thread pool if this service were truly async
            # For now, direct call as it's from an async method.
            embedding = self._generate_embedding(content_text)
            if embedding is None: logger.warning(f"Embedding failed/skipped for: {content_text[:50]}")

        item_data = {
            "source_agent_id": str(source_agent_id) if source_agent_id else None,
            "content_text": content_text, "embedding": embedding, "tags": tags or [],
            "symbols_referenced": symbols_referenced or [], "knowledge_type": knowledge_type,
            "importance_score": importance_score, "confidence_score": confidence_score,
            "metadata": metadata or {},
        }
        db_payload = {k: v for k, v in item_data.items()}
        try:
            response = self.supabase.table("shared_knowledge_items").insert(db_payload).select("*").execute()
            if response.error or not response.data:
                error_msg = response.error.message if response.error else "No data returned."
                logger.error(f"DB error adding knowledge item: {error_msg}")
                raise Exception(f"DB error: {error_msg}")
            return SharedKnowledgeItem(**response.data[0])
        except Exception as e:
            logger.error(f"Exception inserting knowledge item: {e}", exc_info=True)
            raise Exception(f"Could not add item: {e}")

    async def query_shared_knowledge_by_text(
        self, query_text: str, top_k: int = 5, knowledge_type: Optional[str] = None,
        tags: Optional[List[str]] = None, symbols: Optional[List[str]] = None
    ) -> List[SharedKnowledgeItem]:
        if not self.embedding_model or self.model_actual_dimension != EXPECTED_DB_EMBEDDING_DIM:
            logger.warning("Vector search conditions not met (no model/dim mismatch). Using fallback.")
            return await self._fallback_text_search(query_text, top_k, knowledge_type, tags, symbols)
        
        query_embedding = self._generate_embedding(query_text)
        if query_embedding is None:
            logger.warning("Query embedding failed. Using fallback.")
            return await self._fallback_text_search(query_text, top_k, knowledge_type, tags, symbols)

        rpc_params = {'query_embedding': query_embedding, 'match_count': top_k}
        # Add filters to rpc_params for knowledge_type, tags, symbols if RPC supports them.
        # This requires modifying the RPC function in Supabase.
        # Example: rpc_params.update({'filter_knowledge_type': knowledge_type, ...})
        try:
            logger.info(f"Attempting RPC vector search with query: {query_text[:50]}")
            response = self.supabase.rpc('match_shared_knowledge', rpc_params).execute() # Assumes RPC exists
            if response.error:
                logger.error(f"RPC error: {response.error.message}. Falling back.")
                return await self._fallback_text_search(query_text, top_k, knowledge_type, tags, symbols)
            return [SharedKnowledgeItem(**item) for item in response.data] if response.data else []
        except Exception as e:
            logger.error(f"RPC query exception: {e}. Falling back.", exc_info=True)
            return await self._fallback_text_search(query_text, top_k, knowledge_type, tags, symbols)

    async def _fallback_text_search(
        self, query_text: str, top_k: int = 5, knowledge_type: Optional[str] = None,
        tags: Optional[List[str]] = None, symbols: Optional[List[str]] = None
    ) -> List[SharedKnowledgeItem]:
        logger.info(f"Executing fallback text search for: {query_text[:50]}")
        try:
            query_builder = self.supabase.table("shared_knowledge_items").select("*")
            if knowledge_type: query_builder = query_builder.eq("knowledge_type", knowledge_type)
            if tags: query_builder = query_builder.cs("tags", tags)
            if symbols: query_builder = query_builder.cs("symbols_referenced", symbols)
            query_builder = query_builder.ilike("content_text", f"%{query_text}%")
            response = query_builder.limit(top_k).execute()
            if response.error:
                logger.error(f"Fallback search error: {response.error.message}")
                return []
            return [SharedKnowledgeItem(**item) for item in response.data] if response.data else []
        except Exception as e:
            logger.error(f"Fallback search exception: {e}", exc_info=True)
            return []

    async def get_knowledge_item_by_id(self, item_id: uuid.UUID) -> Optional[SharedKnowledgeItem]:
        try:
            response = self.supabase.table("shared_knowledge_items").select("*").eq("item_id", str(item_id)).single().execute()
            if response.data: return SharedKnowledgeItem(**response.data[0])
            if response.error: logger.error(f"Error getting item by ID {item_id}: {response.error.message}")
            return None
        except Exception as e:
            logger.error(f"Exception getting item by ID {item_id}: {e}", exc_info=True)
            return None
