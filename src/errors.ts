import type { MarvinApiError } from './types';

/**
 * Custom error class for Marvin API errors
 */
export class MarvinError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly endpoint: string;
  public readonly method: string;
  public readonly timestamp: number;
  public readonly retryAfterMs?: number;

  constructor(error: MarvinApiError) {
    super(error.message);
    this.name = 'MarvinError';
    this.status = error.status;
    this.statusText = error.statusText;
    this.endpoint = error.endpoint;
    this.method = error.method;
    this.timestamp = error.timestamp;
    if (error.retryAfterMs !== undefined) {
      this.retryAfterMs = error.retryAfterMs;
    }
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error might be retryable (5xx or network issues)
   */
  isRetryable(): boolean {
    return this.isServerError() || this.status === 0;
  }
}