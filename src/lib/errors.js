// Error classification for user-facing messages.
//
// The patterns below match against error message strings constructed in two places:
//   1. evaluate() in App.jsx — these strings are under our control and won't change unexpectedly.
//   2. Mid-stream Anthropic error types forwarded through SENTINEL_ERROR in api/evaluate.js —
//      those are normalized to fixed strings before reaching the client, so they're stable too.
//
// If you change a throw message in evaluate() or a normalized string in api/evaluate.js,
// update the pattern here to match.

const PATTERNS = [
  { match: /invalid api key|check your key/i,              message: "API key is invalid. Check it at console.anthropic.com.",             action: "settings" },
  { match: /api key required/i,                            message: "Anthropic API key required. Add one in Settings.",                    action: "settings" },
  { match: /rate limit/i,                                  message: "Rate limit hit. Wait a moment and try again.",                        action: "retry"    },
  { match: /overloaded/i,                                  message: "Anthropic is overloaded right now. Try again in a few seconds.",      action: "retry"    },
  { match: /timed out/i,                                   message: "Evaluation timed out. Try a shorter file or try again.",              action: "retry"    },
  { match: /failed to parse|parse/i,                       message: "Couldn't parse the evaluation response. Try again.",                  action: "retry"    },
  { match: /empty response/i,                              message: "Empty response from evaluation. Try again.",                          action: "retry"    },
  { match: /file too large/i,                              message: "File too large. Keep it under 50,000 characters.",                   action: "none"     },
  { match: /no content/i,                                  message: "No content to evaluate. Paste or upload a skill file.",              action: "none"     },
  { match: /api error during evaluation|stream read error/i, message: "Something went wrong during evaluation. Try again.",               action: "retry"    },
];

export function classifyError(err) {
  const msg = (typeof err === "string" ? err : err?.message || "").trim();
  for (const { match, message, action } of PATTERNS) {
    if (match.test(msg)) return { message, action };
  }
  return { message: msg || "Something went wrong. Try again.", action: "retry" };
}
