import type {
  MarvinClientConfig,
  MarvinApiError,
  Task,
  Project,
  Event,
  Category,
  Label,
  TimeBlock,
  Goal,
  Habit,
  Reminder,
  Profile,
  KudosInfo,
  TrackResponse,
  TrackInfo,
  AddTaskRequest,
  AddProjectRequest,
  AddEventRequest,
  MarkDoneRequest,
  TrackRequest,
  TracksRequest,
  UpdateHabitRequest,
  SetRemindersRequest,
  DeleteRemindersRequest,
  RewardPointsOperation
} from './types';

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

/**
 * Amazing Marvin API Client for non-privileged endpoints
 * 
 * This client provides access to Amazing Marvin's API endpoints that use
 * the limited access API token (X-API-Token) rather than full access token.
 * 
 * @example
 * ```typescript
 * const client = new MarvinClient({
 *   apiToken: 'your-api-token',
 *   timeout: 10000,
 *   retries: 3
 * });
 * 
 * const tasks = await client.getTodayItems();
 * ```
 */
export class MarvinClient {
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
    this.timeout = config.timeout ?? 10000;
    this.retries = config.retries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
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

  /**
   * Delay execution for the specified number of milliseconds
   * Used for implementing exponential backoff in retry logic
   * @param ms - Number of milliseconds to delay
   * @returns Promise that resolves after the specified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse Retry-After header value to milliseconds (seconds or HTTP-date)
   */
  private parseRetryAfter(value: string | null): number | null {
    if (!value) return null;
    const secs = Number(value);
    if (!Number.isNaN(secs)) return Math.max(0, Math.floor(secs * 1000));
    const dateMs = new Date(value).getTime();
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
    return null;
  }

  /**
   * Make an authenticated HTTP request to the Marvin API with retry logic
   * @param endpoint - The API endpoint to call
   * @param options - Fetch options
   * @param additionalHeaders - Additional headers to include
   * @returns Promise resolving to the parsed response
   * @throws {MarvinError} When the request fails after all retries
   */
  private async request<T>(
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
   * Make a GET request with retry logic and proper error handling
   * @param endpoint - The API endpoint to call
   * @param additionalHeaders - Optional additional headers to include
   * @returns Promise resolving to the parsed JSON response
   * @throws {MarvinError} When the request fails after all retries
   */
  private get<T>(endpoint: string, additionalHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, additionalHeaders);
  }

  /**
   * Make a POST request with retry logic and proper error handling
   * @param endpoint - The API endpoint to call
   * @param body - Optional request body to be JSON stringified
   * @param additionalHeaders - Optional additional headers to include
   * @returns Promise resolving to the parsed JSON response
   * @throws {MarvinError} When the request fails after all retries
   */
  private post<T>(
    endpoint: string, 
    body?: unknown, 
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const options: RequestInit = {
      method: 'POST',
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    return this.request<T>(endpoint, options, additionalHeaders);
  }

  // Authentication
  /**
   * Make a request expecting plain text response with retry logic
   * @param endpoint - The API endpoint to call
   * @param options - Fetch options
   * @param additionalHeaders - Additional headers to include
   * @returns Promise resolving to the text response
   * @throws {MarvinError} When the request fails after all retries
   */
  private async requestText(
    endpoint: string,
    options: RequestInit = {},
    additionalHeaders: Record<string, string> = {}
  ): Promise<string> {
    return this.requestWithRetries<string>(endpoint, options, additionalHeaders, async (response) => {
      return await response.text();
    });
  }

  /**
   * Core retry wrapper to reduce duplication between JSON/text requests
   */
  private async requestWithRetries<T>(
    endpoint: string,
    options: RequestInit,
    additionalHeaders: Record<string, string>,
    parser: (response: Response) => Promise<T>
  ): Promise<T> {
    let lastError: MarvinError | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        return await this.makeRequestCore<T>(endpoint, options, additionalHeaders, parser);
      } catch (caught) {
        const err = this.toMarvinError(caught, endpoint, options.method || 'GET');
        lastError = err;

        if (this.isNonRetryableClientError(err) || attempt === this.retries || !this.shouldRetry(err)) {
          throw err;
        }

        await this.waitBeforeRetry(attempt, err);
      }
    }

