import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient } from '../client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - Additional Coverage', () => {
  let client: MarvinClient;
  const mockApiToken = 'extra-coverage-token';

  beforeEach(() => {
    client = new MarvinClient({ 
      apiToken: mockApiToken,
      fetch: fetch as any,
    });
    vi.clearAllMocks();
  });

  describe('getDueItems', () => {
    it('should fetch due items without filter', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      const result = await client.getDueItems();
      expect(result).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://serv.amazingmarvin.com/api/dueItems',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'X-API-Token': mockApiToken })
        })
      );
    });

    it('should fetch due items with filter', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ _id: '1', title: 'Due Task', done: false }]),
      });

      const result = await client.getDueItems('today');
      expect(result).toEqual([{ _id: '1', title: 'Due Task', done: false }]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://serv.amazingmarvin.com/api/dueItems?by=today',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('rewriteHabitHistory', () => {
    it('should send complete habit history update', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const habitId = 'habit-123';
      const history = [1, 0, 2, 3, 0];
      const res = await client.rewriteHabitHistory(habitId, history, true);
      expect(res).toEqual({ success: true });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (fetch as any).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://serv.amazingmarvin.com/api/updateHabit');
      expect(init?.method).toBe('POST');
      const body = init?.body as string;
      expect(body).toBeDefined();
      const parsed = JSON.parse(body!);
      expect(parsed).toEqual({ habitId, history, updateDB: true });
    });
  });
});

