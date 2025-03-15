"""
Agent Performance Metrics Module

Tracks and analyzes the performance of trading agents, with specific support
for ElizaOS integration, multi-agent coordination, and continuous improvement.
"""

from .performance_analytics import (
    AgentPerformanceTracker, 
    StrategyAttributionAnalysis, 
    PerformanceMetrics
)
from .elizaos_integration import (
    ElizaOSConnector, 
    AgentMemoryManager, 
    ModelPerformanceAnalyzer
)
from .multi_agent_coordination import (
    AgentCoordinator, 
    AgentRoleManager, 
    CollaborationMetrics
)
from .improvement_framework import (
    ContinuousLearningSystem, 
    OptimizationEngine, 
    ParameterTuning
)

__version__ = '0.1.0'

__all__ = [
    # Performance Analytics
    'AgentPerformanceTracker',
    'StrategyAttributionAnalysis',
    'PerformanceMetrics',
    
    # ElizaOS Integration
    'ElizaOSConnector',
    'AgentMemoryManager',
    'ModelPerformanceAnalyzer',
    
    # Multi-Agent Coordination
    'AgentCoordinator',
    'AgentRoleManager',
    'CollaborationMetrics',
    
    # Improvement Framework
    'ContinuousLearningSystem',
    'OptimizationEngine',
    'ParameterTuning'
]
