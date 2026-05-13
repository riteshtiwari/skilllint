export const config = { runtime: "edge" };

import { SYSTEM_PROMPT } from "./lib/prompts.js";

const ALLOWED_ORIGINS = new Set([
  "https://skilllint.dev",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function getCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://skilllint.dev",
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

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";
    const clean = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    if (!clean) {
      return json({ error: "Empty response from evaluation. Try again." }, 500, cors);
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return json({ error: "Failed to parse evaluation response. Try again." }, 500, cors);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json", ...cors },
    });

  } catch (err) {
    return json({ error: "Evaluation failed", detail: err.message }, 500, cors);
  }
}
