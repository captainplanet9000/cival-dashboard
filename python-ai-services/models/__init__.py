# This file makes the 'models' directory a Python package.

# Export models from base_models.py (if it exists and is used)
# This assumes base_models.py is in the same directory (models/)
try:
    from .base_models import MarketData, TradeSignal
    __all__ = ['MarketData', 'TradeSignal'] # Start __all__ list
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
