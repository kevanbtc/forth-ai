// agents/orchestrator/src/index.ts
import { plan, judge } from "./llm.js";
import { enqueue, dequeue, saveArtifact } from "./bus.js";

async function run() {
  for (;;) {
    const task = await dequeue("tasks:incoming");
    const planSteps = await plan(task);            // LLM: break into steps
    for (const step of planSteps) await enqueue(`queue:${step.agent}`, { ...task, subtask: step.name });
    const results = await collect(task.id);        // wait for agent outputs
    const verdict = await judge(task, results);    // LLM: score + pick winner(s)
    await saveArtifact(task.id, "report.md", verdict.report);
    await enqueue("tasks:approval", { id: task.id, bundle: verdict.bundle }); // PRs + Safe JSON
  }
}
run();