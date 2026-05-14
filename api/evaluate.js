export const config = { runtime: "edge" };

import { SYSTEM_PROMPT } from "./lib/prompts.js";

const ALLOWED_ORIGINS = new Set([
  "https://skilllint.dev",
  "https://www.skilllint.dev",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
]);

function getCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://www.skilllint.dev",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default async function handler(req) {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  const userKey = req.headers.get("X-Api-Key");

  if (!userKey || !userKey.startsWith("sk-ant-")) {
    return json({ error: "Valid Anthropic API key required" }, 401, cors);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }

  const { content } = body;

  if (!content?.trim()) {
    return json({ error: "No content provided" }, 400, cors);
  }

  if (content.length > 50000) {
    return json({ error: "File too large. Maximum 50,000 characters." }, 400, cors);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": userKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 8000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Evaluate this skill file:\n\n<skill_file>\n${content}\n</skill_file>` }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      if (err.error?.type === "authentication_error") {
        return json({ error: "Invalid API key. Check your key at console.anthropic.com" }, 401, cors);
      }
      if (err.error?.type === "rate_limit_error") {
        return json({ error: "Rate limit hit. Wait a moment and try again." }, 429, cors);
      }
      if (err.error?.type === "overloaded_error") {
        return json({ error: "Anthropic API is overloaded. Try again in a few seconds." }, 503, cors);
      }
      return json({ error: "Anthropic API error", detail: err.error?.message }, 500, cors);
    }

    // Stream text deltas through to the client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const event = JSON.parse(data);
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                await writer.write(encoder.encode(event.delta.text));
              }
            } catch (e) { void e; /* skip malformed SSE lines */ }
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", ...cors },
    });

  } catch (err) {
    return json({ error: "Evaluation failed", detail: err.message }, 500, cors);
  }
}
