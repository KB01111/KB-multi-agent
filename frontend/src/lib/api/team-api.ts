/**
 * API client for team management
 */

import type { TeamConfig } from '@/components/team-creation-form';

import { ApiClient } from '../api-client';
import { SSEApiClient } from '../api-client-sse';
import type { SSEClient, SSEClientOptions } from '../sse-client';

export class TeamApi {
  private baseUrl: string;
  private apiClient: ApiClient;
  private sseApiClient: SSEApiClient;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.apiClient = new ApiClient(baseUrl);
    this.sseApiClient = new SSEApiClient(baseUrl);
  }

  /**
   * Create an SSE connection to the team endpoint.
   *
   * @param teamId The ID of the team to connect to
   * @param onMessage Callback function for handling messages
   * @param options SSE client options
   * @returns An SSE client instance
   */
  createTeamStream(
    teamId: string,
    onMessage: (data: any) => void,
    options: SSEClientOptions = {}
  ): SSEClient {
    return this.sseApiClient.createTeamSSEConnection(teamId, onMessage, options);
  }

  /**
   * List all teams
   */
  async listTeams(): Promise<TeamConfig[]> {
    try {
      const response = await this.apiClient.fetchWithRetry('/api/agents/teams');
      return response || [];
    } catch (error) {
      console.error('Error listing teams:', error);
      return [];
    }
  }

  /**
   * Get a team by ID
   */
  async getTeam(teamId: string): Promise<TeamConfig> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/teams/${teamId}`);
      return response;
    } catch (error) {
      console.error(`Error getting team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new team
   */
  async createTeam(team: TeamConfig): Promise<{ id: string; name: string; status: string }> {
    try {
      const response = await this.apiClient.fetchWithRetry('/api/agents/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(team),
      });

      return response;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Update an existing team
   */
  async updateTeam(teamId: string, team: TeamConfig): Promise<{ id: string; name: string; status: string }> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(team),
      });

      return response;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: string): Promise<{ id: string; status: string }> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/teams/${teamId}`, {
        method: 'DELETE',
      });

      return response;
    } catch (error) {
      console.error(`Error deleting team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Send a message to a team
   */
  async sendMessage(teamId: string, message: string): Promise<{ content: string; conversation_id?: string; error: boolean }> {
    try {
      const response = await this.apiClient.fetchWithRetry(`/api/agents/teams/${teamId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      return response;
    } catch (error) {
      console.error(`Error sending message to team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: `Error: ${errorMessage}`,
        error: true
      };
    }
  }
}
