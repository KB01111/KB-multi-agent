"""
Enhanced adapter for OpenAI Agents SDK integration.
This module provides improved adapters to use OpenAI Agents SDK with the existing LangGraph architecture.
"""

import logging
import os
import json
from typing import Dict, List, Any, Optional, Callable, Awaitable, Union
import asyncio
import inspect

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenAIAgentsSDKAdapter:
    """
    Enhanced adapter for OpenAI Agents SDK.
    This adapter provides a more complete integration with OpenAI Agents SDK.
    """

    def __init__(
        self,
        name: str,
        instructions: str,
        tools: List[Any] = None,
        model: str = "gpt-4o",
        enable_tracing: bool = False,
        enable_voice: bool = False,
        enable_parallel: bool = False,
        enable_litellm: bool = True,
        redis_manager = None
    ):
        """
        Initialize the OpenAI Agents SDK adapter.

        Args:
            name: The name of the agent
            instructions: The instructions for the agent
            tools: The tools available to the agent
            model: The model to use
            enable_tracing: Whether to enable tracing
            enable_voice: Whether to enable voice capabilities
            enable_parallel: Whether to enable parallel execution
            enable_litellm: Whether to enable LiteLLM integration
            redis_manager: Optional Redis manager for caching responses
        """
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.model = model
        self.enable_tracing = enable_tracing
        self.enable_voice = enable_voice
        self.enable_parallel = enable_parallel
        self.enable_litellm = enable_litellm
        self.redis_manager = redis_manager
        self.cache_enabled = redis_manager is not None

        # Import here to avoid circular imports and allow optional dependency
        try:
            from agents import Agent as OpenAIAgent

            # Configure the model
            model_settings = None
            if enable_litellm:
                try:
                    from agents.extensions.models.litellm_model import LitellmModel
                    model_settings = LitellmModel(model=model)
                    logger.info(f"Using LiteLLM model: {model}")
                except ImportError:
                    logger.warning("LiteLLM not available. Using default model.")
                    model_settings = model
            else:
                model_settings = model

            # Create the OpenAI agent
            self.openai_agent = OpenAIAgent(
                name=name,
                instructions=instructions,
                tools=tools,
                model=model_settings
            )

            # Configure tracing if enabled
            if enable_tracing:
                try:
                    from agents import set_tracing_disabled
                    # Enable tracing (default is enabled, so we don't disable it)
                    logger.info("Tracing is enabled for OpenAI Agents SDK")
                except ImportError:
                    logger.warning("Tracing module not available in OpenAI Agents SDK")
            else:
                try:
                    from agents import set_tracing_disabled
                    # Disable tracing
                    set_tracing_disabled(True)
                    logger.info("Tracing is disabled for OpenAI Agents SDK")
                except ImportError:
                    logger.warning("Tracing module not available in OpenAI Agents SDK")

            # Configure voice if enabled
            self.voice_pipeline = None
            if enable_voice:
                try:
                    from agents.voice import VoicePipeline, SingleAgentVoiceWorkflow
                    self.voice_pipeline = VoicePipeline(
                        workflow=SingleAgentVoiceWorkflow(self.openai_agent)
                    )
                    logger.info("Voice pipeline initialized for OpenAI Agents SDK")
                except ImportError:
                    logger.warning("Voice module not available in OpenAI Agents SDK")

        except ImportError:
            logger.warning("OpenAI Agents SDK not installed. Using mock implementation.")
            self.openai_agent = None
            self.voice_pipeline = None

    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the state using the OpenAI agent.

        Args:
            state: The LangGraph state

        Returns:
            The updated LangGraph state
        """
        if self.openai_agent is None:
            logger.error("OpenAI Agents SDK not available. Cannot process state.")
            return state

        # Import here to avoid circular imports and allow optional dependency
        try:
            from agents import Runner

            # Extract the messages from the state
            messages = state.get("messages", [])

            # Get the last user message
            user_message = None
            for message in reversed(messages):
                if message.get("role") == "user":
                    user_message = message.get("content", "")
                    break

            if not user_message:
                logger.warning("No user message found in state")
                return state

            # Check cache if enabled
            if self.cache_enabled and self.redis_manager:
                cached_response = self.redis_manager.get_cached_llm_response(user_message, self.model)
                if cached_response:
                    logger.info(f"Cache hit for model {self.model}")

                    # Create a new assistant message with the cached response
                    new_message = {
                        "role": "assistant",
                        "content": cached_response
                    }

                    # Update the state with the cached response
                    updated_state = {
                        **state,
                        "messages": messages + [new_message],
                        "cached": True
                    }

                    return updated_state

            # Run the OpenAI agent
            if self.enable_parallel:
                # Use enhanced parallel execution with better error handling
                try:
                    logger.info("Using parallel execution for OpenAI agent")

                    # Split the user message into subtasks using our improved method
                    subtasks = self._split_into_subtasks(user_message)

                    if not subtasks:
                        logger.warning("No subtasks generated, falling back to standard execution")
                        result = await Runner.run(
                            self.openai_agent,
                            user_message,
                            conversation_id=state.get("conversation_id")
                        )
                    else:
                        # Create tasks for parallel processing with proper error handling
                        tasks = []
                        for i, subtask in enumerate(subtasks):
                            # Create a unique conversation ID for each subtask
                            subtask_conv_id = f"{state.get('conversation_id', 'conv')}-subtask-{i}"
                            tasks.append(self._run_subtask_with_error_handling(
                                self.openai_agent,
                                subtask,
                                subtask_conv_id
                            ))

                        # Run tasks in parallel with timeout protection
                        subtask_results = await asyncio.gather(*tasks)

                        # Filter out any None results (from failed subtasks)
                        valid_results = [r for r in subtask_results if r is not None]

                        if not valid_results:
                            logger.warning("All parallel subtasks failed, falling back to standard execution")
                            result = await Runner.run(
                                self.openai_agent,
                                user_message,
                                conversation_id=state.get("conversation_id")
                            )
                        else:
                            # Combine results with a more structured approach
                            combine_prompt = f"I've analyzed your request: '{user_message}' from multiple perspectives. Here are my findings:\n\n"

                            for i, result in enumerate(valid_results):
                                if hasattr(result, 'final_output') and result.final_output:
                                    # Add a numbered section for each result
                                    combine_prompt += f"Analysis {i+1}:\n{result.final_output}\n\n"

                            combine_prompt += "Based on the above analyses, please provide a comprehensive, well-structured response that addresses all aspects of the original request."

                            # Run a final pass to combine the results
                            result = await Runner.run(
                                self.openai_agent,
                                combine_prompt,
                                conversation_id=state.get("conversation_id")
                            )

                            # Add metadata about parallel execution
                            if not hasattr(result, 'metadata'):
                                result.metadata = {}
                            result.metadata['parallel_execution'] = True
                            result.metadata['subtask_count'] = len(subtasks)
                            result.metadata['successful_subtasks'] = len(valid_results)

                except Exception as e:
                    logger.error(f"Error running OpenAI agent with parallel execution: {e}")
                    logger.warning("Falling back to standard execution")
                    try:
                        # Fall back to standard execution
                        result = await Runner.run(
                            self.openai_agent,
                            user_message,
                            conversation_id=state.get("conversation_id")
                        )
                    except Exception as fallback_error:
                        logger.error(f"Error in fallback execution: {fallback_error}")
                        return state
            else:
                # Use standard execution
                try:
                    result = await Runner.run(
                        self.openai_agent,
                        user_message,
                        conversation_id=state.get("conversation_id")
                    )
                except Exception as e:
                    logger.error(f"Error running OpenAI agent: {e}")
                    return state

            # Cache the result if caching is enabled
            if self.cache_enabled and self.redis_manager and hasattr(result, "final_output"):
                self.redis_manager.cache_llm_response(user_message, result.final_output, self.model)
                logger.debug(f"Cached response for model {self.model}")

            # Extract the new messages from the result
            new_messages = []
            if hasattr(result, "new_messages"):
                new_messages = result.new_messages
            elif hasattr(result, "messages"):
                new_messages = result.messages

            # Update the state with the new messages
            updated_messages = messages + new_messages

            # Update the state
            updated_state = {
                **state,
                "messages": updated_messages,
                "conversation_id": result.conversation_id if hasattr(result, "conversation_id") else state.get("conversation_id"),
                "trace_id": result.trace_id if hasattr(result, "trace_id") else state.get("trace_id")
            }

            return updated_state

        except ImportError:
            logger.error("OpenAI Agents SDK not available. Cannot process state.")
            return state
        except Exception as e:
            logger.error(f"Error processing state with OpenAI agent: {e}")
            return state

    def _split_into_subtasks(self, user_message: str) -> List[str]:
        """
        Split a user message into subtasks for parallel processing.

        Args:
            user_message: The user message to split

        Returns:
            A list of subtasks
        """
        # This is a more robust implementation for splitting tasks

        # First, check if the message is too short to split
        if len(user_message.split()) < 20:  # If message is very short
            # Just create different perspectives for the same message
            return [
                f"Analyze this request focusing on providing factual information: {user_message}",
                f"Analyze this request focusing on creative solutions: {user_message}"
            ]

        # Try to identify if there are multiple questions or requests
        # Split on question marks, exclamation points, periods, and semicolons
        sentences = []
        for s in user_message.replace('?', '?|').replace('!', '!|').replace('.', '.|').replace(';', ';|').split('|'):
            if s.strip():
                sentences.append(s.strip())

        # If we have multiple sentences, group them logically
        if len(sentences) >= 2:
            # For 2-3 sentences, each becomes its own subtask
            if len(sentences) <= 3:
                subtasks = [f"Address this specific part of the request: {sentence}" for sentence in sentences]
            else:
                # For more sentences, group them into logical chunks (max 3)
                chunk_size = max(1, len(sentences) // 3)
                subtasks = []

                for i in range(0, len(sentences), chunk_size):
                    chunk = ' '.join(sentences[i:i+chunk_size])
                    subtasks.append(f"Address this part of the request thoroughly: {chunk}")

                # Ensure we don't have more than 3 subtasks for efficiency
                if len(subtasks) > 3:
                    subtasks = subtasks[:3]
        else:
            # If we only have one sentence but it's complex, use different analysis approaches
            subtasks = [
                f"Analyze this request focusing on providing factual information: {user_message}",
                f"Analyze this request focusing on creative solutions: {user_message}",
                f"Analyze this request considering potential challenges and limitations: {user_message}"
            ]

        logger.info(f"Split user message into {len(subtasks)} subtasks for parallel processing")
        return subtasks

    async def _run_subtask_with_error_handling(self, agent, subtask: str, conversation_id: str):
        """
        Run a subtask with error handling.

        Args:
            agent: The OpenAI agent to use
            subtask: The subtask to run
            conversation_id: The conversation ID

        Returns:
            The result of running the subtask, or None if an error occurred
        """
        try:
            # Set a timeout for the subtask to prevent hanging
            from agents import Runner

            # Create a task with timeout
            task = Runner.run(agent, subtask, conversation_id=conversation_id)

            # Wait for the task to complete with a timeout
            result = await asyncio.wait_for(task, timeout=60.0)  # 60 second timeout
            return result
        except asyncio.TimeoutError:
            logger.warning(f"Subtask timed out: {subtask[:50]}...")
            return None
        except Exception as e:
            logger.warning(f"Error running subtask: {e}")
            return None

    async def process_voice(self, audio_input: Any) -> Any:
        """
        Process voice input using the OpenAI agent.

        Args:
            audio_input: The audio input to process

        Returns:
            The result of processing the audio input
        """
        if self.voice_pipeline is None:
            logger.error("Voice pipeline not available. Cannot process audio input.")
            return None

        try:
            # Run the voice pipeline
            result = await self.voice_pipeline.run(audio_input)
            return result
        except Exception as e:
            logger.error(f"Error processing audio input with OpenAI agent: {e}")
            return None


def adapt_langchain_tool_to_openai_agents(lc_tool: Any) -> Callable:
    """
    Convert a LangChain tool to an OpenAI Agents SDK tool.

    Args:
        lc_tool: The LangChain tool to convert

    Returns:
        An OpenAI Agents SDK compatible tool
    """
    try:
        # Import here to avoid circular imports and allow optional dependency
        from agents import function_tool as openai_function_tool

        @openai_function_tool
        async def adapted_tool(*args, **kwargs):
            """Adapted LangChain tool."""
            # Handle both sync and async tools
            if inspect.iscoroutinefunction(lc_tool.invoke):
                return await lc_tool.invoke(*args, **kwargs)
            else:
                return lc_tool.invoke(*args, **kwargs)

        # Copy metadata
        adapted_tool.__name__ = lc_tool.name
        adapted_tool.__doc__ = lc_tool.description

        return adapted_tool
    except ImportError:
        logger.warning("OpenAI Agents SDK not installed. Returning mock tool.")

        async def mock_tool(*args, **kwargs):
            logger.warning(f"Mock tool called: {lc_tool.name}")
            return f"Mock response from {lc_tool.name}"

        return mock_tool


def adapt_openai_agents_tool_to_langchain(openai_tool: Callable) -> Any:
    """
    Convert an OpenAI Agents SDK tool to a LangChain tool.

    Args:
        openai_tool: The OpenAI Agents SDK tool to convert

    Returns:
        A LangChain compatible tool
    """
    try:
        # Import here to avoid circular imports and allow optional dependency
        from langchain.tools import Tool as LangChainTool

        async def _run(*args, **kwargs):
            # Handle both sync and async tools
            if inspect.iscoroutinefunction(openai_tool):
                return await openai_tool(*args, **kwargs)
            else:
                return openai_tool(*args, **kwargs)

        return LangChainTool(
            name=openai_tool.__name__,
            description=openai_tool.__doc__,
            func=_run
        )
    except ImportError:
        logger.warning("LangChain not installed. Returning None.")
        return None


def create_openai_agents_team(agents: List[Any], workflow_type: str = "sequential") -> Any:
    """
    Create a team of OpenAI Agents SDK agents.

    Args:
        agents: The agents to include in the team
        workflow_type: The type of workflow to use (sequential, parallel, or custom)

    Returns:
        A function that can be used to run the team
    """
    try:
        # Import here to avoid circular imports and allow optional dependency
        from agents import Runner, trace

        async def run_sequential_workflow(user_input: str) -> str:
            """
            Run a sequential workflow with the agents.

            Args:
                user_input: The user input to process

            Returns:
                The final output of the workflow
            """
            result = user_input
            for agent in agents:
                agent_result = await Runner.run(agent, result)
                result = agent_result.final_output
            return result

        async def run_parallel_workflow(user_input: str) -> str:
            """
            Run a parallel workflow with the agents.

            Args:
                user_input: The user input to process

            Returns:
                The combined output of the workflow
            """
            tasks = [Runner.run(agent, user_input) for agent in agents]
            results = await asyncio.gather(*tasks)
            combined_result = "\n\n".join([result.final_output for result in results])
            return combined_result

        if workflow_type == "sequential":
            return run_sequential_workflow
        elif workflow_type == "parallel":
            return run_parallel_workflow
        else:
            # Default to sequential for custom workflows
            return run_sequential_workflow

    except ImportError:
        logger.warning("OpenAI Agents SDK not installed. Returning None.")
        return None
