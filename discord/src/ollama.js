export async function chatOllama({ base, model, messages }) {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false })
  });
  const j = await res.json();
  return j?.message?.content?.trim() || "";
}