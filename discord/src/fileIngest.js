export async function fetchText(url, maxBytes = 1_048_576) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      throw new Error(`File too large (> ${maxBytes} bytes)`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function trimForPrompt(text, hardLimit = 40_000) {
  if (text.length <= hardLimit) return text;
  const head = text.slice(0, Math.floor(hardLimit * 0.7));
  const tail = text.slice(-Math.floor(hardLimit * 0.25));
  return `${head}\n\n…\n\n${tail}`;
}