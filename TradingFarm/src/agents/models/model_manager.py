"""
AI Model Manager for ElizaOS integration
Manages AI model instances and interactions
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Union

from ..eliza_protocol import MessageType
from .gemma_adapter import Gemma3Adapter
from ...config.config import (
    GEMMA_API_KEY,
    GEMMA_MODEL_VERSION,
    GEMMA_TEMPERATURE,
    GEMMA_MAX_TOKENS,
    GEMMA_TOP_P
)

logger = logging.getLogger(__name__)

class ModelManager:
    """
    Manages AI model instances and interactions.
    
    Provides a unified interface for different AI models and handles:
    1. Model initialization and configuration
    2. Message generation and processing
    3. Model switching and fallback
    """
    
    def __init__(self):
        """Initialize the model manager with supported models."""
        self.models = {}
        self.default_model = "gemma"
        self.initialized = False
        
        # Model statistics
        self.model_stats = {
            "requests": 0,
            "errors": 0,
            "tokens": 0,
            "last_request_time": 0
        }
    
    async def initialize(self):
        """Initialize model instances."""
        if self.initialized:
            logger.warning("Model manager already initialized")
            return
        
        try:
            # Initialize Gemma 3 model
            gemma_model = Gemma3Adapter(
                api_key=GEMMA_API_KEY,
                model_version=GEMMA_MODEL_VERSION,
                temperature=GEMMA_TEMPERATURE,
                max_tokens=GEMMA_MAX_TOKENS,
                top_p=GEMMA_TOP_P
            )
            
            self.models["gemma"] = gemma_model
            logger.info(f"Initialized Gemma 3 model (version: {GEMMA_MODEL_VERSION})")
            
            self.initialized = True
            logger.info("Model manager initialization complete")
        
        except Exception as e:
            logger.error(f"Error initializing models: {str(e)}")
            raise
    
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        functions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate text using the specified or default model.
        
        Args:
            prompt: User prompt for generation
            system_prompt: System prompt for context
            model_name: Name of the model to use (defaults to default_model)
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            functions: Function descriptions for function calling capability
            
        Returns:
            Generation result
        """
        if not self.initialized:
            await self.initialize()
        
        model_name = model_name or self.default_model
        
        if model_name not in self.models:
            logger.error(f"Model {model_name} not found")
            return {
                "error": True,
                "message": f"Model {model_name} not found"
            }
        
        model = self.models[model_name]
        
        # Update statistics
        self.model_stats["requests"] += 1
        self.model_stats["last_request_time"] = time.time()
        
        try:
            # Generate text
            result = await model.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                functions=functions
            )
            
            # Update token usage statistics
            if "usage" in result and "total_tokens" in result["usage"]:
                self.model_stats["tokens"] += result["usage"]["total_tokens"]
            
            return result
        
        except Exception as e:
            # Update error statistics
            self.model_stats["errors"] += 1
            
            logger.error(f"Error generating text with {model_name}: {str(e)}")
            return {
                "error": True,
                "message": str(e)
            }
    
    async def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model_name: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        functions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a chat completion using the specified or default model.
        
        Args:
            messages: List of message objects with role and content
            model_name: Name of the model to use (defaults to default_model)
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            functions: Function descriptions for function calling capability
            
        Returns:
            Generation result
        """
        if not self.initialized:
            await self.initialize()
        
        model_name = model_name or self.default_model
        
        if model_name not in self.models:
            logger.error(f"Model {model_name} not found")
            return {
                "error": True,
                "message": f"Model {model_name} not found"
            }
        
        model = self.models[model_name]
        
        # Update statistics
        self.model_stats["requests"] += 1
        self.model_stats["last_request_time"] = time.time()
        
        try:
            # Generate chat completion
            result = await model.generate_chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                functions=functions
            )
            
            # Update token usage statistics
            if "usage" in result and "total_tokens" in result["usage"]:
                self.model_stats["tokens"] += result["usage"]["total_tokens"]
            
            return result
        
        except Exception as e:
            # Update error statistics
            self.model_stats["errors"] += 1
            
            logger.error(f"Error generating chat completion with {model_name}: {str(e)}")
            return {
                "error": True,
                "message": str(e)
            }
    
    def set_default_model(self, model_name: str) -> bool:
        """
        Set the default model.
        
        Args:
            model_name: Name of the model to set as default
            
        Returns:
            True if successful, False otherwise
        """
        if model_name not in self.models:
            logger.error(f"Cannot set default model: {model_name} not found")
            return False
        
        self.default_model = model_name
        logger.info(f"Set default model to {model_name}")
        return True
    
    def get_model_stats(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get statistics for a specific model or all models.
        
        Args:
            model_name: Name of the model to get statistics for
            
        Returns:
            Model statistics
        """
        if model_name is not None:
            if model_name not in self.models:
                logger.error(f"Model {model_name} not found")
                return {
                    "error": True,
                    "message": f"Model {model_name} not found"
                }
            
            return self.models[model_name].get_stats()
        
        # Return overall stats
        return {
            "default_model": self.default_model,
            "models": {name: model.get_stats() for name, model in self.models.items()},
            "overall": self.model_stats
        }
    
    def update_model_config(
        self,
        model_name: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_version: Optional[str] = None
    ) -> bool:
        """
        Update configuration for a specific model.
        
        Args:
            model_name: Name of the model to update
            temperature: New temperature value
            max_tokens: New max tokens value
            model_version: New model version
            
        Returns:
            True if successful, False otherwise
        """
        if model_name not in self.models:
            logger.error(f"Model {model_name} not found")
            return False
        
        model = self.models[model_name]
        
        try:
            model.update_config(
                temperature=temperature,
                max_tokens=max_tokens,
                model_version=model_version
            )
            
            logger.info(f"Updated configuration for model {model_name}")
            return True
        
        except Exception as e:
            logger.error(f"Error updating model configuration: {str(e)}")
            return False
