"""
Database status module for the MCP Agent.
This provides endpoints for checking the database status.
"""

import os
import sys
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a router
router = APIRouter()

@router.get("/database/status")
async def database_status():
    """Database status endpoint."""
    try:
        # Check database configuration
        database_backend = os.environ.get("DATABASE_BACKEND", "supabase")
        logger.info(f"Checking database status for backend: {database_backend}")

        # Default response for fallback
        default_response = {
            "status": "ok",
            "message": "Using fallback in-memory storage",
            "type": "Memory",
            "tables": 0,
            "connected": True,
            "is_fallback": True
        }

        if database_backend == "supabase":
            # Check Supabase configuration
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

            if not supabase_url or not supabase_key:
                logger.warning("Supabase configuration incomplete, using fallback")
                return {
                    "status": "warning",
                    "message": "Supabase configuration incomplete, using fallback storage",
                    "type": "Memory",
                    "tables": 0,
                    "connected": True,
                    "is_fallback": True
                }

            # Try to import supabase-py
            try:
                from supabase import create_client
                logger.info("Supabase module imported successfully")

                # Try to connect to Supabase with timeout protection
                try:
                    import asyncio
                    from concurrent.futures import ThreadPoolExecutor

                    # Create a function to connect to Supabase
                    def connect_to_supabase():
                        try:
                            client = create_client(supabase_url, supabase_key)
                            # Test connection with a simple query
                            client.table("_dummy_").select("*").limit(1).execute()
                            return client
                        except Exception as e:
                            logger.warning(f"Error connecting to Supabase: {e}")
                            return None

                    # Run the connection with a timeout
                    with ThreadPoolExecutor() as executor:
                        connect_task = asyncio.get_event_loop().run_in_executor(executor, connect_to_supabase)
                        try:
                            supabase = await asyncio.wait_for(connect_task, timeout=5.0)  # 5 second timeout
                        except asyncio.TimeoutError:
                            logger.warning("Supabase connection timed out")
                            return {
                                "status": "warning",
                                "message": "Supabase connection timed out, using fallback storage",
                                "type": "Memory",
                                "tables": 0,
                                "connected": False,
                                "is_fallback": True
                            }

                    if supabase is None:
                        logger.warning("Could not connect to Supabase, using fallback")
                        return default_response

                    # Try to get table information
                    try:
                        # Check for important tables
                        tables_to_check = ["entities", "relations", "users", "sessions"]
                        available_tables = []
                        entity_count = 0

                        for table in tables_to_check:
                            try:
                                check_response = supabase.table(table).select("count", count="exact").execute()
                                if hasattr(check_response, "count"):
                                    available_tables.append(table)
                                    if table == "entities":
                                        entity_count = check_response.count
                            except Exception as table_error:
                                logger.debug(f"Table {table} not found: {table_error}")

                        # If we found tables, return success
                        if available_tables:
                            return {
                                "status": "ok",
                                "message": "Connected to Supabase",
                                "type": "Supabase",
                                "tables": len(available_tables),
                                "available_tables": available_tables,
                                "connected": True,
                                "entities": entity_count
                            }
                        else:
                            # No tables found, but connection successful
                            return {
                                "status": "warning",
                                "message": "Connected to Supabase but no tables found",
                                "type": "Supabase",
                                "tables": 0,
                                "connected": True,
                                "is_new": True
                            }
                    except Exception as e:
                        logger.warning(f"Could not query Supabase tables: {e}")
                        # Connection successful but couldn't query tables
                        return {
                            "status": "warning",
                            "message": "Connected to Supabase but could not query tables",
                            "type": "Supabase",
                            "tables": 0,
                            "connected": True
                        }
                except Exception as e:
                    logger.warning(f"Error connecting to Supabase: {e}")
                    return default_response
            except ImportError:
                logger.warning("supabase-py not installed, using fallback")
                return {
                    "status": "warning",
                    "message": "supabase-py not installed, using fallback storage",
                    "type": "Memory",
                    "tables": 0,
                    "connected": True,
                    "is_fallback": True
                }
        elif database_backend == "postgres":
            # Check PostgreSQL configuration
            database_url = os.environ.get("DATABASE_URL")
            logger.info("Checking PostgreSQL database status")

            if not database_url:
                logger.warning("PostgreSQL configuration incomplete, using fallback")
                return {
                    "status": "warning",
                    "message": "PostgreSQL configuration incomplete, using fallback storage",
                    "type": "Memory",
                    "tables": 0,
                    "connected": True,
                    "is_fallback": True
                }

            # Try to import psycopg2
            try:
                import psycopg2
                logger.info("psycopg2 module imported successfully")

                # Try to connect to PostgreSQL with timeout protection
                try:
                    import asyncio
                    from concurrent.futures import ThreadPoolExecutor

                    # Create a function to connect to PostgreSQL
                    def connect_to_postgres():
                        try:
                            conn = psycopg2.connect(database_url)
                            cursor = conn.cursor()

                            # Test connection with a simple query
                            cursor.execute("SELECT 1")
                            cursor.fetchone()

                            return conn
                        except Exception as e:
                            logger.warning(f"Error connecting to PostgreSQL: {e}")
                            return None

                    # Run the connection with a timeout
                    with ThreadPoolExecutor() as executor:
                        connect_task = asyncio.get_event_loop().run_in_executor(executor, connect_to_postgres)
                        try:
                            conn = await asyncio.wait_for(connect_task, timeout=5.0)  # 5 second timeout
                        except asyncio.TimeoutError:
                            logger.warning("PostgreSQL connection timed out")
                            return {
                                "status": "warning",
                                "message": "PostgreSQL connection timed out, using fallback storage",
                                "type": "Memory",
                                "tables": 0,
                                "connected": False,
                                "is_fallback": True
                            }

                    if conn is None:
                        logger.warning("Could not connect to PostgreSQL, using fallback")
                        return default_response

                    # Connection successful, get table information
                    cursor = conn.cursor()

                    # Get table count with error handling
                    table_count = 0
                    try:
                        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
                        table_count = cursor.fetchone()[0]
                    except Exception as e:
                        logger.warning(f"Error getting table count: {e}")

                    # Get entity count with error handling
                    entity_count = 0
                    try:
                        cursor.execute("SELECT COUNT(*) FROM entities")
                        entity_count = cursor.fetchone()[0]
                    except Exception as e:
                        logger.debug(f"Error getting entity count: {e}")

                    # Check for important tables
                    tables_to_check = ["entities", "relations", "users", "sessions"]
                    available_tables = []

                    for table in tables_to_check:
                        try:
                            cursor.execute(f"SELECT 1 FROM information_schema.tables WHERE table_name = '{table}' AND table_schema = 'public'")
                            if cursor.fetchone():
                                available_tables.append(table)
                        except Exception as e:
                            logger.debug(f"Error checking table {table}: {e}")

                    # Close the connection
                    conn.close()

                    # Return the status
                    return {
                        "status": "ok",
                        "message": "Connected to PostgreSQL",
                        "type": "PostgreSQL",
                        "tables": table_count,
                        "available_tables": available_tables,
                        "connected": True,
                        "entities": entity_count
                    }
                except Exception as e:
                    logger.warning(f"Error querying PostgreSQL: {e}")
                    return default_response
            except ImportError:
                logger.warning("psycopg2 not installed, using fallback")
                return {
                    "status": "warning",
                    "message": "psycopg2 not installed, using fallback storage",
                    "type": "Memory",
                    "tables": 0,
                    "connected": True,
                    "is_fallback": True
                }
        else:
            # Unknown database backend, use memory fallback
            logger.warning(f"Unknown database backend: {database_backend}, using fallback")
            return {
                "status": "warning",
                "message": f"Unknown database backend: {database_backend}, using fallback storage",
                "type": "Memory",
                "tables": 0,
                "connected": True,
                "is_fallback": True
            }
    except Exception as e:
        # Catch-all error handler to ensure the endpoint always returns a valid response
        logger.error(f"Error checking database status: {e}")

        # Return a fallback response that indicates we're using in-memory storage
        return {
            "status": "warning",
            "message": "Error checking database status, using fallback storage",
            "type": "Memory",
            "tables": 0,
            "connected": True,
            "is_fallback": True,
            "error": str(e)
        }
