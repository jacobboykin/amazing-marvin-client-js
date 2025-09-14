import type { MarvinClientConfig } from './types';
import { HttpClient } from './http-client';
import { TasksApi, OrganizationApi, TimeTrackingApi } from './domains';

/**
 * Amazing Marvin API Client for non-privileged endpoints
 *
 * This client provides access to Amazing Marvin's API endpoints organized by domain.
 * It uses composition to organize functionality into logical groups while maintaining
 * backward compatibility with the existing API.
 *
 * @example
 * ```typescript
 * const client = new MarvinClient({
 *   apiToken: 'your-api-token',
 *   timeout: 10000,
 *   retries: 3
 * });
 *
 * // Access domain-specific APIs
 * const tasks = await client.tasks.getTodayItems();
 * const categories = await client.organization.getCategories();
 * const tracking = await client.timeTracking.startTracking('task-id');
 * ```
 */
export class MarvinClient {
  private readonly http: HttpClient;

  // Domain-specific API groups
  public readonly tasks: TasksApi;
  public readonly organization: OrganizationApi;
  public readonly timeTracking: TimeTrackingApi;

  constructor(config: MarvinClientConfig) {
    this.http = new HttpClient(config);

    // Initialize domain APIs
    this.tasks = new TasksApi(this.http);
    this.organization = new OrganizationApi(this.http);
    this.timeTracking = new TimeTrackingApi(this.http);
  }

  // Backward compatibility methods - delegate to domain APIs

  /**
   * Test API credentials
   * @returns Promise resolving to success message
   */
  async testCredentials(): Promise<string> {
    return this.http.getText('/test');
  }

  // Task Management (delegate to tasks domain)
  async addTask(...args: Parameters<TasksApi['addTask']>) {
    return this.tasks.addTask(...args);
  }

  async addProject(...args: Parameters<TasksApi['addProject']>) {
    return this.tasks.addProject(...args);
  }

  async markDone(...args: Parameters<TasksApi['markDone']>) {
    return this.tasks.markDone(...args);
  }

  async getTodayItems(...args: Parameters<TasksApi['getTodayItems']>) {
    return this.tasks.getTodayItems(...args);
  }

  async getDueItems(...args: Parameters<TasksApi['getDueItems']>) {
    return this.tasks.getDueItems(...args);
  }

  async getChildren(...args: Parameters<TasksApi['getChildren']>) {
    return this.tasks.getChildren(...args);
  }

  // Organization (delegate to organization domain)
  async getCategories(...args: Parameters<OrganizationApi['getCategories']>) {
    return this.organization.getCategories(...args);
  }

  async getOnlyCategories(...args: Parameters<OrganizationApi['getOnlyCategories']>) {
    return this.organization.getOnlyCategories(...args);
  }

  async getOnlyProjects(...args: Parameters<OrganizationApi['getOnlyProjects']>) {
    return this.organization.getOnlyProjects(...args);
  }

  async getLabels(...args: Parameters<OrganizationApi['getLabels']>) {
    return this.organization.getLabels(...args);
  }

  // Time Tracking (delegate to time tracking domain)
  async getTrackedItem(...args: Parameters<TimeTrackingApi['getTrackedItem']>) {
    return this.timeTracking.getTrackedItem(...args);
  }

  async startTracking(...args: Parameters<TimeTrackingApi['startTracking']>) {
    return this.timeTracking.startTracking(...args);
  }

  async stopTracking(...args: Parameters<TimeTrackingApi['stopTracking']>) {
    return this.timeTracking.stopTracking(...args);
  }

  async getTracks(...args: Parameters<TimeTrackingApi['getTracks']>) {
    return this.timeTracking.getTracks(...args);
  }

  async getTodayTimeBlocks(...args: Parameters<TimeTrackingApi['getTodayTimeBlocks']>) {
    return this.timeTracking.getTodayTimeBlocks(...args);
  }

  // Additional methods that need to be extracted can be added here
  // For now, this covers the most commonly used functionality

  /**
   * Get user profile information
   */
  async getMe() {
    return this.http.get('/me');
  }

  /**
   * Get kudos information
   */
  async getKudos() {
    return this.http.get('/kudos');
  }

  /**
   * Add an event
   */
  async addEvent(event: any) {
    return this.http.post('/addEvent', event);
  }

  /**
   * Claim reward points
   */
  async claimRewardPoints(operation: any) {
    return this.http.post('/claimRewardPoints', operation);
  }

  /**
   * Spend reward points
   */
  async spendRewardPoints(operation: any) {
    return this.http.post('/spendRewardPoints', operation);
  }

  /**
   * Unclaim reward points
   */
  async unclaimRewardPoints(operation: any) {
    return this.http.post('/unclaimRewardPoints', operation);
  }

  /**
   * Record habit
   */
  async recordHabit(habitId: string, time: number, value: number, incrementTotal: boolean) {
    return this.http.post('/habit', { habitId, time, value, incrementTotal });
  }

  /**
   * Undo habit recording
   */
  async undoHabit(habitId: string, includeHabitsInPlan: boolean) {
    return this.http.post('/undoHabit', { habitId, includeHabitsInPlan });
  }

  /**
   * Get habit information
   */
  async getHabit(habitId: string) {
    return this.http.get(`/habit/${habitId}`);
  }

  /**
   * Get all habits
   */
  async getHabits() {
    return this.http.get('/habits');
  }

  /**
   * Get goals
   */
  async getGoals() {
    return this.http.get('/goals');
  }

  /**
   * Set reminders
   */
  async setReminders(reminders: any[]) {
    return this.http.requestText('/reminder/set', {
      method: 'POST',
      body: JSON.stringify({ reminders })
    });
  }

  /**
   * Delete reminders
   */
  async deleteReminders(reminderIds: string[]) {
    return this.http.requestText('/reminder/delete', {
      method: 'POST',
      body: JSON.stringify({ reminderIds })
    });
  }

  /**
   * Rewrite habit history
   */
  async rewriteHabitHistory(habitId: string, history: number[], updateDB: boolean) {
    return this.http.post('/updateHabit', { habitId, history, updateDB });
  }
}