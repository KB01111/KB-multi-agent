/**
 * Enhanced API client with SSE support.
 * This module extends the base API client with SSE-specific functionality.
 */

import { ApiCli_ent  } from './api-client';
import type { SSEClientOptions, SSEClientEvents } from './sse-client';
import { SSECli_ent  } from './sse-client';

export class SSEApiClient extends ApiClient {
  /**
   * Create an SSE connection to the specified endpoint.
   *
   * @param path The API path to connect to
   * @param onMessage Callback function for handling messages
   * @param options SSE client options
   * @returns An SSE client instance
   */
  _createSSEConnection(
    path: string,
    onMessage: (data: any) => void,
    options: SSEClientOptions = {}
  ): SSEClient {
    const url = `${this.getBaseUrl()}${path}`;

    // Create _event handlers
    const eventHandlers: SSEClientEvents = {
      onOpen: (_event) => {
        console.log(`SSE connection established to ${url}`);
      },
      onMessage: (_event) => {
        try {
          // Try to parse the data as JSON if it's a string
          let parsedData;
          if (typeof _event.data === 'string') {
            try {
              parsedData = JSON.parse(_event.data);
            } catch (_e) {
              // If parsing fails, use the raw data
              parsedData = _event.data;
            }
          } else {
            parsedData = _event.data;
          }

          onMessage(parsedData);
        } catch (_error) {
          console._error('Error handling SSE message:', _error);
        }
      },
      onError: (_event) => {
        console._error('SSE connection _error:', _event);
      },
      onClose: () => {
        console.log(`SSE connection closed for ${url}`);
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting to SSE (attempt ${attempt}) for ${url}`);
      },
      onReconnectFailed: () => {
        console._error(`Failed to reconnect to SSE after multiple attempts for ${url}`);
      },
    };

    const client = new SSEClient(
      url,
      eventHandlers,
      options
    );

    client.connect();
    return client;
  }

  /**
   * Create an SSE connection to the agent endpoint.
   *
   * @param agentId The ID of the agent to connect to
   * @param onMessage Callback function for handling messages
   * @param options SSE client options
   * @returns An SSE client instance
   */
  createAgentSSEConnection(
    agentId: string,
    onMessage: (data: any) => void,
    options: SSEClientOptions = {}
  ): SSEClient {
    return this._createSSEConnection(
      `/api/agents/${agentId}/stream`,
      onMessage,
      options
    );
  }

  /**
   * Create an SSE connection to the team endpoint.
   *
   * @param teamId The ID of the team to connect to
   * @param onMessage Callback function for handling messages
   * @param options SSE client options
   * @returns An SSE client instance
   */
  createTeamSSEConnection(
    teamId: string,
    onMessage: (data: any) => void,
    options: SSEClientOptions = {}
  ): SSEClient {
    return this._createSSEConnection(
      `/api/agents/teams/${teamId}/stream`,
      onMessage,
      options
    );
  }
}
