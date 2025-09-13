import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient } from '../client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - Integration Tests', () => {
  let client: MarvinClient;
  const mockApiToken = 'integration-test-token';
  
  beforeEach(() => {
    client = new MarvinClient({ 
      apiToken: mockApiToken,
      fetch: fetch as any
    });
    vi.clearAllMocks();
  });

  describe('Task Creation and Management Workflow', () => {
    it('should create a task, track time, and mark it done', async () => {
      // Mock sequence of API calls
      const mockTask = {
        _id: 'task123',
        title: 'Integration test task',
        done: false
      };

      const mockTrackStart = {
        startId: 'task123',
        startTimes: [1234567890000],
        stopId: null,
        stopTimes: [],
        issues: []
      };

      const mockTrackStop = {
        startId: 'task123',
        startTimes: [1234567890000],
        stopId: 'task123',
        stopTimes: [1234567890000, 1234571490000],
        issues: []
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrackStart
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrackStop
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      // Create task
      const task = await client.addTask({
        title: 'Integration test task',
        done: false
      });
      
      expect(task).toEqual(mockTask);

      // Start tracking
      const trackStart = await client.startTracking('task123');
      expect(trackStart).toEqual(mockTrackStart);

      // Stop tracking
      const trackStop = await client.stopTracking('task123');
      expect(trackStop).toEqual(mockTrackStop);

      // Mark done
      const result = await client.markDone('task123');
      expect(result).toEqual({ success: true });

      // Verify all calls were made
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Project and Task Hierarchy', () => {
    it('should create a project and add child tasks', async () => {
      const mockProject = {
        _id: 'project123',
        title: 'Test Project',
        type: 'project',
        done: false
      };

      const mockTask1 = {
        _id: 'task1',
        title: 'Task 1',
        parentId: 'project123',
        done: false
      };

      const mockTask2 = {
        _id: 'task2',
        title: 'Task 2',
        parentId: 'project123',
        done: false
      };

      const mockChildren = [mockTask1, mockTask2];

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProject
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask2
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockChildren
        });

      // Create project
      const project = await client.addProject({
        title: 'Test Project',
        done: false
      });

      // Create child tasks
      const task1 = await client.addTask({
        title: 'Task 1',
        parentId: 'project123',
        done: false
      });

      const task2 = await client.addTask({
        title: 'Task 2',
        parentId: 'project123',
        done: false
      });

      // Get children
      const children = await client.getChildren('project123');

      expect(project).toEqual(mockProject);
      expect(task1).toEqual(mockTask1);
      expect(task2).toEqual(mockTask2);
      expect(children).toEqual(mockChildren);
    });
  });

  describe('Category and Project Helper Methods', () => {
    it('should separate categories from projects using helper methods', async () => {
      const mockCategoriesAndProjects = [
        { _id: 'work', title: 'Work', parentId: 'root', color: '#4184a0' },
        { _id: 'project1', title: 'Udemy Course', parentId: 'root', type: 'project' },
        { _id: 'personal', title: 'Personal', parentId: 'root', color: '#ff6b6b' },
        { _id: 'project2', title: 'Music Project', parentId: 'root', type: 'project' }
      ];

      // Mock for getOnlyCategories (calls getCategories internally)
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoriesAndProjects
      });

      const categories = await client.getOnlyCategories();
      expect(categories).toEqual([
        { _id: 'work', title: 'Work', parentId: 'root', color: '#4184a0' },
        { _id: 'personal', title: 'Personal', parentId: 'root', color: '#ff6b6b' }
      ]);

      // Mock for getOnlyProjects (calls getCategories internally)
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoriesAndProjects
      });

      const projects = await client.getOnlyProjects();
      expect(projects).toEqual([
        { _id: 'project1', title: 'Udemy Course', parentId: 'root', type: 'project' },
        { _id: 'project2', title: 'Music Project', parentId: 'root', type: 'project' }
      ]);
    });

    it('should handle empty results for categories and projects', async () => {
      // Test with only categories
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { _id: 'work', title: 'Work', parentId: 'root', color: '#4184a0' }
        ]
      });

      const projects = await client.getOnlyProjects();
      expect(projects).toEqual([]);

      // Test with only projects
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { _id: 'project1', title: 'Project', parentId: 'root', type: 'project' }
        ]
      });

      const categories = await client.getOnlyCategories();
      expect(categories).toEqual([]);
    });
  });

  describe('Daily Planning Workflow', () => {
    it('should get categories, create tasks for today, and retrieve today\'s items', async () => {
      const mockCategories = [
        { _id: 'work', title: 'Work', parentId: 'root', color: '#4184a0' },
        { _id: 'personal', title: 'Personal', parentId: 'root', color: '#ff6b6b' }
      ];

      const mockTask1 = {
        _id: 'task1',
        title: 'Work task',
        parentId: 'work',
        day: '2024-03-15',
        done: false
      };

      const mockTask2 = {
        _id: 'task2',
        title: 'Personal task',
        parentId: 'personal',
        day: '2024-03-15',
        done: false
      };

      const mockTodayItems = [mockTask1, mockTask2];

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask2
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodayItems
        });

      // Get categories for organization
      const categories = await client.getCategories();
      expect(categories).toEqual(mockCategories);

      // Create tasks for today
      const workTask = await client.addTask({
        title: 'Work task',
        parentId: 'work',
        day: '2024-03-15',
        done: false
      });

      const personalTask = await client.addTask({
        title: 'Personal task',
        parentId: 'personal',
        day: '2024-03-15',
        done: false
      });

      // Get today's items
      const todayItems = await client.getTodayItems('2024-03-15');

      expect(workTask).toEqual(mockTask1);
      expect(personalTask).toEqual(mockTask2);
      expect(todayItems).toEqual(mockTodayItems);
    });
  });

  describe('Label and Organization System', () => {
    it('should get labels and create tasks with labels', async () => {
      const mockLabels = [
        { _id: 'urgent', title: 'Urgent', color: '#ff0000', icon: 'alert' },
        { _id: 'quick', title: 'Quick', color: '#00ff00', icon: 'clock' }
      ];

      const mockTask = {
        _id: 'task123',
        title: 'Urgent quick task',
        labelIds: ['urgent', 'quick'],
        done: false
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLabels
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask
        });

      // Get available labels
      const labels = await client.getLabels();
      expect(labels).toEqual(mockLabels);

      // Create task with labels
      const task = await client.addTask({
        title: 'Urgent quick task',
        labelIds: ['urgent', 'quick'],
        done: false
      });

      expect(task).toEqual(mockTask);
    });
  });

  describe('Habit Tracking Workflow', () => {
    it('should record habits, get habit info, and undo recordings', async () => {
      const mockHabit = {
        _id: 'habit123',
        title: 'Drink water',
        period: 'day',
        target: 8,
        isPositive: true,
        recordType: 'number'
      };

      const mockRecordResponse = { success: true, newValue: 4 };
      const mockUndoResponse = { success: true, newValue: 3 };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHabit
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRecordResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUndoResponse
        });

      // Get habit info
      const habit = await client.getHabit('habit123');
      expect(habit).toEqual(mockHabit);

      // Record habit
      const recordResult = await client.recordHabit('habit123', Date.now(), 4, true);
      expect(recordResult).toEqual(mockRecordResponse);

      // Undo habit recording
      const undoResult = await client.undoHabit('habit123', true);
      expect(undoResult).toEqual(mockUndoResponse);
    });
  });

  describe('Reminder Management', () => {
    it('should set and delete reminders', async () => {
      const reminders = [{
        time: 1678098457794,
        offset: 5,
        reminderId: 'reminder123',
        type: 'M' as const,
        title: 'Test reminder',
        snooze: 9,
        autoSnooze: true,
        canTrack: false
      }];

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK'
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK'
        });

      // Set reminders
      const setResult = await client.setReminders(reminders);
      expect(setResult).toBe('OK');

      // Delete reminders
      const deleteResult = await client.deleteReminders(['reminder123']);
      expect(deleteResult).toBe('OK');
    });
  });

  describe('Reward Points System', () => {
    it('should claim, spend, and unclaim reward points', async () => {
      const mockProfile = {
        userId: '123',
        email: 'test@example.com',
        rewardPointsEarned: 10,
        rewardPointsSpent: 5
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockProfile, rewardPointsEarned: 12.5 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockProfile, rewardPointsSpent: 7.5 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockProfile, rewardPointsEarned: 10 })
        });

      // Claim points
      const claimResult = await client.claimRewardPoints({
        points: 2.5,
        itemId: 'task123',
        date: '2024-03-15',
        op: 'CLAIM'
      });
      expect(claimResult.rewardPointsEarned).toBe(12.5);

      // Spend points
      const spendResult = await client.spendRewardPoints({
        points: 2.5,
        date: '2024-03-15',
        op: 'SPEND'
      });
      expect(spendResult.rewardPointsSpent).toBe(7.5);

      // Unclaim points
      const unclaimResult = await client.unclaimRewardPoints({
        itemId: 'task123',
        date: '2024-03-15',
        op: 'UNCLAIM'
      });
      expect(unclaimResult.rewardPointsEarned).toBe(10);
    });
  });

  describe('Time Block Planning', () => {
    it('should get time blocks and create events', async () => {
      const mockTimeBlocks = [{
        _id: 'block1',
        title: 'Morning Focus',
        date: '2024-03-15',
        time: '09:00',
        duration: '120'
      }];

      const mockEvent = {
        _id: 'event123',
        title: 'Lunch meeting',
        start: '2024-03-15T12:00:00.000Z',
        length: 3600000
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTimeBlocks
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent
        });

      // Get time blocks for planning
      const timeBlocks = await client.getTodayTimeBlocks('2024-03-15');
      expect(timeBlocks).toEqual(mockTimeBlocks);

      // Create event
      const event = await client.addEvent({
        title: 'Lunch meeting',
        start: '2024-03-15T12:00:00.000Z',
        length: 3600000
      });
      expect(event).toEqual(mockEvent);
    });
  });
});