export const config = { runtime: "edge" };

import { SYSTEM_PROMPT } from "../src/constants/prompts.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const userKey = req.headers.get("X-Api-Key");

  if (!userKey || !userKey.startsWith("sk-ant-")) {
    return new Response(JSON.stringify({ error: "Valid Anthropic API key required" }), { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { content } = body;

  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: "No content provided" }), { status: 400 });
  }

  if (content.length > 50000) {
    return new Response(JSON.stringify({ error: "File too large. Maximum 50,000 characters." }), { status: 400 });
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
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Evaluate this skill file:\n\n<skill_file>\n${content}\n</skill_file>` }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      if (err.error?.type === "authentication_error") {
        return new Response(JSON.stringify({ error: "Invalid API key. Check your key at console.anthropic.com" }), { status: 401 });
      }
      if (err.error?.type === "rate_limit_error") {
        return new Response(JSON.stringify({ error: "Rate limit hit. Wait a moment and try again." }), { status: 429 });
      }
      if (err.error?.type === "overloaded_error") {
        return new Response(JSON.stringify({ error: "Anthropic API is overloaded. Try again in a few seconds." }), { status: 503 });
      }
      return new Response(JSON.stringify({ error: "Anthropic API error", detail: err.error?.message }), { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";
    const clean = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    if (!clean) {
      return new Response(JSON.stringify({ error: "Empty response from evaluation. Try again." }), { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse evaluation response. Try again." }), { status: 500 });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Evaluation failed", detail: err.message }), { status: 500 });
  }
}
