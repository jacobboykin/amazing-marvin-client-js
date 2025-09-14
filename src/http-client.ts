import type { MarvinClientConfig } from './types';
import { MarvinError } from './errors';

/**
 * HTTP client abstraction for handling requests, retries, and error handling
 */
export class HttpClient {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly fetch: typeof fetch;

  constructor(config: MarvinClientConfig) {
    if (!config.apiToken || config.apiToken.trim() === '') {
      throw new Error('API token is required and cannot be empty');
    }

    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://serv.amazingmarvin.com/api';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries ?? 3;
    this.retryDelay = config.retryDelay || 1000;
    this.fetch = config.fetch || globalThis.fetch;

    if (this.timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }

    if (this.retries < 0) {
      throw new Error('Retries must be 0 or greater');
    }

    if (this.retryDelay <= 0) {
      throw new Error('Retry delay must be greater than 0');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseRetryAfter(value: string | null): number | null {
    if (!value) return null;
    const secs = Number(value);
    if (!Number.isNaN(secs)) return Math.max(0, Math.floor(secs * 1000));
    const dateMs = new Date(value).getTime();
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
    return null;
  }

  /**
   * Make a JSON request with retry logic
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    additionalHeaders: Record<string, string> = {}
  ): Promise<T> {
    return this.requestWithRetries<T>(endpoint, options, additionalHeaders, async (response) => {
      const responseData: unknown = await response.json();
      return responseData as T;
    });
  }

  /**
   * Make a text request with retry logic
   */
  async requestText(
    endpoint: string,
    options: RequestInit = {},
    additionalHeaders: Record<string, string> = {}
  ): Promise<string> {
    return this.requestWithRetries<string>(endpoint, options, additionalHeaders, async (response) => {
      return response.text();
    });
  }

  /**
   * GET request returning JSON
   */
  get<T>(endpoint: string, additionalHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, additionalHeaders);
  }

  /**
   * GET request returning text
   */
  getText(endpoint: string, additionalHeaders?: Record<string, string>): Promise<string> {
    return this.requestText(endpoint, { method: 'GET' }, additionalHeaders);
  }

  /**
   * POST request with JSON body
   */
  post<T>(
    endpoint: string,
    data: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      additionalHeaders
    );
  }

  /**
   * Core request handler with retry logic
   */
  private async requestWithRetries<T>(
    endpoint: string,
    options: RequestInit = {},
    additionalHeaders: Record<string, string> = {},
    responseHandler: (response: Response) => Promise<T>
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;

    const headers: Record<string, string> = {
      'X-API-Token': this.apiToken,
      'Content-Type': 'application/json',
      'User-Agent': 'MarvinClient/1.0',
      ...additionalHeaders,
    };

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await this.fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return await responseHandler(response);
        }

        // Handle HTTP errors
        const error = new MarvinError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          endpoint,
          method: requestOptions.method || 'GET',
          timestamp: Date.now(),
          retryAfterMs: this.parseRetryAfter(response.headers.get('Retry-After')) ?? undefined,
        });

        // Don't retry client errors (4xx) except 429 (rate limiting)
        if (error.isClientError() && response.status !== 429) {
          throw error;
        }

        lastError = error;

        // If this was our last attempt, throw the error
        if (attempt === this.retries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        const retryAfter = error.retryAfterMs || this.retryDelay * Math.pow(2, attempt);
        await this.delay(retryAfter);

      } catch (error) {
        if (error instanceof MarvinError) {
          lastError = error;

          // Don't retry client errors
          if (error.isClientError() && error.status !== 429) {
            throw error;
          }

          if (attempt === this.retries) {
            throw error;
          }
        } else {
          // Network errors or other issues
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt === this.retries) {
            throw lastError;
          }
        }

        // Wait before retrying
        const retryDelay = this.retryDelay * Math.pow(2, attempt);
        await this.delay(retryDelay);
      }
    }

    throw lastError || new Error('Request failed after all retry attempts');
  }
}