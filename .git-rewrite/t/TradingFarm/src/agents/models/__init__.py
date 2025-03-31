"""
Model adapters for ElizaOS integration
"""

from .gemma_adapter import Gemma3Adapter
from .model_manager import ModelManager

__all__ = ['Gemma3Adapter', 'ModelManager']
