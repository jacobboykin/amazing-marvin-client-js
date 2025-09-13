#!/usr/bin/env tsx

/**
 * Basic usage example for the Amazing Marvin TypeScript client
 *
 *
 * To run this example:
 * 1. Install dependencies: npm install
 * 2. Set your API token: export MARVIN_API_TOKEN="your-token-here"
 * 3. Run: npx tsx examples/basic-usage.ts
 */

import Bottleneck from 'bottleneck';
import { MarvinClient, MarvinError } from '../src';

// ---- Rate limiter config ----
// Tune these to the APIs published limits (examples shown):
const limiter = new Bottleneck({
  // Max parallel requests (protects server & your process)
  maxConcurrent: 2,

  // Token bucket: allow 60 requests per minute sustained
  reservoir: 60,
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60_000, // 1 minute

  // Gentle spacing between jobs (helps smooth spikes)
  minTime: 150, // ms between dequeues
});

// Optional: per-endpoint buckets if different limits apply
// const labelsLimiter = new Bottleneck.Group({ maxConcurrent: 1, minTime: 200 });

// Simple scheduler wrapper — the client already retries 429/5xx and
// honors Retry-After headers internally. Bottleneck ensures we respect
// concurrency and smoothing to avoid bursts.
async function apiCall<T>(fn: () => Promise<T>, label = 'default'): Promise<T> {
  return limiter.schedule({ id: `${label}:${Date.now()}` }, fn);
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  const apiToken = process.env.MARVIN_API_TOKEN;
  if (!apiToken) {
    console.error('Please set MARVIN_API_TOKEN environment variable');
    process.exit(1);
  }

  const client = new MarvinClient({ apiToken });

  try {
    console.log('🔍 Testing API credentials...');
    await apiCall(() => client.testCredentials(), 'auth');
    console.log('✅ Credentials valid!');

    // Get user profile
    console.log('\n👤 Getting user profile...');
    const profile = await apiCall(() => client.getMe(), 'me');
    console.log(`Email: ${profile.email}`);
    console.log(
      `Reward Points Balance: ${(profile.rewardPointsEarned || 0) - (profile.rewardPointsSpent || 0)}`
    );

    // Related reads can still run concurrently—apiCall queues them safely
    console.log('\n📁 Fetching categories, projects, and labels...');
    const [categories, projects, labels] = await Promise.all([
      apiCall(() => client.getOnlyCategories(), 'read:categories'),
      apiCall(() => client.getOnlyProjects(), 'read:projects'),
      apiCall(() => client.getLabels(), 'read:labels'),
    ]);
    console.log(`Found ${categories.length} categories, ${projects.length} projects, ${labels.length} labels`);

    // Create + track + complete task workflow (all via wrapper)
    console.log('\n📝 Creating a new task...');
    const task = await apiCall(() =>
      client.addTask({
        title: 'Test API client task',
        done: false,
        day: new Date().toISOString().split('T')[0]!,
        note: 'Created by the production-ready API client example',
        timeEstimate: 1_800_000, // 30 minutes
      }),
      'write:addTask'
    );
    console.log(`✅ Created task: ${task.title} (ID: ${task._id})`);

    console.log('\n⏱️ Starting time tracking...');
    await apiCall(() => client.startTracking(task._id), 'write:startTracking');
    console.log('✅ Time tracking started');

    // Simulate some work (in a real app, this would be actual work)
    console.log('💼 Simulating work for 2 seconds...');
    await delay(2000);

    console.log('⏱️ Stopping time tracking...');
    await apiCall(() => client.stopTracking(task._id), 'write:stopTracking');
    console.log('✅ Time tracking stopped');

    console.log('\n✅ Marking task as complete...');
    await apiCall(() => client.markDone(task._id, new Date().getTimezoneOffset()), 'write:markDone');
    console.log('✅ Task marked as complete!');

    console.log('\n🎯 Claiming reward points...');
    await apiCall(() =>
      client.claimRewardPoints({
        points: 1.5,
        itemId: task._id,
        date: new Date().toISOString().split('T')[0]!,
        op: 'CLAIM',
      }),
      'write:claimPoints'
    );
    console.log('✅ Reward points claimed!');

    console.log('\n📅 Getting today\'s tasks...');
    const todayItems = await apiCall(() => client.getTodayItems(), 'read:today');
    console.log(`Found ${todayItems.length} items scheduled for today`);

    console.log('\n⏱️ Checking currently tracked item...');
    const trackedItem = await apiCall(() => client.getTrackedItem(), 'read:trackedItem');
    if (trackedItem) {
      console.log(`Currently tracking: ${trackedItem.title}`);
    } else {
      console.log('No item currently being tracked');
    }

    console.log('\n🏆 Getting kudos info...');
    const kudos = await apiCall(() => client.getKudos(), 'read:kudos');
    console.log(`Current kudos: ${kudos.kudos}, Level: ${kudos.level}`);

    console.log('\n🎉 Example completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    
    if (error instanceof MarvinError) {
      if (error.status === 401) {
        console.error('Invalid API token. Check your MARVIN_API_TOKEN environment variable.');
      } else if (error.status === 429) {
        console.error('Rate limit exceeded. The client honors Retry-After; consider adjusting your rate limits.');
      } else if (error.status >= 500) {
        console.error('Server error. Please try again later.');
      }
    } else if (error?.status === 401) {
      console.error('Invalid API token. Check your MARVIN_API_TOKEN environment variable.');
    } else if (error?.status === 429) {
      console.error('Rate limit exceeded despite built-in protection. API may be under heavy load.');
    } else if (error?.status >= 500) {
      console.error('Server error. Please try again later.');
    }
    
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
