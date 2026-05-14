import { useMemo } from "react";
import { color, font, radius, border } from "../tokens.js";
import { computeDiff } from "../lib/diffUtils.js";

// Unified diff view — shows original vs improved in git-diff style.
// Uses a memoized LCS diff so re-renders don't recompute the (potentially large) table.
export function DiffView({ original, improved, isMobile }) {
  const diff = useMemo(() => computeDiff(original, improved), [original, improved]);

  const added   = diff.filter(d => d.type === "added").length;
  const removed = diff.filter(d => d.type === "removed").length;

  const monoSize = isMobile ? "10px" : "11px";

  return (
    <div style={{ marginTop: "20px" }}>

      {/* Stats header */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.green }}>
          +{added}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.red }}>
          \u2212{removed}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.text8 }}>
          lines changed
        </span>
      </div>

      {/* No-change state */}
      {added === 0 && removed === 0 && (
        <div style={{
          padding: "16px 20px", background: color.surface1,
          border: border.default, borderRadius: radius.lg,
          fontFamily: font.mono, fontSize: "12px", color: color.text8,
        }}>
          No changes — the model returned the file unchanged.
        </div>
      )}

      {/* Diff lines */}
      {(added > 0 || removed > 0) && (
        <div style={{
          background: color.surface1, border: border.default,
          borderRadius: radius.lg, overflow: "hidden", overflowX: "auto",
        }}>
          {diff.map((entry, i) => {
            const isAdded   = entry.type === "added";
            const isRemoved = entry.type === "removed";
            const bg        = isAdded   ? color.bgDiffAdded
                            : isRemoved ? color.bgDiffRemoved
                            : "transparent";
            const prefix    = isAdded ? "+" : isRemoved ? "\u2212" : " ";
            const prefixColor = isAdded ? color.green : isRemoved ? color.red : color.textD;
            const lineColor   = isAdded ? color.diffAdded : isRemoved ? color.diffRemoved : color.text8;

            return (
              <div key={i} style={{ display: "flex", background: bg, minHeight: "20px" }}>
                <div style={{
                  width: isMobile ? "16px" : "20px",
                  textAlign: "center",
                  color: prefixColor,
                  fontFamily: font.mono,
                  fontSize: monoSize,
                  flexShrink: 0,
                  paddingTop: "2px",
                  userSelect: "none",
                }}>
                  {prefix}
                </div>
                <div style={{
                  flex: 1,
                  fontFamily: font.mono,
                  fontSize: monoSize,
                  color: lineColor,
                  padding: "2px 12px 2px 4px",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {entry.line || "\u00a0"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
