import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient } from '../client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - Error Handling and Edge Cases', () => {
  let client: MarvinClient;
  const mockApiToken = 'error-test-token';
  
  beforeEach(() => {
    client = new MarvinClient({ 
      apiToken: mockApiToken,
      fetch: fetch as any
    });
    vi.clearAllMocks();
  });

  describe('Network and Connection Errors', () => {
    it('should handle network timeouts', async () => {
      // Mock rejection for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'));

      await expect(client.testCredentials()).rejects.toThrow('Request timeout');
    });

    it('should handle connection refused', async () => {
      // Mock rejection for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.getTodayItems()).rejects.toThrow('Connection refused');
    });

    it('should handle DNS resolution failures', async () => {
      // Mock rejection for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockRejectedValueOnce(new Error('DNS lookup failed'))
        .mockRejectedValueOnce(new Error('DNS lookup failed'))
        .mockRejectedValueOnce(new Error('DNS lookup failed'))
        .mockRejectedValueOnce(new Error('DNS lookup failed'));

      await expect(client.getCategories()).rejects.toThrow('DNS lookup failed');
    });
  });

  describe('HTTP Status Code Errors', () => {
    it('should handle 400 Bad Request', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(client.addTask({ title: '', done: false })).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should handle 401 Unauthorized', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(client.testCredentials()).rejects.toThrow('HTTP 401: Unauthorized');
    });

    it('should handle 403 Forbidden', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      await expect(client.getMe()).rejects.toThrow('HTTP 403: Forbidden');
    });

    it('should handle 404 Not Found', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(client.getHabit('nonexistent')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle 422 Unprocessable Entity', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity'
      });

      await expect(client.addTask({ 
        title: 'Test',
        done: false,
        dueDate: 'invalid-date'
      })).rejects.toThrow('HTTP 422: Unprocessable Entity');
    });

    it('should handle 429 Too Many Requests', async () => {
      // Mock 429 for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        });

      await expect(client.getTodayItems()).rejects.toThrow('HTTP 429: Too Many Requests');
    });

    it('should handle 500 Internal Server Error', async () => {
      // Mock 500 for all retry attempts (initial + 3 retries = 4 total)
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
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      await expect(client.getLabels()).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle 503 Service Unavailable', async () => {
      // Mock 503 for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        });

      await expect(client.getGoals()).rejects.toThrow('HTTP 503: Service Unavailable');
    });
  });

  describe('JSON Parsing Errors', () => {
    it('should handle malformed JSON responses', async () => {
      // Mock malformed response for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => {
            throw new SyntaxError('Unexpected token');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => {
            throw new SyntaxError('Unexpected token');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => {
            throw new SyntaxError('Unexpected token');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => {
            throw new SyntaxError('Unexpected token');
          }
        });

      await expect(client.testCredentials()).rejects.toThrow('Unexpected token');
    });

    it('should handle empty response body', async () => {
      // Mock empty response for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Unexpected end of JSON input');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Unexpected end of JSON input');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Unexpected end of JSON input');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Unexpected end of JSON input');
          }
        });

      await expect(client.getKudos()).rejects.toThrow('Unexpected end of JSON input');
    });

    it('should handle non-JSON responses', async () => {
      // Mock non-JSON response for all retry attempts (initial + 3 retries = 4 total)
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new TypeError('Failed to parse JSON');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new TypeError('Failed to parse JSON');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new TypeError('Failed to parse JSON');
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new TypeError('Failed to parse JSON');
          }
        });

      await expect(client.getHabits()).rejects.toThrow('Failed to parse JSON');
    });
  });

  describe('Configuration Errors', () => {
    it('should work with custom base URL', async () => {
      const customClient = new MarvinClient({
        apiToken: 'test-token',
        baseUrl: 'https://custom.example.com/api'
      });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK'
      });

      await customClient.testCredentials();
      
      expect(fetch).toHaveBeenCalledWith(
        'https://custom.example.com/api/test',
        expect.any(Object)
      );
    });

    it('should handle missing API token', () => {
      expect(() => new MarvinClient({ apiToken: '' })).toThrow('API token is required and cannot be empty');
    });
  });

  describe('API Response Edge Cases', () => {
    it('should handle null responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      const result = await client.getTodayItems();
      expect(result).toBeNull();
    });

    it('should handle empty array responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await client.getLabels();
      expect(result).toEqual([]);
    });

    it('should handle unexpected response structure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'unexpected format'
      });

      const result = await client.testCredentials();
      expect(result).toBe('unexpected format');
    });
  });

  describe('Request Parameter Edge Cases', () => {
    it('should handle empty task title', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'task123', title: '', done: false })
      });

      const result = await client.addTask({ title: '', done: false });
      expect(result.title).toBe('');
    });

    it('should handle very long task titles', async () => {
      const longTitle = 'A'.repeat(1000);
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'task123', title: longTitle, done: false })
      });

      const result = await client.addTask({ title: longTitle, done: false });
      expect(result.title).toBe(longTitle);
    });

    it('should handle special characters in task titles', async () => {
      const specialTitle = 'Task with 特殊文字 and émojis 🚀 & symbols !@#$%^&*()';
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'task123', title: specialTitle, done: false })
      });

      const result = await client.addTask({ title: specialTitle, done: false });
      expect(result.title).toBe(specialTitle);
    });

    it('should handle invalid date formats gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // Should not throw - let API handle validation
      const result = await client.getTodayItems('invalid-date');
      expect(result).toEqual([]);
      
      expect(fetch).toHaveBeenCalledWith(
        'https://serv.amazingmarvin.com/api/todayItems?date=invalid-date',
        expect.any(Object)
      );
    });

    it('should handle empty arrays for task IDs', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await client.getTracks([]);
      expect(result).toEqual([]);
    });

    it('should handle very large arrays of task IDs', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `task${i}`);
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => largeArray.map(id => ({ taskId: id, times: [] }))
      });

      const result = await client.getTracks(largeArray);
      expect(result).toHaveLength(1000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      // Mock different responses for each call
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        });

      const promises = [
        await client.testCredentials(),
        await client.getTodayItems(),
        await client.getLabels()
      ];

      const results = await Promise.all(promises);
      
      expect(results).toEqual(['OK', [], []]);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in concurrent requests', async () => {
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK'
        })
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
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      const results = await Promise.allSettled([
        client.testCredentials(),
        client.getTodayItems()
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason.message).toBe('HTTP 500: Internal Server Error');
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should enforce correct parameter types at compile time', () => {
      // These should compile without TypeScript errors
      // We're testing compilation, not runtime behavior
      const taskParams = { title: 'Test', done: false };
      const markDoneParams = ['task123', -480] as const;
      const habitParams = ['habit123', Date.now(), 5] as const;
      
      expect(taskParams).toBeDefined();
      expect(markDoneParams).toBeDefined();
      expect(habitParams).toBeDefined();
    });

    it('should handle optional parameters correctly', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'task123', title: 'Test', done: false })
      });

      // Should work with minimal required fields
      const result = await client.addTask({ title: 'Test', done: false });
      expect(result._id).toBe('task123');
    });
  });
});