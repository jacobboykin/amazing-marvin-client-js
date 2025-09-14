import type { Category, Project, Label } from '../types';
import type { HttpClient } from '../http-client';

/**
 * Organization and categorization operations (Categories, Projects, Labels)
 */
export class OrganizationApi {
  constructor(private http: HttpClient) {}

  /**
   * Get categories and projects
   * @returns Promise resolving to array of categories and projects
   * @example
   * ```typescript
   * const categories = await organizationApi.getCategories();
   * const workCategory = categories.find(c => c.title === 'Work');
   * ```
   */
  async getCategories(): Promise<(Category | Project)[]> {
    return this.http.get<(Category | Project)[]>('/categories');
  }

  /**
   * Get only categories (excludes projects)
   * @returns Promise resolving to array of categories only
   * @example
   * ```typescript
   * const categories = await organizationApi.getOnlyCategories();
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
   * @example
   * ```typescript
   * const projects = await organizationApi.getOnlyProjects();
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
   * @example
   * ```typescript
   * const labels = await organizationApi.getLabels();
   * const urgentLabel = labels.find(l => l.title === 'urgent');
   * ```
   */
  async getLabels(): Promise<Label[]> {
    return this.http.get<Label[]>('/labels');
  }
}