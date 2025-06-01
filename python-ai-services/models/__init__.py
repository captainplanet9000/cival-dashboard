# This file makes the 'models' directory a Python package.

# Export models from base_models.py (if it exists and is used)
# This assumes base_models.py is in the same directory (models/)
try:
    from .base_models import MarketData, TradeSignal, ProposedTradeSignal # Added ProposedTradeSignal
    __all__ = ['MarketData', 'TradeSignal', 'ProposedTradeSignal'] # Added ProposedTradeSignal
except ImportError:
    # Handle case where base_models might not exist or has issues
    # Or if it's not intended to be part of the public API of this package
    __all__ = [] 
    pass

# Export models from agent_task_models.py
try:
    from .agent_task_models import AgentTask, AgentTaskStatus
    # Append to __all__ if it was initialized
    if '__all__' in globals():
        __all__.extend(['AgentTask', 'AgentTaskStatus'])
    else: # If base_models import failed and __all__ wasn't created
        __all__ = ['AgentTask', 'AgentTaskStatus']
except ImportError:
    # Handle case where agent_task_models might not exist (should not happen here)
    pass

# Export models from api_models.py
try:
    from .api_models import CrewRunRequest, CrewRunResponse
    if '__all__' in globals():
        __all__.extend(['CrewRunRequest', 'CrewRunResponse'])
    else:
        __all__ = ['CrewRunRequest', 'CrewRunResponse']
except ImportError:
    pass

# Export models from agent_config_models.py
try:
    from .agent_config_models import CrewAgentConfig
    if '__all__' in globals():
        __all__.append('CrewAgentConfig') # Use append for single item
    else:
        __all__ = ['CrewAgentConfig']
except ImportError:
    pass

# Export models from crew_models.py
try:
    from .crew_models import CrewBlueprint
    if '__all__' in globals():
        __all__.append('CrewBlueprint')
    else:
        __all__ = ['CrewBlueprint']
except ImportError:
    pass

# Export models from knowledge_models.py
try:
    from .knowledge_models import SharedKnowledgeItem
    if '__all__' in globals():
        __all__.append('SharedKnowledgeItem')
    else:
        __all__ = ['SharedKnowledgeItem']
except ImportError:
    pass

# Export models from monitoring_models.py
try:
    from .monitoring_models import AgentTaskSummary, TaskListResponse, DependencyStatus, SystemHealthSummary
    if '__all__' in globals():
        __all__.extend(["AgentTaskSummary", "TaskListResponse", "DependencyStatus", "SystemHealthSummary"])
    else:
        __all__ = ["AgentTaskSummary", "TaskListResponse", "DependencyStatus", "SystemHealthSummary"]
except ImportError:
    pass

# Export models from trading_history_models.py
try:
    from .trading_history_models import TradeRecord, TradeSide, OrderStatus, OrderType
    if '__all__' in globals():
        __all__.extend(["TradeRecord", "TradeSide", "OrderStatus", "OrderType"])
    else:
        __all__ = ["TradeRecord", "TradeSide", "OrderStatus", "OrderType"]
except ImportError:
    pass

# Export models from context_models.py
try:
    from .context_models import RunContext
    if '__all__' in globals():
        __all__.append("RunContext") # Use append for single item
    else:
        __all__ = ["RunContext"]
except ImportError:
    pass
