/**
 * Enhanced SSE client with robust error handling and reconnection logic.
 * This module provides a wrapper around the EventSource API with additional features.
 */

import * as Sentry from "@sentry/nextjs";

export interface SSEClientOptions {
  /** Maximum number of reconnection attempts */
  maxRetries?: number;
  /** Initial delay between reconnection attempts (in ms) */
  initialRetryDelay?: number;
  /** Maximum delay between reconnection attempts (in ms) */
  maxRetryDelay?: number;
  /** Whether to use exponential backoff for reconnection delays */
  useExponentialBackoff?: boolean;
  /** Additional headers to send with the request (not supported by all browsers) */
  headers?: Record<string, string>;
  /** Whether to automatically reconnect on error */
  autoReconnect?: boolean;
}

export interface SSEClientEvents {
  /** Called when the connection is established */
  onOpen?: (event: Event) => void;
  /** Called when a message is received */
  onMessage?: (event: MessageEvent) => void;
  /** Called when an error occurs */
  onError?: (event: Event) => void;
  /** Called when the connection is closed */
  onClose?: () => void;
  /** Called when a reconnection attempt is made */
  onReconnect?: (attempt: number) => void;
  /** Called when all reconnection attempts have failed */
  onReconnectFailed?: () => void;
}

export class SSEClient {
  private url: string;
  private eventSource: EventSource | null = null;
  private options: Required<SSEClientOptions>;
  private events: SSEClientEvents;
  private retryCount = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isClosed = false;

  constructor(
    url: string,
    events: SSEClientEvents = {},
    options: SSEClientOptions = {}
  ) {
    this.url = url;
    this.events = events;
    this.options = {
      maxRetries: options.maxRetries ?? 5,
      initialRetryDelay: options.initialRetryDelay ?? 1000,
      maxRetryDelay: options.maxRetryDelay ?? 30000,
      useExponentialBackoff: options.useExponentialBackoff ?? true,
      headers: options.headers ?? {},
      autoReconnect: options.autoReconnect ?? true,
    };
  }

  /**
   * Connect to the SSE endpoint with enhanced error handling
   */
  public connect(): void {
    // Prevent multiple connection attempts
    if (this.eventSource || this.isConnecting || this.isClosed) {
      return;
    }

    this.isConnecting = true;
    console.log(`Connecting to SSE endpoint: ${this.url}`);

    try {
      // Create a new EventSource with error handling
      this.eventSource = new EventSource(this.url);

      // Set up event handlers with improved error handling
      this.eventSource.onopen = (event) => {
        this.isConnecting = false;
        this.retryCount = 0;
        console.log(`SSE connection established to ${this.url}`);

        // Add a heartbeat check to detect stale connections
        this.setupHeartbeatCheck();

        // Call the open handler
        this.events.onOpen?.(event);
      };

      this.eventSource.onmessage = (event) => {
        // Reset the last message timestamp for heartbeat checking
        this.lastMessageTimestamp = Date.now();

        try {
          // Try to parse the data as JSON
          let parsedData;
          if (typeof event.data === 'string') {
            try {
              parsedData = JSON.parse(event.data);
            } catch (parseError) {
              // If parsing fails, use the raw data
              console.warn("Failed to parse SSE message as JSON:", parseError);
              parsedData = event.data;
            }
          } else {
            parsedData = event.data;
          }

          // Create a new event with the parsed data
          const enhancedEvent = {
            ...event,
            data: parsedData
          };

          // Call the message handler
          this.events.onMessage?.(enhancedEvent);
        } catch (error) {
          // If any other error occurs, log it but don't fail
          console.warn("Error handling SSE message:", error);
          this.events.onMessage?.(event);
        }
      };

      this.eventSource.onerror = (event) => {
        this.isConnecting = false;
        console.error("SSE connection error:", event);

        // Report to Sentry with more context
        Sentry.captureMessage("SSE connection error", {
          level: "error",
          extra: {
            url: this.url,
            retryCount: this.retryCount,
            readyState: this.eventSource?.readyState,
            timestamp: new Date().toISOString()
          },
        });

        // Call the error handler
        this.events.onError?.(event);

        // Check if the connection is actually closed
        // readyState 2 means CLOSED
        if (this.eventSource?.readyState === 2) {
          // Close the current connection properly
          this.close(false);

          // Attempt to reconnect if auto-reconnect is enabled
          if (this.options.autoReconnect && !this.isClosed) {
            this.reconnect();
          }
        }
      };
    } catch (error) {
      this.isConnecting = false;
      console.error("Error creating SSE connection:", error);

      // Report to Sentry with detailed context
      Sentry.captureException(error, {
        extra: {
          url: this.url,
          retryCount: this.retryCount,
          timestamp: new Date().toISOString(),
          browserInfo: this.getBrowserInfo()
        },
      });

      // Attempt to reconnect if auto-reconnect is enabled
      if (this.options.autoReconnect && !this.isClosed) {
        this.reconnect();
      }
    }
  }

