"""
Supabase integration for the MCP Agent.
Provides database functionality using Supabase.
"""

import os
import logging
import uuid
from typing import Optional, Dict, Any, List, Union

# Try to import supabase, but provide a fallback if it's not installed
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = Any  # Type hint for the mock client

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Automatically load environment variables if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv not found, skipping loading .env file")

# Get Supabase configuration from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

class SupabaseManager:
    """
    Integration with Supabase for database operations.
    Provides methods to interact with Supabase tables.
    """

    def __init__(self):
        """Initialize the Supabase manager."""
        self.enabled = self._check_supabase_configured()
        
        if not SUPABASE_AVAILABLE:
            logger.warning("Supabase module not found. Using in-memory storage.")
            self.client = None
            self.enabled = False
            return
            
        if not self.enabled:
            logger.warning("Supabase not configured. Using in-memory storage.")
            self.client = None
            return
            
        try:
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self.client = None
            self.enabled = False

    def _check_supabase_configured(self) -> bool:
        """Check if Supabase is configured in the environment."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            return False
        return True

    async def initialize_tables(self) -> bool:
        """
        Initialize the database tables if they don't exist.
        
        Note: This is a no-op for Supabase as tables should be created through 
        the Supabase dashboard or migrations. This method is kept for compatibility.
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled:
            logger.info("Supabase not enabled, skipping table initialization")
            return False
            
        logger.info("Supabase tables should be created through migrations or the dashboard")
        return True

    async def create_record(self, table: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new record in the specified table.
        
        Args:
            table: The name of the table
            data: The data to insert
            
        Returns:
            Optional[Dict[str, Any]]: The created record or None if failed
        """
        if not self.enabled or not self.client:
            logger.warning(f"Supabase not enabled, skipping create in table {table}")
            return None
            
        try:
            response = self.client.table(table).insert(data).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error creating record in {table}: {e}")
            return None

    async def get_record(self, table: str, id: str) -> Optional[Dict[str, Any]]:
        """
        Get a record by ID from the specified table.
        
        Args:
            table: The name of the table
            id: The ID of the record
            
        Returns:
            Optional[Dict[str, Any]]: The record or None if not found
        """
        if not self.enabled or not self.client:
            logger.warning(f"Supabase not enabled, skipping get from table {table}")
            return None
            
        try:
            response = self.client.table(table).select("*").eq("id", id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting record from {table}: {e}")
            return None

    async def update_record(self, table: str, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update a record in the specified table.
        
        Args:
            table: The name of the table
            id: The ID of the record
            data: The data to update
            
        Returns:
            Optional[Dict[str, Any]]: The updated record or None if failed
        """
        if not self.enabled or not self.client:
            logger.warning(f"Supabase not enabled, skipping update in table {table}")
            return None
            
        try:
            response = self.client.table(table).update(data).eq("id", id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error updating record in {table}: {e}")
            return None

    async def delete_record(self, table: str, id: str) -> bool:
        """
        Delete a record from the specified table.
        
        Args:
            table: The name of the table
            id: The ID of the record
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            logger.warning(f"Supabase not enabled, skipping delete from table {table}")
            return False
            
        try:
            response = self.client.table(table).delete().eq("id", id).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error deleting record from {table}: {e}")
            return False

    async def query(self, table: str, query_fn) -> List[Dict[str, Any]]:
        """
        Execute a custom query on the specified table.
        
        Args:
            table: The name of the table
            query_fn: A function that takes a QueryBuilder and returns a modified QueryBuilder
            
        Returns:
            List[Dict[str, Any]]: The query results
        """
        if not self.enabled or not self.client:
            logger.warning(f"Supabase not enabled, skipping query on table {table}")
            return []
            
        try:
            query = self.client.table(table).select("*")
            query = query_fn(query)
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error querying table {table}: {e}")
            return []

    async def raw_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Execute a raw SQL query.
        
        Args:
            query: The SQL query
            params: Query parameters
            
        Returns:
            List[Dict[str, Any]]: The query results
        """
        if not self.enabled or not self.client:
            logger.warning("Supabase not enabled, skipping raw query")
            return []
            
        try:
            response = self.client.rpc(query, params or {}).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error executing raw query: {e}")
            return []
