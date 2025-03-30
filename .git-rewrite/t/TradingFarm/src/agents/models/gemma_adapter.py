"""
Gemma 3 AI Model Adapter for ElizaOS
Provides integration with Google's Gemma 3 AI model
"""

import os
import json
import logging
import time
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Union, Callable

logger = logging.getLogger(__name__)

class Gemma3Adapter:
    """
    Adapter for Google's Gemma 3 AI model.
    Handles API communication and response processing.
    """
    
    def __init__(
        self, 
        api_key: str = None,
        model_version: str = "gemma-3-8b",
        temperature: float = 0.7,
        max_tokens: int = 1024,
        top_p: float = 0.95,
        timeout: int = 30,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    ):
        """
        Initialize the Gemma 3 adapter.
        
        Args:
            api_key: Gemma API key (defaults to environment variable GEMMA_API_KEY)
            model_version: Gemma model version to use
            temperature: Model temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            timeout: API request timeout in seconds
            base_url: Base URL for the API
        """
        self.api_key = api_key or os.environ.get("GEMMA_API_KEY")
        if not self.api_key:
            raise ValueError("Gemma API key is required")
        
        self.model_version = model_version
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.timeout = timeout
        self.base_url = base_url
        
        # Statistics for monitoring
        self.request_count = 0
        self.token_count = 0
        self.error_count = 0
        self.last_request_time = 0
        
        logger.info(f"Initialized Gemma 3 adapter with model version {model_version}")
    
    async def generate_text(
        self, 
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        functions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate text using the Gemma 3 model.
        
        Args:
            prompt: User prompt for generation
            system_prompt: System prompt for context
            temperature: Generation temperature (overrides instance setting)
            max_tokens: Maximum tokens to generate (overrides instance setting)
            top_p: Top-p sampling parameter (overrides instance setting)
            functions: Function descriptions for function calling capability
            
        Returns:
            Generation result
        """
        url = f"{self.base_url}/models/{self.model_version}:generateContent"
        
        # Prepare request parameters
        params = {
            "key": self.api_key
        }
        
        # Prepare request payload
        payload = {
            "contents": []
        }
        
        # Add system prompt if provided
        if system_prompt:
            payload["contents"].append({
                "role": "system",
                "parts": [{"text": system_prompt}]
            })
        
        # Add user prompt
        payload["contents"].append({
            "role": "user",
            "parts": [{"text": prompt}]
        })
        
        # Add generation parameters
        payload["generationConfig"] = {
            "temperature": temperature if temperature is not None else self.temperature,
            "maxOutputTokens": max_tokens if max_tokens is not None else self.max_tokens,
            "topP": top_p if top_p is not None else self.top_p
        }
        
        # Add function calling if provided
        if functions:
            payload["tools"] = [
                {
                    "functionDeclarations": functions
                }
            ]
        
        # Make the API request
        start_time = time.time()
        self.last_request_time = start_time
        self.request_count += 1
        
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, params=params, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        self.error_count += 1
                        logger.error(f"Gemma API error: {response.status} - {error_text}")
                        return {
                            "error": True,
                            "status_code": response.status,
                            "message": error_text
                        }
                    
                    result = await response.json()
                    
                    # Extract generated text
                    generated_text = ""
                    function_call = None
                    
                    if "candidates" in result and result["candidates"]:
                        candidate = result["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            for part in candidate["content"]["parts"]:
                                if "text" in part:
                                    generated_text += part["text"]
                                elif "functionCall" in part:
                                    function_call = part["functionCall"]
                    
                    # Extract token usage
                    usage = {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0
                    }
                    
                    if "usageMetadata" in result:
                        metadata = result["usageMetadata"]
                        if "promptTokenCount" in metadata:
                            usage["prompt_tokens"] = metadata["promptTokenCount"]
                        if "candidatesTokenCount" in metadata:
                            usage["completion_tokens"] = metadata["candidatesTokenCount"]
                        usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]
                    
                    # Update token count
                    self.token_count += usage["total_tokens"]
                    
                    return {
                        "text": generated_text,
                        "function_call": function_call,
                        "raw_response": result,
                        "usage": usage,
                        "model": self.model_version,
                        "elapsed_time": time.time() - start_time
                    }
        
        except asyncio.TimeoutError:
            self.error_count += 1
            logger.error(f"Gemma API request timed out after {self.timeout} seconds")
            return {
                "error": True,
                "message": f"Request timed out after {self.timeout} seconds"
            }
        
        except Exception as e:
            self.error_count += 1
            logger.error(f"Error in Gemma API request: {str(e)}")
            return {
                "error": True,
                "message": str(e)
            }
    
    async def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        functions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a chat completion using the Gemma 3 model.
        
        Args:
            messages: List of message objects with role and content
            temperature: Generation temperature (overrides instance setting)
            max_tokens: Maximum tokens to generate (overrides instance setting)
            top_p: Top-p sampling parameter (overrides instance setting)
            functions: Function descriptions for function calling capability
            
        Returns:
            Generation result
        """
        url = f"{self.base_url}/models/{self.model_version}:generateContent"
        
        # Prepare request parameters
        params = {
            "key": self.api_key
        }
        
        # Convert messages to Gemma format
        contents = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            contents.append({
                "role": role,
                "parts": [{"text": content}]
            })
        
        # Prepare request payload
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature if temperature is not None else self.temperature,
                "maxOutputTokens": max_tokens if max_tokens is not None else self.max_tokens,
                "topP": top_p if top_p is not None else self.top_p
            }
        }
        
        # Add function calling if provided
        if functions:
            payload["tools"] = [
                {
                    "functionDeclarations": functions
                }
            ]
        
        # Make the API request
        start_time = time.time()
        self.last_request_time = start_time
        self.request_count += 1
        
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, params=params, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        self.error_count += 1
                        logger.error(f"Gemma API error: {response.status} - {error_text}")
                        return {
                            "error": True,
                            "status_code": response.status,
                            "message": error_text
                        }
                    
                    result = await response.json()
                    
                    # Extract generated text
                    generated_text = ""
                    function_call = None
                    
                    if "candidates" in result and result["candidates"]:
                        candidate = result["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            for part in candidate["content"]["parts"]:
                                if "text" in part:
                                    generated_text += part["text"]
                                elif "functionCall" in part:
                                    function_call = part["functionCall"]
                    
                    # Extract token usage
                    usage = {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0
                    }
                    
                    if "usageMetadata" in result:
                        metadata = result["usageMetadata"]
                        if "promptTokenCount" in metadata:
                            usage["prompt_tokens"] = metadata["promptTokenCount"]
                        if "candidatesTokenCount" in metadata:
                            usage["completion_tokens"] = metadata["candidatesTokenCount"]
                        usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]
                    
                    # Update token count
                    self.token_count += usage["total_tokens"]
                    
                    return {
                        "text": generated_text,
                        "function_call": function_call,
                        "raw_response": result,
                        "usage": usage,
                        "model": self.model_version,
                        "elapsed_time": time.time() - start_time
                    }
        
        except Exception as e:
            self.error_count += 1
            logger.error(f"Error in Gemma API request: {str(e)}")
            return {
                "error": True,
                "message": str(e)
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get usage statistics for the model.
        
        Returns:
            Dictionary of usage statistics
        """
        return {
            "model_version": self.model_version,
            "request_count": self.request_count,
            "token_count": self.token_count,
            "error_count": self.error_count,
            "last_request_time": self.last_request_time
        }
    
    def update_config(
        self,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        model_version: Optional[str] = None
    ) -> None:
        """
        Update the model configuration.
        
        Args:
            temperature: New temperature value
            max_tokens: New max tokens value
            top_p: New top-p value
            model_version: New model version
        """
        if temperature is not None:
            self.temperature = temperature
        
        if max_tokens is not None:
            self.max_tokens = max_tokens
        
        if top_p is not None:
            self.top_p = top_p
        
        if model_version is not None:
            self.model_version = model_version
        
        logger.info(f"Updated Gemma 3 adapter configuration: temperature={self.temperature}, max_tokens={self.max_tokens}, top_p={self.top_p}, model_version={self.model_version}")
