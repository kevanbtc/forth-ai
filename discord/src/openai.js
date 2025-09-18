import OpenAI from "openai";

export function makeOpenAI({ apiKey, model, temperature = 0.3, maxTokens = 600 }) {
  const client = new OpenAI({ apiKey });
  return async function chat({ system, messages }) {
    const resp = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages
      ]
    });
    return resp.choices?.[0]?.message?.content?.trim() ?? "";
  };
}