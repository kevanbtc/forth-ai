// agents/solidity/src/index.js
import { createClient } from 'redis';
import { spawn } from 'child_process';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

async function run() {
  for (;;) {
    const task = await redis.brPop('queue:solidity', 0);
    const { taskId, subtask, input } = JSON.parse(task.element);

    // Run tests
    const testProcess = spawn('forge', ['test', '-vvv'], { cwd: '/workspace' });
    // Handle output

    // Run coverage
    const covProcess = spawn('forge', ['coverage', '--report', 'lcov'], { cwd: '/workspace' });
    // Handle output

    // Run Slither
    const slitherProcess = spawn('slither', ['.', '--fail-high', '--fail-medium'], { cwd: '/workspace' });
    // Handle output

    // Save artifacts
    await redis.lPush(`artifacts:${taskId}`, JSON.stringify({ subtask, results: '...' }));
  }
}

run();