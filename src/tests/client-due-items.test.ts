import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient } from '../marvin-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - Due Items and Habit Management', () => {
  let client: MarvinClient;
  const mockApiToken = 'extra-coverage-token';

  beforeEach(() => {
    client = new MarvinClient({ 
      apiToken: mockApiToken,
      fetch: fetch as any,
    });
    vi.clearAllMocks();
  });

  describe('Due Items Management', () => {
    it('should retrieve all due items when no filter specified', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      const result = await client.getDueItems();
      expect(result).toEqual([]);
    });

    it('should filter due items by timeframe', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ _id: '1', title: 'Due Task', done: false }]),
      });

      const result = await client.getDueItems('today');
      expect(result).toEqual([{ _id: '1', title: 'Due Task', done: false }]);
    });
  });

  describe('Habit History Management', () => {
    it('should update complete habit tracking history', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const habitId = 'habit-123';
      const history = [1, 0, 2, 3, 0];
      const result = await client.rewriteHabitHistory(habitId, history, true);

      expect(result).toEqual({ success: true });
    });
  });
});

