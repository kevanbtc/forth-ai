// llm.js
import fetch from 'node-fetch';

export async function plan(task) {
  // Call Ollama to plan steps
  const response = await fetch(`${process.env.OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      messages: [{ role: 'user', content: `Plan steps for task: ${JSON.stringify(task)}` }],
      stream: false
    })
  });
  const data = await response.json();
  return JSON.parse(data.message.content); // Assume LLM returns JSON
}

export async function judge(task, results) {
  // Call Ollama to judge
  const response = await fetch(`${process.env.OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      messages: [{ role: 'user', content: `Judge results for task: ${JSON.stringify(task)} results: ${JSON.stringify(results)}` }],
      stream: false
    })
  });
  const data = await response.json();
  return JSON.parse(data.message.content);
}