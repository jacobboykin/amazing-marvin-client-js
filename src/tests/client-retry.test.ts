import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient } from '../marvin-client';
import { MarvinError } from '../errors';

// Mock helper for cleaner test setup
class MockResponse {
  static success(data: any = {}) {
    return {
      ok: true,
      json: async () => data,
      text: async () => typeof data === 'string' ? data : 'OK'
    };
  }

  static serverError(status = 500, statusText = 'Internal Server Error') {
    return { ok: false, status, statusText };
  }

  static clientError(status = 400, statusText = 'Bad Request') {
    return { ok: false, status, statusText };
  }
}

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - Service Resilience', () => {
  let client: MarvinClient;
  const mockApiToken = 'retry-test-token';
  
  beforeEach(() => {
    client = new MarvinClient({ 
      apiToken: mockApiToken,
      fetch: fetch as any,
      retries: 3,
      retryDelay: 100 // Short delay for testing
    });
    vi.clearAllMocks();
  });

  describe('Retry Behavior', () => {
    it('should recover from temporary server errors', async () => {
      // Focus on business outcome: recovery after failure
      (fetch as any)
        .mockResolvedValueOnce(MockResponse.serverError())
        .mockResolvedValueOnce(MockResponse.success({ success: true }));

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
    });

    it('should recover from service unavailable', async () => {
      (fetch as any)
        .mockResolvedValueOnce(MockResponse.serverError(503, 'Service Unavailable'))
        .mockResolvedValueOnce(MockResponse.success({ success: true }));

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
    });

    it('should recover from rate limiting', async () => {
      (fetch as any)
        .mockResolvedValueOnce(MockResponse.clientError(429, 'Too Many Requests'))
        .mockResolvedValueOnce(MockResponse.success({ success: true }));

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
    });

    it('should recover from network errors', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(MockResponse.success({ success: true }));

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
    });

    it('should fail immediately on client errors', async () => {
      (fetch as any).mockResolvedValueOnce(MockResponse.clientError());

      await expect(client.addTask({ title: '', done: false }))
        .rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should fail immediately on unauthorized', async () => {
      (fetch as any).mockResolvedValueOnce(
        MockResponse.clientError(401, 'Unauthorized')
      );

      await expect(client.testCredentials())
        .rejects.toThrow('HTTP 401: Unauthorized');
    });

    it('should fail immediately on not found', async () => {
      (fetch as any).mockResolvedValueOnce(
        MockResponse.clientError(404, 'Not Found')
      );

      await expect(client.getHabit('nonexistent'))
        .rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('Retry Exhaustion', () => {
    it('should fail after persistent server errors', async () => {
      // Focus on business outcome: persistent failure should throw
      (fetch as any).mockImplementation(() => MockResponse.serverError());

      await expect(client.getTodayItems())
        .rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle multiple failure scenarios', async () => {
      // Test different types of failures
      (fetch as any)
        .mockResolvedValueOnce(MockResponse.serverError())
        .mockResolvedValueOnce(MockResponse.serverError(503, 'Service Unavailable'))
        .mockResolvedValueOnce(MockResponse.success([]));

      const result = await client.getTodayItems();
      expect(result).toEqual([]);
    });
  });

  describe('Text Request Retry Logic', () => {
    it('should recover from server errors for text endpoints', async () => {
      (fetch as any)
        .mockResolvedValueOnce(MockResponse.serverError())
        .mockResolvedValueOnce(MockResponse.success('OK'));

      const result = await client.testCredentials();
      expect(result).toBe('OK');
    });

    it('should fail immediately on client errors for text endpoints', async () => {
      (fetch as any).mockResolvedValueOnce(
        MockResponse.clientError(401, 'Unauthorized')
      );

      await expect(client.testCredentials())
        .rejects.toThrow('HTTP 401: Unauthorized');
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should respect no-retry configuration', async () => {
      const noRetryClient = new MarvinClient({
        apiToken: mockApiToken,
        fetch: vi.fn().mockResolvedValue(MockResponse.serverError()) as any,
        retries: 0
      });

      await expect(noRetryClient.getTodayItems())
        .rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should work with custom retry configuration', async () => {
      const customClient = new MarvinClient({
        apiToken: mockApiToken,
        fetch: fetch as any,
        retries: 1,
        retryDelay: 1
      });

      (fetch as any)
        .mockResolvedValueOnce(MockResponse.serverError())
        .mockResolvedValueOnce(MockResponse.success({ success: true }));

      const result = await customClient.getTodayItems();
      expect(result).toEqual({ success: true });
    });
  });

  describe('Error Type Handling', () => {
    it('should handle MarvinError correctly in retry logic', async () => {
      const customError = new MarvinError({
        message: 'Custom server error',
        status: 502,
        statusText: 'Bad Gateway',
        endpoint: '/test',
        method: 'GET',
        timestamp: Date.now()
      });

      (fetch as any)
        .mockRejectedValueOnce(customError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle non-MarvinError exceptions in retry logic', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new TypeError('Unexpected error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
