// New organized client - recommended for new code
export { MarvinClient } from './marvin-client';

// Legacy client for backward compatibility
export { MarvinClient as LegacyMarvinClient } from './client';

// Error handling
export { MarvinError } from './errors';

// Domain APIs for advanced usage
export { TasksApi, OrganizationApi, TimeTrackingApi } from './domains';
export { HttpClient } from './http-client';

// Types
export type * from './types';
