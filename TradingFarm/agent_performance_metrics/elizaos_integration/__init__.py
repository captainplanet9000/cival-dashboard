"""
ElizaOS Integration Module

Provides components for integrating ElizaOS autonomous agents with the Trading Farm platform.
Handles communication, memory management, and performance analysis of ElizaOS agents.
"""

from .elizaos_connector import ElizaOSConnector
from .agent_memory_manager import AgentMemoryManager
from .model_performance_analyzer import ModelPerformanceAnalyzer

__all__ = [
    'ElizaOSConnector',
    'AgentMemoryManager',
    'ModelPerformanceAnalyzer'
]
