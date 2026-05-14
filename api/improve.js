export const config = { runtime: "edge" };

import { IMPROVE_SYSTEM_PROMPT, buildImprovePrompt } from "./lib/improvePrompt.js";

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

// Rate limiting: deliberately deferred.
// BYOK model means abuse burns the caller's quota, not ours.
// Stateless V8 isolates preclude in-memory rate limiting across concurrent requests.
// See api/evaluate.js for the full reasoning.

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

  const { content, evaluation } = body;

  if (!content?.trim()) {
    return json({ error: "No content provided" }, 400, cors);
  }

  if (content.length > 50000) {
    return json({ error: "File too large. Maximum 50,000 characters." }, 400, cors);
  }

  // Validate evaluation shape — must come from a completed SkillLint evaluation.
  if (!evaluation || typeof evaluation.overall_score !== "number") {
    return json({ error: "Valid evaluation data required" }, 400, cors);
  }

  // Per-request UUID sentinel — eliminates any collision risk with markdown content.
  // The client reads X-Stream-Id from the response header to build matching sentinels.
  // This is safer than a fixed sentinel when output is free-form markdown rather than JSON.
  const streamId = crypto.randomUUID();
  const SENTINEL_DONE  = `\n__DONE_${streamId}__\n`;
  const SENTINEL_ERROR = `\n__ERROR_${streamId}__:`;

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
        max_tokens: 4096,
        stream: true,
        system: IMPROVE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildImprovePrompt(content, evaluation) }],
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

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let failed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            let event;
            try { event = JSON.parse(data); } catch { continue; }

            if (event.type === "error") {
              const type = event.error?.type || "";
              let msg;
              if (type === "rate_limit_error")     msg = "Rate limit hit. Wait a moment and try again.";
              else if (type === "overloaded_error") msg = "Anthropic is overloaded right now. Try again in a few seconds.";
              else if (type === "authentication_error") msg = "Invalid API key. Check your key at console.anthropic.com.";
              else msg = event.error?.message || "Anthropic API error";
              await writer.write(encoder.encode(`${SENTINEL_ERROR}${msg}\n`));
              failed = true;
              break;
            }
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              await writer.write(encoder.encode(event.delta.text));
            }
          }
          if (failed) break;
        }
        if (!failed) {
          await writer.write(encoder.encode(SENTINEL_DONE));
        }
      } catch (err) {
        const msg = err?.message || "Stream read error";
        await writer.write(encoder.encode(`${SENTINEL_ERROR}${msg}\n`)).catch(() => {});
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "X-Stream-Id": streamId,
        ...cors,
      },
    });

  } catch (err) {
    return json({ error: "Improvement generation failed", detail: err.message }, 500, cors);
  }
}
