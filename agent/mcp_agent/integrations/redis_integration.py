"""
Redis integration for the MCP Agent.
Provides caching, session management, and pub/sub capabilities.
"""

import os
import json
import logging
import time
import hashlib
from typing import Any, Dict, List, Optional, Union
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import redis, but provide a fallback if it's not installed
try:
    import redis
    from redis.exceptions import RedisError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis module not found. Redis features will be unavailable.")

class RedisManager:
    """
    Redis integration for caching, session management, and pub/sub.
    Provides methods for caching, LLM response caching, pub/sub, and rate limiting.
    """

    def __init__(self,
                 redis_url: Optional[str] = None,
                 prefix: str = "kb-multi-agent:",
                 default_ttl: int = 3600):
        """
        Initialize Redis connection.

        Args:
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
            prefix: Key prefix for namespacing
            default_ttl: Default TTL for cached items in seconds
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.prefix = prefix
        self.default_ttl = default_ttl
        self._client = None
        self._pubsub = None
        self.enabled = REDIS_AVAILABLE

        if not self.enabled:
            logger.warning("Redis integration is disabled because the redis package is not installed.")
            return

        # Try to connect to Redis
        try:
            # Test connection
            _ = self.client.ping()
            logger.info(f"Connected to Redis at {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.enabled = False

    @property
    def client(self):
        """Lazy-loaded Redis client."""
        if not REDIS_AVAILABLE:
            logger.error("Redis client requested but redis package is not installed")
            return None

        if self._client is None:
            try:
                self._client = redis.from_url(self.redis_url)
            except RedisError as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.enabled = False
                return None
        return self._client

    def get_key(self, key: str) -> str:
        """Get prefixed key."""
        return f"{self.prefix}{key}"

    # Caching methods
    def cache_set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set a value in the cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time-to-live in seconds (defaults to self.default_ttl)

        Returns:
            bool: Success status
        """
        if not self.enabled or not self.client:
            logger.debug(f"Redis disabled, skipping cache_set for {key}")
            return False

        try:
            serialized = json.dumps(value)
            return bool(self.client.setex(
                self.get_key(key),
                ttl or self.default_ttl,
                serialized
            ))
        except (RedisError, TypeError) as e:
            logger.warning(f"Failed to cache {key}: {e}")
            return False

    def cache_get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.

        Args:
            key: Cache key

        Returns:
            Any: Cached value or None if not found
        """
        if not self.enabled or not self.client:
            logger.debug(f"Redis disabled, skipping cache_get for {key}")
            return None

        try:
            value = self.client.get(self.get_key(key))
            if value:
                return json.loads(value)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to retrieve {key} from cache: {e}")
            return None

    def cache_delete(self, key: str) -> bool:
        """
        Delete a value from the cache.

        Args:
            key: Cache key

        Returns:
            bool: Success status
        """
        if not self.enabled or not self.client:
            logger.debug(f"Redis disabled, skipping cache_delete for {key}")
            return False

        try:
            return bool(self.client.delete(self.get_key(key)))
        except RedisError as e:
            logger.warning(f"Failed to delete {key} from cache: {e}")
            return False

    # LLM response caching
    def cache_llm_response(self, prompt: str, response: str, model: str, temperature: float = 0.7) -> bool:
        """
        Cache an LLM response.

        Args:
            prompt: The prompt sent to the LLM
            response: The response from the LLM
            model: The model used
            temperature: The temperature setting used for generation

        Returns:
            bool: Success status
        """
        if not self.enabled:
            return False

        # Create a more robust deterministic key from the prompt, model, and temperature
        # Use a dictionary to ensure consistent ordering of parameters
        key_data = {
            "prompt": prompt,
            "model": model,
            "temperature": str(temperature)
        }

        # Convert to a sorted JSON string to ensure consistent ordering
        key_string = json.dumps(key_data, sort_keys=True)

        # Create a hash of the key string
        key = f"llm:{hashlib.md5(key_string.encode()).hexdigest()}"

        return self.cache_set(key, {
            "prompt": prompt,
            "response": response,
            "model": model,
            "temperature": temperature,
            "timestamp": time.time()
        }, ttl=86400)  # Cache for 24 hours

    def get_cached_llm_response(self, prompt: str, model: str, temperature: float = 0.7) -> Optional[str]:
        """
        Get a cached LLM response.

        Args:
            prompt: The prompt sent to the LLM
            model: The model used
            temperature: The temperature setting used for generation

        Returns:
            str: Cached response or None if not found
        """
        if not self.enabled:
            return None

        # Create a more robust deterministic key from the prompt, model, and temperature
        # Use a dictionary to ensure consistent ordering of parameters
        key_data = {
            "prompt": prompt,
            "model": model,
            "temperature": str(temperature)
        }

        # Convert to a sorted JSON string to ensure consistent ordering
        key_string = json.dumps(key_data, sort_keys=True)

        # Create a hash of the key string
        key = f"llm:{hashlib.md5(key_string.encode()).hexdigest()}"

        cached = self.cache_get(key)
        if cached:
            return cached.get("response")
        return None

    # Pub/Sub methods for real-time updates
    def publish(self, channel: str, message: Any) -> int:
        """
        Publish a message to a channel.

        Args:
            channel: Channel name
            message: Message to publish (will be JSON serialized)

        Returns:
            int: Number of clients that received the message
        """
        if not self.enabled or not self.client:
            logger.debug(f"Redis disabled, skipping publish to {channel}")
            return 0

        try:
            serialized = json.dumps(message)
            return self.client.publish(self.get_key(channel), serialized)
        except (RedisError, TypeError) as e:
            logger.warning(f"Failed to publish to {channel}: {e}")
            return 0

    def subscribe(self, channels: List[str]):
        """
        Subscribe to channels.

        Args:
            channels: List of channel names
        """
        if not self.enabled or not self.client:
            logger.debug(f"Redis disabled, skipping subscribe to {channels}")
            return

        if self._pubsub is None:
            self._pubsub = self.client.pubsub()

        prefixed_channels = [self.get_key(channel) for channel in channels]
        self._pubsub.subscribe(*prefixed_channels)

    def get_message(self, timeout: float = 0.01) -> Optional[Dict[str, Any]]:
        """
        Get a message from subscribed channels.

        Args:
            timeout: Time to wait for a message

        Returns:
            dict: Message or None if no message
        """
        if not self.enabled or not self._pubsub:
            return None

        message = self._pubsub.get_message(timeout=timeout)
        if message and message["type"] == "message":
            try:
                return {
                    "channel": message["channel"].decode().replace(self.prefix, ""),
                    "data": json.loads(message["data"].decode())
                }
            except (UnicodeDecodeError, json.JSONDecodeError) as e:
                logger.warning(f"Failed to decode message: {e}")

        return None

    # Rate limiting
    def rate_limit(self, key: str, limit: int, period: int) -> bool:
        """
        Check if a rate limit has been exceeded.

        Args:
            key: Rate limit key
            limit: Maximum number of requests
            period: Time period in seconds

        Returns:
            bool: True if rate limit not exceeded, False otherwise
        """
        if not self.enabled or not self.client:
            # If Redis is disabled, don't rate limit
            return True

        redis_key = self.get_key(f"ratelimit:{key}")

        # Get current count
        count = self.client.get(redis_key)
        count = int(count) if count else 0

        if count >= limit:
            return False

        # Increment count and set expiry if it doesn't exist
        pipe = self.client.pipeline()
        pipe.incr(redis_key)
        if count == 0:
            pipe.expire(redis_key, period)
        pipe.execute()

        return True

    # Session management
    def create_session(self, session_id: str, data: Dict[str, Any], ttl: int = 3600) -> bool:
        """
        Create a new session.

        Args:
            session_id: Session ID
            data: Session data
            ttl: Session TTL in seconds

        Returns:
            bool: Success status
        """
        return self.cache_set(f"session:{session_id}", data, ttl)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data.

        Args:
            session_id: Session ID

        Returns:
            dict: Session data or None if not found
        """
        return self.cache_get(f"session:{session_id}")

    def update_session(self, session_id: str, data: Dict[str, Any], ttl: int = 3600) -> bool:
        """
        Update session data.

        Args:
            session_id: Session ID
            data: New session data
            ttl: Session TTL in seconds

        Returns:
            bool: Success status
        """
        return self.cache_set(f"session:{session_id}", data, ttl)

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.

        Args:
            session_id: Session ID

        Returns:
            bool: Success status
        """
        return self.cache_delete(f"session:{session_id}")

    # Memory caching for agent memory
    def cache_memory(self, user_id: str, memory_data: List[Dict[str, Any]]) -> bool:
        """
        Cache agent memory data.

        Args:
            user_id: User ID
            memory_data: Memory data to cache

        Returns:
            bool: Success status
        """
        return self.cache_set(f"memory:{user_id}", memory_data, ttl=86400 * 7)  # Cache for 7 days

    def get_cached_memory(self, user_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached agent memory data.

        Args:
            user_id: User ID

        Returns:
            list: Memory data or None if not found
        """
        return self.cache_get(f"memory:{user_id}")
