import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarvinClient } from '../marvin-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MarvinClient - User Workflows', () => {
  let client: MarvinClient;
  const mockApiToken = 'workflow-test-token';
  
  beforeEach(() => {
    client = new MarvinClient({ 
      apiToken: mockApiToken,
      fetch: fetch as any
    });
    vi.clearAllMocks();
  });

  describe('Morning Planning Workflow', () => {
    it('should handle complete morning planning routine', async () => {
      // Mock data
      const mockCategories = [
        { _id: 'work', title: 'Work', parentId: 'root', color: '#4184a0' },
        { _id: 'personal', title: 'Personal', parentId: 'root', color: '#ff6b6b' },
        { _id: 'health', title: 'Health', parentId: 'root', color: '#51cf66' }
      ];

      const mockLabels = [
        { _id: 'urgent', title: 'Urgent', color: '#ff0000', icon: 'alert' },
        { _id: 'quick', title: 'Quick (< 15 min)', color: '#00ff00', icon: 'clock' },
        { _id: 'energy-high', title: 'High Energy', color: '#ffd43b', icon: 'battery' }
      ];

      const mockHabits = [
        {
          _id: 'water',
          title: 'Drink Water',
          period: 'day' as const,
          target: 8,
          units: 'glasses',
          isPositive: true,
          recordType: 'number' as const,
          history: [0]
        },
        {
          _id: 'exercise',
          title: 'Exercise',
          period: 'day' as const,
          target: 1,
          isPositive: true,
          recordType: 'boolean' as const,
          history: [0]
        }
      ];

      const mockTodayItems = [
        {
          _id: 'task1',
          title: 'Review project proposals',
          done: false,
          parentId: 'work',
          day: '2024-03-15'
        }
      ];

      const mockTimeBlocks = [
        {
          _id: 'block1',
          title: 'Deep Work Block',
          date: '2024-03-15',
          time: '09:00',
          duration: '120'
        }
      ];

      // Mock API calls in sequence
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCategories })  // getCategories
        .mockResolvedValueOnce({ ok: true, json: async () => mockLabels })      // getLabels
        .mockResolvedValueOnce({ ok: true, json: async () => mockHabits })      // getHabits
        .mockResolvedValueOnce({ ok: true, json: async () => mockTodayItems })  // getTodayItems
        .mockResolvedValueOnce({ ok: true, json: async () => mockTimeBlocks }); // getTodayTimeBlocks

      // Execute morning planning workflow
      const [categories, labels, habits, todayItems, timeBlocks] = await Promise.all([
        client.getCategories(),
        client.getLabels(),
        client.getHabits(),
        client.getTodayItems('2024-03-15'),
        client.getTodayTimeBlocks('2024-03-15')
      ]);

      // Verify results
      expect(categories).toEqual(mockCategories);
      expect(labels).toEqual(mockLabels);
      expect(habits).toEqual(mockHabits);
      expect(todayItems).toEqual(mockTodayItems);
      expect(timeBlocks).toEqual(mockTimeBlocks);
      expect(fetch).toHaveBeenCalledTimes(5);

      // Verify organizational structure is available
      const workCategory = categories.find(c => c.title === 'Work');
      const urgentLabel = labels.find(l => l.title === 'Urgent');
      const waterHabit = habits.find(h => h.title === 'Drink Water');

      expect(workCategory).toBeDefined();
      expect(urgentLabel).toBeDefined();
      expect(waterHabit).toBeDefined();
    });
  });

  describe('Task Creation and Execution Workflow', () => {
    it('should create task, start tracking, complete, and claim rewards', async () => {
      const date = '2024-03-15';
      const taskData = {
        title: 'Complete important presentation',
        done: false,
        parentId: 'work-project',
        labelIds: ['urgent', 'high-energy'],
        timeEstimate: 7200000, // 2 hours
        day: date
      };

      const mockTask = { _id: 'task123', ...taskData };
      const mockTrackStart = {
        startId: 'task123',
        startTimes: [1710500400000], // Mock timestamp
        stopId: null,
        stopTimes: [],
        issues: []
      };
      const mockTrackStop = {
        startId: 'task123',
        startTimes: [1710500400000],
        stopId: 'task123',
        stopTimes: [1710500400000, 1710507600000], // 2 hours later
        issues: []
      };
      const mockProfile = {
        userId: 'user123',
        email: 'test@example.com',
        rewardPointsEarned: 12.5,
        rewardPointsSpent: 5.0
      };

      // Mock API calls in sequence
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTask })                    // addTask
        .mockResolvedValueOnce({ ok: true, json: async () => mockTrackStart })             // startTracking
        .mockResolvedValueOnce({ ok: true, json: async () => mockTrackStop })              // stopTracking
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })       // markDone
        .mockResolvedValueOnce({ ok: true, json: async () => mockProfile });              // claimRewardPoints

      // Execute workflow
      const task = await client.addTask(taskData);
      expect(task).toEqual(mockTask);

      const trackStart = await client.startTracking(task._id);
      expect(trackStart.startId).toBe(task._id);

      // Simulate work time
      await new Promise(resolve => setTimeout(resolve, 10));

      const trackStop = await client.stopTracking(task._id);
      expect(trackStop.stopId).toBe(task._id);

      const completion = await client.markDone(task._id, -480); // PST timezone
      expect(completion.success).toBe(true);

      const profile = await client.claimRewardPoints({
        points: 3.0,
        itemId: task._id,
        date,
        op: 'CLAIM'
      });
      expect(profile.rewardPointsEarned).toBe(12.5);

      expect(fetch).toHaveBeenCalledTimes(5);
    });
  });

  describe('Project Management Workflow', () => {
    it('should create project hierarchy with tasks', async () => {
      // Mock project creation
      const projectData = {
        title: 'Website Redesign',
        done: false,
        priority: 'high' as const,
        dueDate: '2024-04-01'
      };
      const mockProject = { _id: 'project123', type: 'project', ...projectData };

      // Mock child tasks
      const task1Data = {
        title: 'Design wireframes',
        done: false,
        parentId: 'project123',
        labelIds: ['design'],
        timeEstimate: 14400000 // 4 hours
      };
      const task2Data = {
        title: 'Implement frontend',
        done: false,
        parentId: 'project123',
        labelIds: ['coding'],
        timeEstimate: 28800000 // 8 hours
      };
      
      const mockTask1 = { _id: 'task1', ...task1Data };
      const mockTask2 = { _id: 'task2', ...task2Data };
      const mockChildren = [mockTask1, mockTask2];

      // Mock API responses
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockProject })    // addProject
        .mockResolvedValueOnce({ ok: true, json: async () => mockTask1 })      // addTask 1
        .mockResolvedValueOnce({ ok: true, json: async () => mockTask2 })      // addTask 2
        .mockResolvedValueOnce({ ok: true, json: async () => mockChildren });  // getChildren

      // Execute workflow
      const project = await client.addProject(projectData);
      expect(project._id).toBe('project123');

      const task1 = await client.addTask(task1Data);
      const task2 = await client.addTask(task2Data);
      
      expect(task1.parentId).toBe('project123');
      expect(task2.parentId).toBe('project123');

      const children = await client.getChildren('project123');
      expect(children).toHaveLength(2);
      expect(children).toEqual(mockChildren);

      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Habit Tracking Workflow', () => {
    it('should record multiple habits throughout the day', async () => {

      const mockResponses = [
        { success: true, newValue: 3 },   // water: 3 glasses
        { success: true, newValue: 5000 }, // steps: 5000 steps
        { success: true, newValue: 1 },   // meditation: completed
        { success: true, newValue: 5 },   // water: 5 glasses total
        { success: true, newValue: 8500 }, // steps: 8500 steps total
      ];

      // Mock API responses for habit recordings
      mockResponses.forEach((response) => {
        (fetch as any).mockResolvedValueOnce({ 
          ok: true, 
          json: async () => response 
        });
      });

      // Execute habit tracking throughout the day
      const results = [];

      // Morning habits
      results.push(await client.recordHabit('water', Date.now(), 3, true));
      results.push(await client.recordHabit('steps', Date.now(), 5000, true));
      results.push(await client.recordHabit('meditation', Date.now(), 1, true));

      // Afternoon updates
      results.push(await client.recordHabit('water', Date.now(), 2, true)); // +2 more glasses
      results.push(await client.recordHabit('steps', Date.now(), 3500, true)); // +3500 more steps

      expect(results).toEqual(mockResponses);
      expect(fetch).toHaveBeenCalledTimes(5);

      // Verify habit progress
      expect(results[0]!.newValue).toBe(3); // 3 glasses of water
      expect(results[3]!.newValue).toBe(5); // 5 glasses total
      expect(results[4]!.newValue).toBe(8500); // 8500 steps total
    });

    it('should handle habit correction with undo', async () => {
      const mockRecordResponse = { success: true, newValue: 4 };
      const mockUndoResponse = { success: true, newValue: 3 };
      const mockCorrectResponse = { success: true, newValue: 2 };

      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRecordResponse })  // Record wrong value
        .mockResolvedValueOnce({ ok: true, json: async () => mockUndoResponse })    // Undo
        .mockResolvedValueOnce({ ok: true, json: async () => mockCorrectResponse }); // Correct value

      // Record incorrect value
      const recorded = await client.recordHabit('water', Date.now(), 4, true);
      expect(recorded.newValue).toBe(4);

      // Undo the incorrect recording
      const undone = await client.undoHabit('water', true);
      expect(undone.newValue).toBe(3);

      // Record correct value
      const corrected = await client.recordHabit('water', Date.now(), 2, true);
      expect(corrected.newValue).toBe(2);

      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event and Time Management Workflow', () => {
    it('should plan day with time blocks and events', async () => {
      mocker
        .queueResponse([{ _id: 'block1', title: 'Deep Work', time: '09:00' }])  // time blocks
        .queueResponse({ _id: 'event123', title: 'Team Standup' })  // add event
        .queueResponse([{ _id: 'task1', title: 'Code review', done: false }]);  // today items

      mocker.setup();

      // Execute: Day planning workflow
      const timeBlocks = await client.getTodayTimeBlocks('2024-03-15');
      const event = await client.addEvent({
        title: 'Team Standup',
        start: '2024-03-15T14:00:00.000Z',
        length: 1800000
      });
      const todayItems = await client.getTodayItems('2024-03-15');

      // Verify: Day structure created
      expect(timeBlocks[0].title).toBe('Deep Work');
      expect(event.title).toBe('Team Standup');
      expect(todayItems[0].title).toBe('Code review');
    });
  });

  describe('Weekly Review Workflow', () => {
    it('should gather weekly review data', async () => {
      mocker
        .queueResponse({ rewardPointsEarned: 25.5, marvinPoints: 150 })  // profile
        .queueResponse({ level: 3, kudos: 42 })  // kudos
        .queueResponse([{ _id: 'goal1', title: 'Complete Q1', status: 'active' }])  // goals
        .queueResponse([{ _id: 'water', title: 'Water', target: 8, history: [8, 6, 7, 8, 5] }]);  // habits

      mocker.setup();

      // Execute: Weekly review data gathering
      const [profile, kudos, goals, habits] = await Promise.all([
        client.getMe(),
        client.getKudos(),
        client.getGoals(),
        client.getHabits()
      ]);

      // Verify: Review data available
      expect(profile.rewardPointsEarned).toBe(25.5);
      expect(kudos.level).toBe(3);
      expect(goals[0].status).toBe('active');
      expect(habits[0].history).toHaveLength(5);

      // Calculate insights from data
      const weeklyAvg = habits[0].history.reduce((sum, day) => sum + day, 0) / 5;
      expect(weeklyAvg).toBe(6.8);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle partial failures gracefully', async () => {
      const tasks = [
        { title: 'Task 1', done: false },
        { title: 'Task 2', done: false }, 
        { title: 'Task 3', done: false }
      ];

      // Mock: success, failure, success
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: 'task1', ...tasks[0] })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: 'task3', ...tasks[2] })
        });

      // Execute with error handling
      const results = await Promise.allSettled([
        client.addTask(tasks[0]!),
        client.addTask(tasks[1]!),
        client.addTask(tasks[2]!)
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled') {
        expect(results[0].value._id).toBe('task1');
      }
      
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toContain('422');
      }

      if (results[2].status === 'fulfilled') {
        expect(results[2].value._id).toBe('task3');
      }

      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  afterEach(() => {
    mocker.reset();
  });
});
