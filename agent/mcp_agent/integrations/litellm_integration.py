"""
LiteLLM integration for the MCP Agent.
Provides a unified interface to multiple LLM providers.
"""

import os
import logging
from typing import Dict, Any, List, Optional, Union

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import litellm, but provide a fallback if it's not installed
try:
    import litellm
    from litellm import completion
    LITELLM_AVAILABLE = True
except ImportError:
    logger.warning("LiteLLM module not available: No module named 'litellm'")
    LITELLM_AVAILABLE = False
    litellm = None
    completion = None

# Automatically load environment variables if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv not found, skipping loading .env file")

class LiteLLMManager:
    """
    Integration with LiteLLM for unified access to multiple LLM providers.
    Provides methods to interact with various LLM models through a single interface.
    """

    def __init__(self):
        """Initialize the LiteLLM manager."""
        self.enabled = LITELLM_AVAILABLE
        
        if not self.enabled:
            logger.warning("LiteLLM not available. Using direct OpenAI integration.")
            return
            
        # Set up API keys from environment variables
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.cohere_api_key = os.getenv("COHERE_API_KEY", "")
        self.azure_api_key = os.getenv("AZURE_API_KEY", "")
        
        # Configure LiteLLM
        try:
            if self.openai_api_key:
                os.environ["OPENAI_API_KEY"] = self.openai_api_key
            
            if self.anthropic_api_key:
                os.environ["ANTHROPIC_API_KEY"] = self.anthropic_api_key
                
            if self.cohere_api_key:
                os.environ["COHERE_API_KEY"] = self.cohere_api_key
                
            if self.azure_api_key:
                os.environ["AZURE_API_KEY"] = self.azure_api_key
                
            # Set default model if not specified
            self.default_model = os.getenv("DEFAULT_MODEL", "gpt-4o")
            
            logger.info(f"LiteLLM initialized with default model: {self.default_model}")
        except Exception as e:
            logger.error(f"Failed to initialize LiteLLM: {e}")
            self.enabled = False

    async def completion(self, 
                         messages: List[Dict[str, str]], 
                         model: Optional[str] = None,
                         temperature: float = 0.7,
                         max_tokens: int = 1000,
                         **kwargs) -> Dict[str, Any]:
        """
        Generate a completion using LiteLLM.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: The model to use (defaults to self.default_model)
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum number of tokens to generate
            **kwargs: Additional parameters to pass to LiteLLM
            
        Returns:
            Dict[str, Any]: The completion response
        """
        if not self.enabled:
            logger.warning("LiteLLM not enabled, using fallback completion method")
            return await self._fallback_completion(messages, model, temperature, max_tokens, **kwargs)
            
        try:
            model_name = model or self.default_model
            logger.info(f"Generating completion with model: {model_name}")
            
            response = await litellm.acompletion(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            return response
        except Exception as e:
            logger.error(f"Error generating completion with LiteLLM: {e}")
            return await self._fallback_completion(messages, model, temperature, max_tokens, **kwargs)

    async def _fallback_completion(self, 
                                  messages: List[Dict[str, str]], 
                                  model: Optional[str] = None,
                                  temperature: float = 0.7,
                                  max_tokens: int = 1000,
                                  **kwargs) -> Dict[str, Any]:
        """
        Fallback completion method when LiteLLM is not available.
        This method should be overridden by the application to provide a direct
        integration with a specific LLM provider.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: The model to use
            temperature: Sampling temperature
            max_tokens: Maximum number of tokens to generate
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: A mock completion response
        """
        logger.warning("Using fallback completion method - this should be overridden")
        
        # Return a mock response
        return {
            "id": "fallback-completion",
            "object": "chat.completion",
            "created": 0,
            "model": model or "fallback-model",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "LiteLLM is not available. Please install it or configure a direct integration."
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0
            }
        }

    async def embedding(self, 
                       text: Union[str, List[str]], 
                       model: Optional[str] = None,
                       **kwargs) -> Dict[str, Any]:
        """
        Generate embeddings using LiteLLM.
        
        Args:
            text: Text or list of texts to embed
            model: The embedding model to use
            **kwargs: Additional parameters to pass to LiteLLM
            
        Returns:
            Dict[str, Any]: The embedding response
        """
        if not self.enabled:
            logger.warning("LiteLLM not enabled, using fallback embedding method")
            return await self._fallback_embedding(text, model, **kwargs)
            
        try:
            embedding_model = model or "text-embedding-3-small"
            logger.info(f"Generating embeddings with model: {embedding_model}")
            
            response = await litellm.aembedding(
                model=embedding_model,
                input=text,
                **kwargs
            )
            
            return response
        except Exception as e:
            logger.error(f"Error generating embeddings with LiteLLM: {e}")
            return await self._fallback_embedding(text, model, **kwargs)

    async def _fallback_embedding(self, 
                                 text: Union[str, List[str]], 
                                 model: Optional[str] = None,
                                 **kwargs) -> Dict[str, Any]:
        """
        Fallback embedding method when LiteLLM is not available.
        This method should be overridden by the application to provide a direct
        integration with a specific embedding provider.
        
        Args:
            text: Text or list of texts to embed
            model: The embedding model to use
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: A mock embedding response
        """
        logger.warning("Using fallback embedding method - this should be overridden")
        
        # Return a mock response
        return {
            "object": "list",
            "data": [
                {
                    "object": "embedding",
                    "embedding": [0.0] * 1536,  # Mock 1536-dimensional embedding
                    "index": 0
                }
            ],
            "model": model or "fallback-embedding-model",
            "usage": {
                "prompt_tokens": 0,
                "total_tokens": 0
            }
        }
