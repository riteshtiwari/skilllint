// Line-level LCS (Longest Common Subsequence) diff.
// O(n²) time and space — fast enough for skill files, which are always short.
// Capped at LINE_CAP lines per side: above the cap, falls back to a flat
// removed-then-added diff to prevent a main-thread freeze on pathological inputs.

const LINE_CAP = 500;

function lcs(a, b) {
  const m = a.length;
  const n = b.length;

  // Use Int32Array for the DP table — significantly less GC pressure than
  // nested regular arrays at this size.
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack through the DP table to produce labeled lines.
  const result = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: "unchanged", line: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", line: b[j - 1] });
      j--;
    } else {
      result.push({ type: "removed", line: a[i - 1] });
      i--;
    }
  }

  result.reverse();
  return result;
}

// Returns an array of { type: "added" | "removed" | "unchanged", line: string }.
// When either input exceeds LINE_CAP lines, returns all original lines as "removed"
// followed by all improved lines as "added" — still shows what changed, just without
// the common-subsequence context.
export function computeDiff(original, improved) {
  const a = original.split("\n");
  const b = improved.split("\n");

  if (a.length > LINE_CAP || b.length > LINE_CAP) {
    return [
      ...a.map(line => ({ type: "removed", line })),
      ...b.map(line => ({ type: "added", line })),
    ];
  }

  return lcs(a, b);
}
