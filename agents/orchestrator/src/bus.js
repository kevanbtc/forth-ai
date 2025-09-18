// bus.js
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export async function enqueue(queue, message) {
  await redis.lPush(queue, JSON.stringify(message));
}

export async function dequeue(queue) {
  const result = await redis.brPop(queue, 0);
  return JSON.parse(result.element);
}

export async function saveArtifact(taskId, filename, content) {
  // Save to PG or FS
  console.log(`Saving ${filename} for ${taskId}`);
}