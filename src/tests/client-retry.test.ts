import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient, MarvinError } from '../client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - Retry Logic', () => {
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
    it('should retry on 500 server errors with exponential backoff', async () => {
      // Mock: fail twice with 500, then succeed
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const startTime = Date.now();
      const result = await client.getTodayItems();
      const endTime = Date.now();

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(3);
      
      // Should have delays: 100ms (2^0 * 100) + 200ms (2^1 * 100) = ~300ms minimum
      expect(endTime - startTime).toBeGreaterThan(290);
    });

    it('should retry on 503 service unavailable', async () => {
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limiting', async () => {
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors (status 0)', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await client.getTodayItems();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 400 client errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(client.addTask({ title: '', done: false }))
        .rejects.toThrow('HTTP 400: Bad Request');
      
      expect(fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should NOT retry on 401 unauthorized', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(client.testCredentials())
        .rejects.toThrow('HTTP 401: Unauthorized');
      
      expect(fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should NOT retry on 404 not found', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(client.getHabit('nonexistent'))
        .rejects.toThrow('HTTP 404: Not Found');
      
      expect(fetch).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('Retry Exhaustion', () => {
    it('should throw after exhausting all retries', async () => {
      // Mock: always return 500
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.getTodayItems())
        .rejects.toThrow('HTTP 500: Internal Server Error');
      
      // Should try initial + 3 retries = 4 total attempts
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('should use exponential backoff correctly', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout to track delays
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        if (delay !== client['timeout']) { // Only track retry delays, not timeout delays
          delays.push(delay);
        }
        return originalSetTimeout(callback, 0); // Execute immediately for test speed
      }) as any;

      // Mock: always return 500
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.getTodayItems()).rejects.toThrow();
      
      // Should have delays: 100 (2^0 * 100), 200 (2^1 * 100), 400 (2^2 * 100)
      expect(delays).toEqual([100, 200, 400]);
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Text Request Retry Logic', () => {
    it('should retry text requests on server errors', async () => {
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK'
        });

      const result = await client.testCredentials();
      expect(result).toBe('OK');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry text requests on client errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(client.testCredentials())
        .rejects.toThrow('HTTP 401: Unauthorized');
      
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should work with zero retries', async () => {
      // Create a fresh mock for this test
      const mockFetch = vi.fn();
      const noRetryClient = new MarvinClient({
        apiToken: mockApiToken,
        fetch: mockFetch as any,
        retries: 0
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(noRetryClient.getTodayItems())
        .rejects.toThrow();
      
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should work with very small retry delay', async () => {
      const fastRetryClient = new MarvinClient({
        apiToken: mockApiToken,
        fetch: fetch as any,
        retries: 1,
        retryDelay: 1 // 1ms
      });

      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await fastRetryClient.getTodayItems();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
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
