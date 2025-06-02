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

# Export models from watchlist_models.py
try:
    from .watchlist_models import (
        WatchlistItemBase, WatchlistItemCreate, WatchlistItem,
        WatchlistBase, WatchlistCreate, Watchlist, WatchlistWithItems,
        AddWatchlistItemsRequest,
        BatchQuotesRequest, BatchQuotesResponseItem, BatchQuotesResponse
    )
    new_watchlist_exports = [
        "WatchlistItemBase", "WatchlistItemCreate", "WatchlistItem",
        "WatchlistBase", "WatchlistCreate", "Watchlist", "WatchlistWithItems",
        "AddWatchlistItemsRequest",
        "BatchQuotesRequest", "BatchQuotesResponseItem", "BatchQuotesResponse"
    ]
    if '__all__' in globals():
        __all__.extend(new_watchlist_exports)
    else:
        __all__ = new_watchlist_exports
except ImportError:
    pass

# Export models from strategy_models.py
try:
    from .strategy_models import (
        StrategyTimeframe, BaseStrategyConfig,
        DarvasBoxParams, WilliamsAlligatorParams, RenkoParams, HeikinAshiParams, ElliottWaveParams,
        StrategySpecificParams, StrategyConfig,
        TradeStats, PerformanceMetrics,
        Goal, StrategyGoalAlignment, StrategyPerformanceTeaser
    )
    strategy_model_exports = [
        "StrategyTimeframe", "BaseStrategyConfig",
        "DarvasBoxParams", "WilliamsAlligatorParams", "RenkoParams", "HeikinAshiParams", "ElliottWaveParams",
        "StrategySpecificParams", "StrategyConfig",
        "TradeStats", "PerformanceMetrics",
        "Goal", "StrategyGoalAlignment", "StrategyPerformanceTeaser"
    ]
    if '__all__' in globals():
        __all__.extend(strategy_model_exports)
    else:
        __all__ = strategy_model_exports
except ImportError:
    pass

# Export models from visualization_models.py
try:
    from .visualization_models import StrategyVisualizationRequest, StrategyVisualizationDataResponse, OHLCVBar, IndicatorDataPoint, SignalDataPoint
    new_visualization_exports = ["StrategyVisualizationRequest", "StrategyVisualizationDataResponse", "OHLCVBar", "IndicatorDataPoint", "SignalDataPoint"]
    if '__all__' in globals():
        __all__.extend(new_visualization_exports)
    else:
        __all__ = new_visualization_exports
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

# Export models from paper_trading_models.py
try:
    from .paper_trading_models import PaperTradeOrder, PaperTradeFill, PaperPosition, CreatePaperTradeOrderRequest
    # Note: TradeSide, PaperOrderType, PaperOrderStatus are typically not re-exported
    # if they are just aliases of types already exported from trading_history_models.py
    # If they were unique types, they would be added here.
    paper_trading_exports = ["PaperTradeOrder", "PaperTradeFill", "PaperPosition", "CreatePaperTradeOrderRequest"]
    if '__all__' in globals():
        __all__.extend(paper_trading_exports)
    else:
        __all__ = paper_trading_exports
except ImportError:
    pass

# Export models from event_models.py
try:
    from .event_models import BaseEvent, AgentCallbackEvent, AgentTaskExecutionEvent, AgentLogEvent, CrewLifecycleEvent, AlertEvent, AlertLevel
    # Note: Only add new, unique model types to __all__. BaseEvent might be internal.
    # Assuming specific event types are what users of the package will import.
    new_event_exports = ["AgentCallbackEvent", "AgentTaskExecutionEvent", "AgentLogEvent", "CrewLifecycleEvent", "AlertEvent", "AlertLevel"]
    # Also BaseEvent if it's meant to be subclassed externally by users of the package
    # new_event_exports.append("BaseEvent")
    if '__all__' in globals():
        __all__.extend(new_event_exports)
    else:
        __all__ = new_event_exports
except ImportError:
    # This might happen if event_models.py hasn't been created with all these specific models yet.
    # For this step, we are adding AlertEvent and AlertLevel.
    # A more targeted update if other event models are not yet defined:
    try:
        from .event_models import AlertEvent, AlertLevel
        if '__all__' in globals():
            __all__.extend(["AlertEvent", "AlertLevel"])
        else:
            __all__ = ["AlertEvent", "AlertLevel"]
    except ImportError:
        pass # Final fallback if even AlertEvent/AlertLevel can't be imported (should not happen if file was created)
    pass

# Export models from validation_models.py
try:
    from .validation_models import ValidationReport, ValidationCheckResult, ValidationStatus
    new_validation_exports = ["ValidationReport", "ValidationCheckResult", "ValidationStatus"]
    if '__all__' in globals():
        __all__.extend(new_validation_exports)
    else:
        __all__ = new_validation_exports
except ImportError:
    pass