    // Should be unreachable; keep a safe fallback
    throw lastError ?? new MarvinError({
      message: 'Request failed after all retries',
      status: 0,
      statusText: 'Retry Exhausted',
      endpoint,
      method: options.method || 'GET',
      timestamp: Date.now(),
    });
  }

  private toMarvinError(error: unknown, endpoint: string, method: string): MarvinError {
    if (error instanceof MarvinError) return error;
    if (error instanceof Error) {
      return new MarvinError({
        message: error.message,
        status: 0,
        statusText: 'Network Error',
        endpoint,
        method,
        timestamp: Date.now(),
      });
    }
    return new MarvinError({
      message: 'Unknown error',
      status: 0,
      statusText: 'Unknown Error',
      endpoint,
      method,
      timestamp: Date.now(),
    });
  }

  private isNonRetryableClientError(err: MarvinError): boolean {
    return err.isClientError() && err.status !== 429;
  }

  private shouldRetry(err: MarvinError): boolean {
    return err.isRetryable() || err.status === 429;
  }

  private async waitBeforeRetry(attempt: number, err: MarvinError): Promise<void> {
    const serverDelay = typeof err.retryAfterMs === 'number' ? err.retryAfterMs : null;
    const backoffDelay = serverDelay ?? this.retryDelay * Math.pow(2, attempt);
    await this.delay(backoffDelay);
  }

  /**
   * Core single-request function shared by JSON and text flows
   */
  private async makeRequestCore<T>(
    endpoint: string,
    options: RequestInit,
    additionalHeaders: Record<string, string>,
    parser: (response: Response) => Promise<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Token': this.apiToken,
      ...additionalHeaders,
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const fetchFn = this.fetch;
    let response: Response;
    try {
      response = await fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof MarvinError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new MarvinError({
          message: error.message,
          status: 0,
          statusText: 'Network Error',
          endpoint,
          method,
          timestamp: Date.now(),
        });
      }
      throw new MarvinError({
        message: 'Unknown error',
        status: 0,
        statusText: 'Unknown Error',
        endpoint,
        method,
        timestamp: Date.now(),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle non-OK responses outside of try/catch to avoid local catch warnings
    if (!response.ok) {
      const retryAfterMs = this.parseRetryAfter(response.headers?.get?.('retry-after') ?? null);
      const base = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method,
        timestamp: Date.now(),
      } as const;
      throw new MarvinError({
        ...base,
        ...(retryAfterMs !== null ? { retryAfterMs } : {}),
      });
    }

    return await parser(response);
  }

  /**
   * Test whether your API credentials are correct
   * @returns Promise resolving to a success message
   * @throws {MarvinError} When credentials are invalid
   * @example
   * ```typescript
   * try {
   *   const result = await client.testCredentials();
   *   console.log('Credentials valid:', result);
   * } catch (error) {
   *   console.error('Invalid credentials:', error.message);
   * }
   * ```
   */
  async testCredentials(): Promise<string> {
    return this.requestText('/test', { method: 'POST' });
  }

  // Task Management
  /**
   * Create a new task
   * @param task - The task data to create
   * @param autoComplete - Whether to enable auto-completion of task properties
   * @returns Promise resolving to the created task
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const newTask = await client.addTask({
   *   title: 'Complete project documentation',
   *   done: false,
   *   day: '2023-12-01',
   *   parentId: 'project-id'
   * });
   * ```
   */
  async addTask(task: AddTaskRequest, autoComplete = true): Promise<Task> {
    const headers = autoComplete ? {} : { 'X-Auto-Complete': 'false' };
    return this.post<Task>('/addTask', task, headers);
  }

  /**
   * Mark a task as done
   * @param itemId - The ID of the task to mark as done
   * @param timeZoneOffset - Optional timezone offset in minutes
   * @returns Promise resolving to success status
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * await client.markDone('task-id-123');
   * ```
   */
  async markDone(itemId: string, timeZoneOffset?: number): Promise<{ success: boolean }> {
    const request: MarkDoneRequest = { itemId };
    if (timeZoneOffset !== undefined) {
      request.timeZoneOffset = timeZoneOffset;
    }
    return this.post<{ success: boolean }>('/markDone', request);
  }

  /**
   * Get tasks and projects scheduled today
   * @param date - Optional date string (YYYY-MM-DD format). Defaults to today
   * @returns Promise resolving to array of tasks and projects scheduled for the specified date
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * // Get today's items
   * const todayItems = await client.getTodayItems();
   * 
   * // Get items for specific date
   * const items = await client.getTodayItems('2023-12-01');
   * ```
   */
  async getTodayItems(date?: string): Promise<(Task | Project)[]> {
    const endpoint = date ? `/todayItems?date=${date}` : '/todayItems';
    const headers = date ? { 'X-Date': date } : {};
    return this.get<(Task | Project)[]>(endpoint, headers);
  }

  /**
   * Get open tasks and projects that are due today (or earlier)
   * @param by - Optional filter parameter
   * @returns Promise resolving to array of due tasks and projects
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const dueItems = await client.getDueItems();
   * ```
   */
  async getDueItems(by?: string): Promise<(Task | Project)[]> {
    const endpoint = by ? `/dueItems?by=${by}` : '/dueItems';
    return this.get<(Task | Project)[]>(endpoint);
  }

  /**
   * Get child tasks/projects of a category/project
   * @param parentId - The ID of the parent category or project
   * @param parentIdHeader - Optional parent ID to include in headers
   * @returns Promise resolving to array of child tasks and projects
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const children = await client.getChildren('parent-project-id');
   * ```
   */
  async getChildren(parentId: string, parentIdHeader?: string): Promise<(Task | Project)[]> {
    const endpoint = `/children?parentId=${parentId}`;
    const headers = parentIdHeader ? { 'X-Parent-Id': parentIdHeader } : {};
    return this.get<(Task | Project)[]>(endpoint, headers);
  }

  // Project Management
  /**
   * Create a new project
   * @param project - The project data to create
   * @param autoComplete - Whether to enable auto-completion of project properties
   * @returns Promise resolving to the created project
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const newProject = await client.addProject({
   *   title: 'Website Redesign',
   *   done: false,
   *   priority: 'high',
   *   dueDate: '2024-01-15'
   * });
   * ```
   */
  async addProject(project: AddProjectRequest, autoComplete = true): Promise<Project> {
    const headers = autoComplete ? {} : { 'X-Auto-Complete': 'false' };
    return this.post<Project>('/addProject', project, headers);
  }

  // Event Management
  /**
   * Create a new event
   * @param event - The event data to create
   * @returns Promise resolving to the created event
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const newEvent = await client.addEvent({
   *   title: 'Team Meeting',
   *   start: '2024-01-15T10:00:00.000Z',
   *   length: 3600000, // 1 hour in milliseconds
   *   note: 'Discuss Q1 planning'
   * });
   * ```
   */
  async addEvent(event: AddEventRequest): Promise<Event> {
    return this.post<Event>('/addEvent', event);
  }

  // Categories and Labels
  /**
   * Get a list of all categories and projects
   * @returns Promise resolving to array of categories and projects
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const categories = await client.getCategories();
   * const workCategory = categories.find(c => c.title === 'Work');
   * ```
   */
  async getCategories(): Promise<(Category | Project)[]> {
    return this.get<(Category | Project)[]>('/categories');
  }

  /**
   * Get only categories (excludes projects)
   * @returns Promise resolving to array of categories only
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const categories = await client.getOnlyCategories();
   * const workCategory = categories.find(c => c.title === 'Work');
   * ```
   */
  async getOnlyCategories(): Promise<Category[]> {
    const categoriesAndProjects = await this.getCategories();
    return categoriesAndProjects.filter((item): item is Category => item.type !== 'project');
  }

  /**
   * Get only projects (excludes categories)
   * @returns Promise resolving to array of projects only
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const projects = await client.getOnlyProjects();
   * const activeProjects = projects.filter(p => !p.done);
   * ```
   */
  async getOnlyProjects(): Promise<Project[]> {
    const categoriesAndProjects = await this.getCategories();
    return categoriesAndProjects.filter((item): item is Project => item.type === 'project');
  }

  /**
   * Get a list of all labels
   * @returns Promise resolving to array of labels
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const labels = await client.getLabels();
   * const urgentLabel = labels.find(l => l.title === 'urgent');
   * ```
   */
  async getLabels(): Promise<Label[]> {
    return this.get<Label[]>('/labels');
  }

  // Time Tracking
  /**
   * Get the currently tracked task (handles empty response when nothing is tracked)
   * @returns Promise resolving to the currently tracked item or null if nothing is being tracked
   * @throws {MarvinError} When the request fails (except for empty response)
   * @example
   * ```typescript
   * const trackedItem = await client.getTrackedItem();
   * if (trackedItem) {
   *   console.log(`Currently tracking: ${trackedItem.title}`);
   * } else {
   *   console.log('No item currently being tracked');
   * }
   * ```
   */
  async getTrackedItem(): Promise<{ _id: string; db: string; title: string } | null> {
    try {
      return await this.get<{ _id: string; db: string; title: string }>('/trackedItem');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unexpected end of JSON input')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Start time tracking for a task
   * @param taskId - The ID of the task to start tracking
   * @returns Promise resolving to tracking response with timestamps and status
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const trackResult = await client.startTracking('task-id-123');
   * console.log('Tracking started at:', new Date(trackResult.startTimes[0]));
   * ```
   */
  async startTracking(taskId: string): Promise<TrackResponse> {
    const request: TrackRequest = { taskId, action: 'START' };
    return this.post<TrackResponse>('/track', request);
  }

  /**
   * Stop time tracking for a task
   * @param taskId - The ID of the task to stop tracking
   * @returns Promise resolving to tracking response with timestamps and status
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const trackResult = await client.stopTracking('task-id-123');
   * console.log('Tracking stopped at:', new Date(trackResult.stopTimes[0]));
   * ```
   */
  async stopTracking(taskId: string): Promise<TrackResponse> {
    const request: TrackRequest = { taskId, action: 'STOP' };
    return this.post<TrackResponse>('/track', request);
  }

  /**
   * Get time track info for multiple tasks
   * @param taskIds - Array of task IDs to get tracking information for
   * @returns Promise resolving to array of tracking information for each task
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const trackInfo = await client.getTracks(['task1', 'task2', 'task3']);
   * trackInfo.forEach(info => {
   *   console.log(`Task ${info.taskId} has ${info.times.length} tracking sessions`);
   * });
   * ```
   */
  async getTracks(taskIds: string[]): Promise<TrackInfo[]> {
    const request: TracksRequest = { taskIds };
    return this.post<TrackInfo[]>('/tracks', request);
  }

  // Time Blocks
  /**
   * Get a list of today's time blocks
   * @param date - Date string in YYYY-MM-DD format
   * @returns Promise resolving to array of time blocks for the specified date
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const timeBlocks = await client.getTodayTimeBlocks('2024-01-15');
   * console.log(`Found ${timeBlocks.length} time blocks for today`);
   * ```
   */
  async getTodayTimeBlocks(date: string): Promise<TimeBlock[]> {
    const endpoint = `/todayTimeBlocks?date=${date}`;
    const headers = { 'X-Date': date };
    return this.get<TimeBlock[]>(endpoint, headers);
  }

  // Reward System
  /**
   * Claim reward points
   * @param operation - Reward points operation details
   * @returns Promise resolving to updated user profile
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * await client.claimRewardPoints({
   *   points: 2.5,
   *   itemId: 'completed-task-id',
   *   date: '2024-01-15',
   *   op: 'CLAIM'
   * });
   * ```
   */
  async claimRewardPoints(operation: RewardPointsOperation): Promise<Profile> {
    return this.post<Profile>('/claimRewardPoints', operation);
  }

  /**
   * Unclaim reward points
   * @param operation - Reward points operation details (without points field)
   * @returns Promise resolving to updated user profile
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * await client.unclaimRewardPoints({
   *   itemId: 'task-id',
   *   date: '2024-01-15',
   *   op: 'UNCLAIM'
   * });
   * ```
   */
  async unclaimRewardPoints(operation: Omit<RewardPointsOperation, 'points'>): Promise<Profile> {
    return this.post<Profile>('/unclaimRewardPoints', operation);
  }

  /**
   * Spend reward points
   * @param operation - Reward points operation details (without itemId field)
   * @returns Promise resolving to updated user profile
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * await client.spendRewardPoints({
   *   points: 5.0,
   *   date: '2024-01-15',
   *   op: 'SPEND'
   * });
   * ```
   */
  async spendRewardPoints(operation: Omit<RewardPointsOperation, 'itemId'>): Promise<Profile> {
    return this.post<Profile>('/spendRewardPoints', operation);
  }

  /**
   * Get Marvin Kudos info
   * @returns Promise resolving to kudos information including current level and remaining kudos
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const kudos = await client.getKudos();
   * console.log(`Current kudos: ${kudos.kudos}, Level: ${kudos.level}`);
   * ```
   */
  async getKudos(): Promise<KudosInfo> {
    return this.get<KudosInfo>('/kudos');
  }

  // User Profile
  /**
   * Retrieve information about your account
   * @returns Promise resolving to user profile information
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const profile = await client.getMe();
   * console.log(`Email: ${profile.email}`);
   * console.log(`Reward points: ${profile.rewardPointsEarned - profile.rewardPointsSpent}`);
   * ```
   */
  async getMe(): Promise<Profile> {
    return this.get<Profile>('/me');
  }

  // Reminders
  /**
   * Set one or more reminders
   * @param reminders - Array of reminder objects to set
   * @returns Promise resolving to success message
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * await client.setReminders([{
   *   time: Date.now() + 3600000, // 1 hour from now
   *   offset: 15, // Minutes before task time to remind
   *   reminderId: 'unique-reminder-id',
   *   type: 'T', // Task reminder
   *   title: 'Complete important task',
   *   snooze: 5,
   *   autoSnooze: false,
   *   canTrack: true
   * }]);
   * ```
   */
  async setReminders(reminders: Reminder[]): Promise<string> {
    const request: SetRemindersRequest = { reminders };
    return this.requestText('/reminder/set', { 
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Delete one or more reminders
   * @param reminderIds - Array of reminder IDs to delete
   * @returns Promise resolving to success message
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * await client.deleteReminders(['reminder-id-1', 'reminder-id-2']);
   * ```
   */
  async deleteReminders(reminderIds: string[]): Promise<string> {
    const request: DeleteRemindersRequest = { reminderIds };
    return this.requestText('/reminder/delete', {
      method: 'POST', 
      body: JSON.stringify(request)
    });
  }

  // Goals
  /**
   * Get all goals
   * @returns Promise resolving to array of all goals
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const goals = await client.getGoals();
   * const activeGoals = goals.filter(g => g.status === 'active');
   * ```
   */
  async getGoals(): Promise<Goal[]> {
    return this.get<Goal[]>('/goals');
  }

  // Habits
  /**
   * Record a habit
   * @param habitId - The ID of the habit to record
   * @param time - Timestamp when the habit was performed
   * @param value - Value to record (e.g., number of glasses of water)
   * @param updateDB - Whether to update the database immediately
   * @returns Promise resolving to success status and new value
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * // Record drinking 3 glasses of water
   * const result = await client.recordHabit('water-habit-id', Date.now(), 3, true);
   * console.log(`New total: ${result.newValue}`);
   * ```
   */
  async recordHabit(
    habitId: string, 
    time: number, 
    value: number, 
    updateDB = false
  ): Promise<{ success: boolean; newValue: number }> {
    const request: UpdateHabitRequest = { habitId, time, value, updateDB };
    return this.post<{ success: boolean; newValue: number }>('/updateHabit', request);
  }

  /**
   * Undo last habit recording
   * @param habitId - The ID of the habit to undo
   * @param updateDB - Whether to update the database immediately
   * @returns Promise resolving to success status and new value
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const result = await client.undoHabit('water-habit-id', true);
   * console.log(`Value after undo: ${result.newValue}`);
   * ```
   */
  async undoHabit(habitId: string, updateDB = false): Promise<{ success: boolean; newValue: number }> {
    const request: UpdateHabitRequest = { habitId, undo: true, updateDB };
    return this.post<{ success: boolean; newValue: number }>('/updateHabit', request);
  }

  /**
   * Rewrite habit history
   * @param habitId - The ID of the habit to update
   * @param history - Array of values representing the complete history
   * @param updateDB - Whether to update the database immediately
   * @returns Promise resolving to success status
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * // Set complete history for a habit
   * await client.rewriteHabitHistory('habit-id', [1, 2, 0, 3, 1], true);
   * ```
   */
  async rewriteHabitHistory(
    habitId: string, 
    history: number[], 
    updateDB = false
  ): Promise<{ success: boolean }> {
    const request: UpdateHabitRequest = { habitId, history, updateDB };
    return this.post<{ success: boolean }>('/updateHabit', request);
  }

  /**
   * Get a single habit
   * @param habitId - The ID of the habit to retrieve
   * @returns Promise resolving to the habit with full details and history
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const habit = await client.getHabit('water-habit-id');
   * console.log(`${habit.title}: Target ${habit.target} per ${habit.period}`);
   * ```
   */
  async getHabit(habitId: string): Promise<Habit> {
    return this.get<Habit>(`/habit?id=${habitId}`);
  }

  /**
   * Get all habits
   * @returns Promise resolving to array of all habits
   * @throws {MarvinError} When the request fails
   * @example
   * ```typescript
   * const habits = await client.getHabits();
   * const dailyHabits = habits.filter(h => h.period === 'day');
   * ```
   */
  async getHabits(): Promise<Habit[]> {
    return this.get<Habit[]>('/habits');
  }
}
