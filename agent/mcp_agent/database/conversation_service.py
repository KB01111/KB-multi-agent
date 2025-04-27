"""
Conversation service for the MCP Agent.
This module provides functions to interact with the Supabase database for conversation storage.
"""

import os
import json
import logging
import uuid
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase connection parameters
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
CONVERSATIONS_TABLE = os.getenv("SUPABASE_CONVERSATIONS_TABLE", "conversations")
MESSAGES_TABLE = os.getenv("SUPABASE_MESSAGES_TABLE", "messages")

class ConversationService:
    """Service for interacting with conversation data in the Supabase database."""
    
    @staticmethod
    def _get_headers():
        """Get the headers for Supabase API requests."""
        return {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    @staticmethod
    def initialize_tables():
        """Initialize the database with required tables if they don't exist."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Using in-memory storage.")
                return False
            
            # Create conversations table if it doesn't exist
            sql = f"""
            CREATE TABLE IF NOT EXISTS {CONVERSATIONS_TABLE} (
                id TEXT PRIMARY KEY,
                title TEXT,
                agent_id TEXT,
                team_id TEXT,
                metadata JSONB DEFAULT '{{}}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            # Create messages table if it doesn't exist
            sql += f"""
            CREATE TABLE IF NOT EXISTS {MESSAGES_TABLE} (
                id TEXT PRIMARY KEY,
                conversation_id TEXT REFERENCES {CONVERSATIONS_TABLE}(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT,
                content_type TEXT DEFAULT 'text',
                metadata JSONB DEFAULT '{{}}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            # Execute SQL
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/execute_sql",
                headers=ConversationService._get_headers(),
                json={"query": sql}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error initializing tables: {response.text}")
                return False
            
            logger.info("Successfully initialized conversation and message tables")
            return True
        except Exception as e:
            logger.error(f"Error initializing tables: {e}")
            return False
    
    @staticmethod
    def get_all_conversations() -> List[Dict[str, Any]]:
        """Get all conversations."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get conversations.")
                return []
            
            # Get all conversations
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{CONVERSATIONS_TABLE}",
                headers=ConversationService._get_headers(),
                params={"order": "created_at.desc"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting conversations: {response.text}")
                return []
            
            # Parse response
            conversations = response.json()
            
            # Convert metadata from JSON string to Python object if needed
            for conversation in conversations:
                if isinstance(conversation.get("metadata"), str):
                    try:
                        conversation["metadata"] = json.loads(conversation["metadata"])
                    except json.JSONDecodeError:
                        conversation["metadata"] = {}
            
            return conversations
        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
            return []
    
    @staticmethod
    def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get conversation.")
                return None
            
            # Get conversation
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{CONVERSATIONS_TABLE}",
                headers=ConversationService._get_headers(),
                params={"id": f"eq.{conversation_id}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting conversation: {response.text}")
                return None
            
            # Parse response
            conversations = response.json()
            
            if not conversations:
                return None
            
            conversation = conversations[0]
            
            # Convert metadata from JSON string to Python object if needed
            if isinstance(conversation.get("metadata"), str):
                try:
                    conversation["metadata"] = json.loads(conversation["metadata"])
                except json.JSONDecodeError:
                    conversation["metadata"] = {}
            
            return conversation
        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            return None
    
    @staticmethod
    def create_conversation(conversation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new conversation."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot create conversation.")
                return None
            
            # Prepare conversation data
            conversation_data = {
                "id": conversation.get("id") or str(uuid.uuid4()),
                "title": conversation.get("title", "New Conversation"),
                "agent_id": conversation.get("agent_id"),
                "team_id": conversation.get("team_id"),
                "metadata": json.dumps(conversation.get("metadata", {}))
            }
            
            # Create conversation
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/{CONVERSATIONS_TABLE}",
                headers=ConversationService._get_headers(),
                json=conversation_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error creating conversation: {response.text}")
                return None
            
            # Parse response
            created_conversation = response.json()[0]
            
            # Convert metadata from JSON string to Python object if needed
            if isinstance(created_conversation.get("metadata"), str):
                try:
                    created_conversation["metadata"] = json.loads(created_conversation["metadata"])
                except json.JSONDecodeError:
                    created_conversation["metadata"] = {}
            
            return created_conversation
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            return None
    
    @staticmethod
    def update_conversation(conversation_id: str, conversation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing conversation."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot update conversation.")
                return None
            
            # Prepare conversation data
            conversation_data = {
                "title": conversation.get("title"),
                "metadata": json.dumps(conversation.get("metadata", {})),
                "updated_at": "now()"
            }
            
            # Update conversation
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/{CONVERSATIONS_TABLE}",
                headers=ConversationService._get_headers(),
                params={"id": f"eq.{conversation_id}"},
                json=conversation_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error updating conversation: {response.text}")
                return None
            
            # Parse response
            updated_conversation = response.json()[0]
            
            # Convert metadata from JSON string to Python object if needed
            if isinstance(updated_conversation.get("metadata"), str):
                try:
                    updated_conversation["metadata"] = json.loads(updated_conversation["metadata"])
                except json.JSONDecodeError:
                    updated_conversation["metadata"] = {}
            
            return updated_conversation
        except Exception as e:
            logger.error(f"Error updating conversation: {e}")
            return None
    
    @staticmethod
    def delete_conversation(conversation_id: str) -> bool:
        """Delete a conversation."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot delete conversation.")
                return False
            
            # Delete conversation
            response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/{CONVERSATIONS_TABLE}",
                headers=ConversationService._get_headers(),
                params={"id": f"eq.{conversation_id}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error deleting conversation: {response.text}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            return False
    
    @staticmethod
    def get_messages(conversation_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a conversation."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get messages.")
                return []
            
            # Get all messages for the conversation
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{MESSAGES_TABLE}",
                headers=ConversationService._get_headers(),
                params={
                    "conversation_id": f"eq.{conversation_id}",
                    "order": "created_at.asc"
                }
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting messages: {response.text}")
                return []
            
            # Parse response
            messages = response.json()
            
            # Convert metadata from JSON string to Python object if needed
            for message in messages:
                if isinstance(message.get("metadata"), str):
                    try:
                        message["metadata"] = json.loads(message["metadata"])
                    except json.JSONDecodeError:
                        message["metadata"] = {}
            
            return messages
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            return []
    
    @staticmethod
    def add_message(conversation_id: str, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add a message to a conversation."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot add message.")
                return None
            
            # Prepare message data
            message_data = {
                "id": message.get("id") or str(uuid.uuid4()),
                "conversation_id": conversation_id,
                "role": message["role"],
                "content": message["content"],
                "content_type": message.get("content_type", "text"),
                "metadata": json.dumps(message.get("metadata", {}))
            }
            
            # Add message
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/{MESSAGES_TABLE}",
                headers=ConversationService._get_headers(),
                json=message_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error adding message: {response.text}")
                return None
            
            # Parse response
            added_message = response.json()[0]
            
            # Convert metadata from JSON string to Python object if needed
            if isinstance(added_message.get("metadata"), str):
                try:
                    added_message["metadata"] = json.loads(added_message["metadata"])
                except json.JSONDecodeError:
                    added_message["metadata"] = {}
            
            # Update conversation's updated_at timestamp
            ConversationService.update_conversation(conversation_id, {})
            
            return added_message
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            return None
    
    @staticmethod
    def add_messages(conversation_id: str, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Add multiple messages to a conversation."""
        added_messages = []
        
        for message in messages:
            added_message = ConversationService.add_message(conversation_id, message)
            if added_message:
                added_messages.append(added_message)
        
        return added_messages