  // Track the last message timestamp for heartbeat checking
  private lastMessageTimestamp: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Set up a heartbeat check to detect stale connections
   */
  private setupHeartbeatCheck(): void {
    // Clear any existing heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Initialize the last message timestamp
    this.lastMessageTimestamp = Date.now();

    // Set up a new heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      // Check if we haven't received a message in a while (60 seconds)
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTimestamp;

      if (timeSinceLastMessage > 60000) { // 60 seconds
        console.warn(`No SSE messages received in ${timeSinceLastMessage}ms, reconnecting...`);

        // Close and reconnect
        this.close(false);
        this.connect();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get browser information for better error reporting
   */
  private getBrowserInfo(): Record<string, string> {
    const info: Record<string, string> = {};

    if (typeof navigator !== 'undefined') {
      info.userAgent = navigator.userAgent;
      info.platform = navigator.platform;
      info.language = navigator.language;

      if ('connection' in navigator && (navigator as any).connection) {
        const conn = (navigator as any).connection;
        info.connectionType = conn.effectiveType || 'unknown';
        info.downlink = String(conn.downlink || 'unknown');
      }
    }

    return info;
  }

  /**
   * Close the SSE connection with proper cleanup
   */
  public close(permanent: boolean = true): void {
    if (permanent) {
      this.isClosed = true;
    }

    // Clear any pending reconnection timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Clear the heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close the EventSource if it exists
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (error) {
        console.warn("Error closing SSE connection:", error);
      }

      this.eventSource = null;
      console.log(`SSE connection to ${this.url} closed`);
      this.events.onClose?.();
    }
  }

  /**
   * Attempt to reconnect to the SSE endpoint
   */
  private reconnect(): void {
    if (this.isClosed || this.retryTimeout) {
      return;
    }

    this.retryCount++;

    // Check if we've exceeded the maximum number of retries
    if (this.retryCount > this.options.maxRetries) {
      console.error(`Failed to reconnect to SSE after ${this.options.maxRetries} attempts`);
      this.events.onReconnectFailed?.();
      return;
    }

    // Calculate the delay before the next reconnection attempt
    const delay = this.calculateRetryDelay();

    console.log(`Attempting to reconnect to SSE (attempt ${this.retryCount}/${this.options.maxRetries}) in ${delay}ms`);
    this.events.onReconnect?.(this.retryCount);

    // Schedule the reconnection attempt
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Calculate the delay before the next reconnection attempt
   */
  private calculateRetryDelay(): number {
    if (!this.options.useExponentialBackoff) {
      return this.options.initialRetryDelay;
    }

    // Calculate the delay using exponential backoff with jitter
    const exponentialDelay = this.options.initialRetryDelay * Math.pow(2, this.retryCount - 1);
    const jitter = Math.random() * 0.5 + 0.5; // Random value between 0.5 and 1
    const delay = Math.min(exponentialDelay * jitter, this.options.maxRetryDelay);

    return delay;
  }
}

/**
 * Create an SSE connection with enhanced error handling and reconnection logic
 */
export function createSSEConnection(
  url: string,
  onMessage: (data: any) => void,
  options: SSEClientOptions = {}
): SSEClient {
  const client = new SSEClient(
    url,
    {
      onMessage: (event) => {
        onMessage(event.data);
      },
      onError: (event) => {
        console.error("SSE connection error:", event);
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting to SSE (attempt ${attempt})`);
      },
      onReconnectFailed: () => {
        console.error("Failed to reconnect to SSE after multiple attempts");
      },
    },
    options
  );

  client.connect();
  return client;
}
