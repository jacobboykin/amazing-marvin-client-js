import type { TrackResponse, TrackInfo, TrackRequest, TracksRequest, TimeBlock } from '../types';
import type { HttpClient } from '../http-client';

/**
 * Time tracking and time block operations
 */
export class TimeTrackingApi {
  constructor(private http: HttpClient) {}

  /**
   * Get the currently tracked task (handles empty response when nothing is tracked)
   * @returns Promise resolving to the currently tracked item or null if nothing is being tracked
   * @example
   * ```typescript
   * const trackedItem = await timeTrackingApi.getTrackedItem();
   * if (trackedItem) {
   *   console.log(`Currently tracking: ${trackedItem.title}`);
   * } else {
   *   console.log('No item currently being tracked');
   * }
   * ```
   */
  async getTrackedItem(): Promise<{ _id: string; db: string; title: string } | null> {
    try {
      return await this.http.get<{ _id: string; db: string; title: string }>('/trackedItem');
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
   * @example
   * ```typescript
   * const trackResult = await timeTrackingApi.startTracking('task-id-123');
   * console.log('Tracking started at:', new Date(trackResult.startTimes[0]));
   * ```
   */
  async startTracking(taskId: string): Promise<TrackResponse> {
    const request: TrackRequest = { taskId, action: 'START' };
    return this.http.post<TrackResponse>('/track', request);
  }

  /**
   * Stop time tracking for a task
   * @param taskId - The ID of the task to stop tracking
   * @returns Promise resolving to tracking response with timestamps and status
   * @example
   * ```typescript
   * const trackResult = await timeTrackingApi.stopTracking('task-id-123');
   * console.log('Total time tracked:', trackResult.stopTimes.length);
   * ```
   */
  async stopTracking(taskId: string): Promise<TrackResponse> {
    const request: TrackRequest = { taskId, action: 'STOP' };
    return this.http.post<TrackResponse>('/track', request);
  }

  /**
   * Get tracking data for multiple tasks
   * @param taskIds - Array of task IDs to get tracking data for
   * @returns Promise resolving to array of tracking information for the specified tasks
   * @example
   * ```typescript
   * const trackingData = await timeTrackingApi.getTracks(['task1', 'task2']);
   * trackingData.forEach(track => {
   *   console.log(`Task ${track.taskId} total time:`, track.times.length);
   * });
   * ```
   */
  async getTracks(taskIds: string[]): Promise<TrackInfo[]> {
    const request: TracksRequest = { taskIds };
    return this.http.post<TrackInfo[]>('/tracks', request);
  }

  /**
   * Get time blocks for a specific date
   * @param date - Date string in YYYY-MM-DD format
   * @returns Promise resolving to array of time blocks for the specified date
   * @example
   * ```typescript
   * const timeBlocks = await timeTrackingApi.getTodayTimeBlocks('2023-12-01');
   * timeBlocks.forEach(block => {
   *   console.log(`${block.time}: ${block.title} (${block.duration} min)`);
   * });
   * ```
   */
  async getTodayTimeBlocks(date: string): Promise<TimeBlock[]> {
    const endpoint = `/todayTimeBlocks?date=${date}`;
    const headers = { 'X-Date': date };
    return this.http.get<TimeBlock[]>(endpoint, headers);
  }
}