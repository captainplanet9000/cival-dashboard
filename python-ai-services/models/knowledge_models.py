from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone # Ensure timezone for default_factory
import uuid

class SharedKnowledgeItem(BaseModel):
    item_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    source_agent_id: Optional[uuid.UUID] = Field(default=None, description="The agent that contributed this item, if applicable.")
    # Consider source_crew_run_id or source_task_id if granularity is needed
    
    content_text: str = Field(..., description="The core piece of knowledge/information.")
    embedding: Optional[List[float]] = Field(default=None, description="Vector embedding for similarity search. Dimension depends on the model used (e.g., 1536 for OpenAI ada-002).")
    
    tags: Optional[List[str]] = Field(default_factory=list, description="Keywords or tags for categorization and search.")
    symbols_referenced: Optional[List[str]] = Field(default_factory=list, description="Financial symbols (e.g., BTC/USD, AAPL) referenced in the content.")
    knowledge_type: Optional[str] = Field(default=None, description="Type of knowledge, e.g., 'market_insight', 'trade_outcome', 'risk_assessment', 'learning'.")
    
    importance_score: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Assigned importance of this knowledge item (0.0 to 1.0).")
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Confidence in the accuracy of this knowledge item, if applicable (0.0 to 1.0).")
    
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional structured metadata about the knowledge item.")
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # last_accessed_at: Optional[datetime] = None # Could be useful for LRU cache or relevance scoring
    # expires_at: Optional[datetime] = None # For ephemeral knowledge

    class Config:
        from_attributes = True # Enables ORM mode features for Pydantic v2
        validate_assignment = True
        extra = 'forbid'

# Example Usage (for testing or understanding)
# if __name__ == "__main__":
#     item1 = SharedKnowledgeItem(
#         source_agent_id=uuid.uuid4(),
#         content_text="Bitcoin is showing strong bullish signals due to recent ETF approvals.",
#         tags=["bitcoin", "etf", "bullish"],
#         symbols_referenced=["BTC/USD"],
#         knowledge_type="market_insight",
#         importance_score=0.8,
#         confidence_score=0.75,
#         metadata={"source_analysis_id": "analysis_123"}
#     )
#     print(item1.model_dump_json(indent=2))

#     item2 = SharedKnowledgeItem(
#         content_text="SMA Crossover strategy for AAPL resulted in a small loss in backtesting for Q1 2023.",
#         tags=["sma_crossover", "aapl", "backtest_result", "loss"],
#         symbols_referenced=["AAPL"],
#         knowledge_type="trade_outcome",
#         importance_score=0.6,
#         metadata={"backtest_run_id": "bk_run_456"}
#     )
#     print(item2.model_dump_json(indent=2))
#     print(f"Item2 created at (UTC): {item2.created_at.isoformat()}") # Should show Z or +00:00
# Added timezone.utc to created_at default_factory.
# Made confidence_score Optional and default to None, as it's not always applicable.
# Added descriptions to all fields for clarity.
# Added example usage.
# Added validate_assignment and extra='forbid' to Config.
# The embedding field is Optional[List[float]], which is correct. The actual generation of embeddings would be a separate process/service.
# The Pydantic model seems well-defined now.Part 1, Step 1.1 (`knowledge_models.py`) is complete. The `SharedKnowledgeItem` Pydantic model has been created.

**Step 1.2: Modify `python-ai-services/models/__init__.py`**
I need to add `from .knowledge_models import SharedKnowledgeItem` and update `__all__`.
