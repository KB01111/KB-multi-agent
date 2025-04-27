/**
 * API client for agent management.
 * This module provides functions for creating, listing, and interacting with agents.
 */

import { ApiClient } from '../api-client';
import { SSEApiClient } from '../api-client-sse';
import type { SSEClient, SSEClientOptions } from '../sse-client';

export interface AgentConfig {
  id?: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  framework: "langgraph" | "openai_agents" | "hybrid";
  memoryBackend?: "memorysaver" | "mem0";
  knowledgeBackend?: "graphiti" | "none";
  // Framework-specific options
  // LangGraph options
  enableReactAgent?: boolean;
  enableCheckpointing?: boolean;
  // OpenAI Agents options
  enableTracing?: boolean;
  enableVoice?: boolean;
  enableParallel?: boolean;
  enableLiteLLM?: boolean;
  // Tools
  tools?: any[];
  // Team membership
  isTeamMember?: boolean;
}

export interface AgentResponse {
  id: string;
  name: string;
  status: string;
}

export interface MessageRequest {
  message: string;
}

export interface MessageResponse {
  content: string;
  conversation_id?: string;
  trace_id?: string;
  error: boolean;
}

export class AgentApi {
  private apiClient: ApiClient;
  private sseApiClient: SSEApiClient;

  constructor(baseUrl: string) {
    this.apiClient = new ApiClient(baseUrl);
    this.sseApiClient = new SSEApiClient(baseUrl);
  }

  /**
   * Create an SSE connection to the agent endpoint.
   *
   * @param agentId The ID of the agent to connect to
   * @param onMessage Callback function for handling messages
   * @param options SSE client options
   * @returns An SSE client instance
   */
  createAgentStream(
    agentId: string,
    onMessage: (data: any) => void,
    options: SSEClientOptions = {}
  ): SSEClient {
    return this.sseApiClient.createAgentSSEConnection(agentId, onMessage, options);
  }

  async getAvailableFrameworks(): Promise<string[]> {
    try {
      const response = await this.apiClient.fetchWithRetry('/api/frameworks');
      return response.frameworks || [];
    } catch (error) {
      console.error('Error fetching available frameworks:', error);
      return [];
    }
  }

  async listAgents(): Promise<AgentConfig[]> {
    try {
      const response = await this.apiClient.fetchWithRetry('/api/agents');
      return response || [];
    } catch (error) {
      console.error('Error listing agents:', error);
      return [];
    }
  }

  async createAgent(config: AgentConfig): Promise<AgentResponse> {
    try {
      // Convert frontend config to backend format
      const backendConfig = {
        name: config.name,
        description: config.description || '',
        instructions: config.instructions || '',
        model: config.model || 'gpt-4o',
        framework: config.framework || 'langgraph',
        memory_backend: config.memoryBackend || 'memorysaver',
        knowledge_backend: config.knowledgeBackend || 'none',
        // Framework-specific options
        enable_react_agent: config.enableReactAgent || false,
        enable_checkpointing: config.enableCheckpointing || false,
        enable_tracing: config.enableTracing || false,
        enable_voice: config.enableVoice || false,
        enable_parallel: config.enableParallel || false,
        enable_litellm: config.enableLiteLLM || true,
        // Tools
        tools: config.tools || [],
        // Team membership
        is_team_member: config.isTeamMember || false
      };

      const response = await this.apiClient.fetchWithRetry('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendConfig)
      });

      return response;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<AgentConfig> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/${agentId}`);
      return response;
    } catch (error) {
      console.error(`Error getting agent ${agentId}:`, error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<any> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error(`Error deleting agent ${agentId}:`, error);
      throw error;
    }
  }

  async sendMessage(agentId: string, message: string): Promise<MessageResponse> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/${agentId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      return response;
    } catch (error) {
      console.error(`Error sending message to agent ${agentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: `Error: ${errorMessage}`,
        error: true
      };
    }
  }
}
