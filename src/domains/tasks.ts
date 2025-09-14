import type { Task, Project, AddTaskRequest, MarkDoneRequest } from '../types';
import type { HttpClient } from '../http-client';

/**
 * Task and Project management operations
 */
export class TasksApi {
  constructor(private http: HttpClient) {}

  /**
   * Create a new task
   * @param task - The task data to create
   * @param autoComplete - Whether to enable auto-completion of task properties
   * @returns Promise resolving to the created task
   * @example
   * ```typescript
   * const newTask = await tasksApi.addTask({
   *   title: 'Complete project documentation',
   *   done: false,
   *   parentId: 'project-id'
   * });
   * ```
   */
  async addTask(task: AddTaskRequest, autoComplete = true): Promise<Task> {
    const headers = autoComplete ? {} : { 'X-Auto-Complete': 'false' };
    return this.http.post<Task>('/addTask', task, headers);
  }

  /**
   * Create a new project
   * @param project - The project data to create
   * @param autoComplete - Whether to enable auto-completion of project properties
   * @returns Promise resolving to the created project
   * @example
   * ```typescript
   * const newProject = await tasksApi.addProject({
   *   title: 'Website Redesign',
   *   done: false,
   *   priority: 'high',
   *   dueDate: '2024-01-15'
   * });
   * ```
   */
  async addProject(project: any, autoComplete = true): Promise<Project> {
    const headers = autoComplete ? {} : { 'X-Auto-Complete': 'false' };
    return this.http.post<Project>('/addProject', project, headers);
  }

  /**
   * Mark a task as done
   * @param itemId - The ID of the task to mark as done
   * @param timeZoneOffset - Optional timezone offset in minutes
   * @returns Promise resolving to success status
   * @example
   * ```typescript
   * await tasksApi.markDone('task-id-123');
   * ```
   */
  async markDone(itemId: string, timeZoneOffset?: number): Promise<{ success: boolean }> {
    const request: MarkDoneRequest = { itemId };
    if (timeZoneOffset !== undefined) {
      request.timeZoneOffset = timeZoneOffset;
    }
    return this.http.post<{ success: boolean }>('/markDone', request);
  }

  /**
   * Get tasks and projects scheduled today
   * @param date - Optional date string (YYYY-MM-DD format). Defaults to today
   * @returns Promise resolving to array of tasks and projects scheduled for the specified date
   * @example
   * ```typescript
   * // Get today's items
   * const todayItems = await tasksApi.getTodayItems();
   *
   * // Get items for specific date
   * const items = await tasksApi.getTodayItems('2023-12-01');
   * ```
   */
  async getTodayItems(date?: string): Promise<(Task | Project)[]> {
    const endpoint = date ? `/todayItems?date=${date}` : '/todayItems';
    const headers = date ? { 'X-Date': date } : {};
    return this.http.get<(Task | Project)[]>(endpoint, headers);
  }

  /**
   * Get open tasks and projects that are due today (or earlier)
   * @param by - Optional filter parameter
   * @returns Promise resolving to array of due tasks and projects
   * @example
   * ```typescript
   * const dueItems = await tasksApi.getDueItems();
   * ```
   */
  async getDueItems(by?: string): Promise<(Task | Project)[]> {
    const endpoint = by ? `/dueItems?by=${by}` : '/dueItems';
    return this.http.get<(Task | Project)[]>(endpoint);
  }

  /**
   * Get child tasks/projects of a category/project
   * @param parentId - The ID of the parent category or project
   * @param parentIdHeader - Optional parent ID to include in headers
   * @returns Promise resolving to array of child tasks and projects
   * @example
   * ```typescript
   * const children = await tasksApi.getChildren('parent-project-id');
   * ```
   */
  async getChildren(parentId: string, parentIdHeader?: string): Promise<(Task | Project)[]> {
    const endpoint = `/children?parentId=${parentId}`;
    const headers = parentIdHeader ? { 'X-Parent-Id': parentIdHeader } : {};
    return this.http.get<(Task | Project)[]>(endpoint, headers);
  }
}