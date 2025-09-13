# Amazing Marvin JavaScript/TypeScript Client 

<img src="https://raw.githubusercontent.com/amazingmarvin/MarvinAPI/refs/heads/master/images/Run.gif" width="40" />

A TypeScript client library for the Amazing Marvin API, focusing on **non-privileged endpoints** that use the limited access API token.

https://github.com/amazingmarvin/MarvinAPI

## Why Limited API Access?

Amazing Marvin provides two types of API access, designed with security and use-case separation in mind:

1. **Limited Access Token (X-API-Token)** - Used by this library ✅
   - Designed for safe external integrations (like Zapier)
   - Covers essential operations through dedicated, safe endpoints
   - Cannot directly read/write to the underlying CouchDB database
   - Ideal when you want to give third parties specific capabilities without full account access

2. **Full Access Token (X-Full-Access-Token)** - NOT used here ⚠️
   - Direct CouchDB database read/write access via `/api/doc/*` endpoints
   - **Can crash Marvin on startup** if documents are given wrong shape/structure
   - **No built-in data recovery** - deleted documents cannot be recovered (no Trash functionality)
   - Requires deep understanding of Marvin's internal data structures
   - May require contacting support if something goes wrong

**This library uses the limited API by design** - it's safer, more stable, and covers the vast majority of use cases without the risks of direct database manipulation.

## What Can You Do?

### ✅ Supported Operations (Limited API)
- **Task Management**: Create and complete tasks (no editing after creation)
- **Project Organization**: Create projects and view hierarchies  
- **Time Tracking**: Start/stop timers, track work sessions
- **Categories & Labels**: View existing categories and labels
- **Habit Tracking**: Record and monitor daily habits
- **Goal Management**: View goals and track progress
- **Reward System**: Earn and spend reward points
- **Calendar Integration**: Create events and view time blocks
- **Reminders**: Set and delete specific task reminders
- **User Profile**: View account information (read-only)

### ❌ Not Supported (Requires Full Access)
- **Task/Project Editing**: Cannot modify tasks/projects after creation (title, notes, due dates, etc.)
- **Task/Project Deletion**: No delete endpoints in limited API
- **Recurring Tasks/Projects**: Creating or modifying recurring task templates
- **Category/Label Management**: Cannot create, edit, or delete categories/labels
- **Full Reminder Management**: Getting all reminders or bulk deletion
- **Settings/Profile Editing**: Modifying user preferences, strategy settings
- **Direct Database Access**: Raw CouchDB operations (`/api/doc/*` endpoints)
- **Bulk Operations**: Data migration, backup/restore, mass updates

**Need something not listed?** Check if it's available via the limited API endpoints - you might be surprised by what's possible!

## Installation

Install from npm (recommended):

```bash
npm install @jacobboykin/amazing-marvin-client
```

## Quick Start

```typescript
import { MarvinClient } from '@jacobboykin/amazing-marvin-client';

// Initialize the client with your API token
const client = new MarvinClient({
  apiToken: 'your-api-token-here'
});

// Test your credentials
try {
  const result = await client.testCredentials();
  console.log('Credentials valid:', result); // "OK"
} catch (error) {
  console.error('Invalid credentials:', error);
}
```

### CommonJS import (Node.js)

```js
const { MarvinClient, MarvinError } = require('@jacobboykin/amazing-marvin-client');
```

## API Token Setup

1. Go to [Amazing Marvin API settings](https://app.amazingmarvin.com/pre?api)
2. Copy your `API Token` (not the `Full-Access Token`)
3. Use it to initialize the client

You may need to first enable the "API" feature in Marvin's "Features/Strategies" settings.

## Usage Examples

### Task Management

```typescript
// Create a new task
const task = await client.addTask({
  title: 'Complete project proposal',
  done: false,
  day: '2024-03-15',
  parentId: 'work-project-id',
  labelIds: ['urgent', 'important'],
  timeEstimate: 7200000, // 2 hours in milliseconds
  dueDate: '2024-03-20',
  note: 'Include budget analysis and timeline'
});

// Mark task as done
await client.markDone(task._id, -480); // timezone offset in minutes

// Get today's tasks and projects
const todayItems = await client.getTodayItems('2024-03-15');

// Get overdue items
const dueItems = await client.getDueItems('2024-03-15');
```

### Project Management

```typescript
// Create a project
const project = await client.addProject({
  title: 'Website Redesign',
  done: false,
  priority: 'high',
  dueDate: '2024-04-01',
  note: 'Complete overhaul of company website'
});

// Get child tasks/projects
const children = await client.getChildren(project._id);
```

### Time Tracking

```typescript
// Start tracking time
const trackStart = await client.startTracking('task-id');

// Stop tracking time  
const trackStop = await client.stopTracking('task-id');

// Get currently tracked item
const trackedItem = await client.getTrackedItem();

// Get time tracking data for multiple tasks
const trackData = await client.getTracks(['task1', 'task2', 'task3']);
```

### Categories and Labels

```typescript
// Get all categories
const categories = await client.getCategories();

// Get all labels
const labels = await client.getLabels();

// Use in task creation
const taskWithLabels = await client.addTask({
  title: 'Urgent task',
  done: false,
  parentId: categories.find(c => c.title === 'Work')?._id,
  labelIds: labels.filter(l => ['urgent', 'quick'].includes(l.title)).map(l => l._id)
});
```

### Habit Tracking

```typescript
// Get all habits
const habits = await client.getHabits();

// Record a habit (e.g., drank 3 glasses of water)
await client.recordHabit('water-habit-id', Date.now(), 3, true);

// Undo last habit recording
await client.undoHabit('water-habit-id', true);

// Get specific habit with full history
const habit = await client.getHabit('water-habit-id');
```

### Events and Time Blocks

```typescript
// Create an event
const event = await client.addEvent({
  title: 'Team Meeting',
  start: '2024-03-15T10:00:00.000Z',
  length: 3600000, // 1 hour in milliseconds
  note: 'Discuss Q2 planning'
});

// Get today's time blocks
const timeBlocks = await client.getTodayTimeBlocks('2024-03-15');
```

### Reward System

```typescript
// Claim reward points for completing a task
await client.claimRewardPoints({
  points: 2.5,
  itemId: 'completed-task-id',
  date: '2024-03-15',
  op: 'CLAIM'
});

// Spend reward points
await client.spendRewardPoints({
  points: 5.0,
  date: '2024-03-15',
  op: 'SPEND'
});

// Get current kudos info
const kudos = await client.getKudos();
console.log(`Current kudos: ${kudos.kudos}, Level: ${kudos.level}`);
```

### Reminders

```typescript
// Set reminders
await client.setReminders([{
  time: 1678098457794, // Unix timestamp in milliseconds
  offset: 15, // Minutes before task time to remind
  reminderId: 'unique-reminder-id',
  type: 'T', // Task reminder
  title: 'Complete important task',
  snooze: 5, // Snooze duration in minutes
  autoSnooze: false,
  canTrack: true // Show "Track Time" option
}]);

// Delete reminders
await client.deleteReminders(['reminder-id-1', 'reminder-id-2']);
```

### Goals

```typescript
// Get all goals
const goals = await client.getGoals();

// Find active goals
const activeGoals = goals.filter(g => g.status === 'active');
```

### User Profile

```typescript
// Get account information
const profile = await client.getMe();
console.log(`Email: ${profile.email}`);
console.log(`Reward points: ${profile.rewardPointsEarned - profile.rewardPointsSpent}`);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For API documentation, visit: https://github.com/amazingmarvin/MarvinAPI/wiki

For client library issues, please file a GitHub issue.
