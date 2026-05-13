import { useState, useRef, useCallback, useEffect } from "react";
import { keyManager } from "./lib/keyManager";
import { KeyInput } from "./components/KeyInput";
import { runStaticAnalysis } from "./lib/staticAnalysis";

const CATEGORIES = [
  { id: "discoverability",       label: "Discoverability",        weight: 15 },
  { id: "instruction_quality",   label: "Instruction Quality",    weight: 20 },
  { id: "scope_boundaries",      label: "Scope & Boundaries",     weight: 12 },
  { id: "structural_integrity",  label: "Structural Integrity",   weight: 8  },
  { id: "token_economics",       label: "Token Economics",        weight: 10 },
  { id: "consistency_conflicts", label: "Consistency & Conflicts",weight: 10 },
  { id: "robustness",            label: "Robustness",             weight: 10 },
  { id: "examples_evidence",     label: "Examples & Evidence",    weight: 8  },
  { id: "maintainability",       label: "Maintainability",        weight: 4  },
  { id: "safety_side_effects",   label: "Safety & Side Effects",  weight: 3  },
];

const scoreColor = s => s >= 80 ? "#4ade80" : s >= 60 ? "#fbbf24" : s >= 40 ? "#fb923c" : "#f87171";
const scoreLabel = s => s >= 85 ? "EXCEPTIONAL" : s >= 65 ? "GOOD" : s >= 45 ? "NEEDS WORK" : s >= 25 ? "FAILING" : "CRITICAL";

const STORAGE_KEY = "skilllint_history_v1";
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const saveHistory = (h) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch { /* localStorage errors must not crash the app */ } };

const LOADING_MSGS = ["Parsing structure...", "Checking trigger precision...", "Scanning for conflicts...", "Measuring token density...", "Evaluating edge cases...", "Running 75 heuristics...", "Finalizing report..."];

const FONTS = <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />;
const BASE = { minHeight: "100vh", background: "#080808", color: "#e0e0e0", fontFamily: "'DM Sans',sans-serif" };

function NavBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "1px solid #161616", borderRadius: "4px",
      padding: "6px 14px", cursor: "pointer", color: "#666",
      fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", letterSpacing: ".08em", transition: "all .15s"
    }}
    onMouseEnter={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#aaa"; }}
    onMouseLeave={e => { e.target.style.borderColor = "#161616"; e.target.style.color = "#666"; }}>
      {label}
    </button>
  );
}

function Nav({ onLogoClick, right }) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 48px", height: "56px", borderBottom: "1px solid #0e0e0e",
      position: "sticky", top: 0, background: "#080808", zIndex: 10
    }}>
      <button onClick={onLogoClick} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{ width: "22px", height: "22px", border: "1.5px solid #ccc", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", fontWeight: "700", color: "#ccc" }}>SL</div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".08em", color: "#aaa" }}>skilllint<span style={{ color: "#2a2a2a" }}>.dev</span></span>
      </button>
      <div style={{ display: "flex", gap: "10px" }}>{right}</div>
    </nav>
  );
}

// ── ScoreArc ──────────────────────────────────────────────────────────────────
function ScoreArc({ score, size = 148 }) {
  const r = 54, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arc = (score / 100) * circ;
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="7"
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy - 8} textAnchor="middle" fill={col}
        fontSize="28" fontWeight="700" fontFamily="'JetBrains Mono',monospace">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#555"
        fontSize="8" fontFamily="'JetBrains Mono',monospace" letterSpacing="2.5">{scoreLabel(score)}</text>
    </svg>
  );
}

// ── CategoryRow ───────────────────────────────────────────────────────────────
function CategoryRow({ cat, data, index }) {
  const [open, setOpen] = useState(false);
  const col = scoreColor(data.score);
  const hasIssues = data.issues?.length > 0;

  return (
    <div style={{ borderBottom: "1px solid #0e0e0e" }}>
      <div onClick={() => hasIssues && setOpen(!open)} style={{
        display: "grid", gridTemplateColumns: "32px 1fr 160px 28px",
        alignItems: "center", gap: "16px", padding: "15px 0",
        cursor: hasIssues ? "pointer" : "default"
      }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#555" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <div style={{ fontSize: "13px", color: "#d0d0d0", fontWeight: "500", marginBottom: "2px" }}>{cat.label}</div>
          <div style={{ fontSize: "11px", color: "#888", lineHeight: 1.5 }}>{data.summary}</div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, height: "2px", background: "#141414", borderRadius: "1px" }}>
              <div style={{ height: "100%", width: `${data.score}%`, background: col, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: col, minWidth: "26px", textAlign: "right" }}>{data.score}</span>
          </div>
          <div style={{ marginTop: "4px", fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#555", letterSpacing: "0.1em" }}>{cat.weight}% WEIGHT</div>
        </div>
        <div style={{ color: "#555", fontSize: "14px", textAlign: "center", userSelect: "none", transition: "transform .2s", transform: open ? "rotate(45deg)" : "none" }}>
          {hasIssues ? "+" : "·"}
        </div>
      </div>

      {open && hasIssues && (
        <div style={{ paddingBottom: "16px", paddingLeft: "48px" }}>
          {data.issues.map((issue, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px",
              marginBottom: "1px",
            }}>
              <div style={{ padding: "11px 14px", background: "rgba(248,113,113,0.035)" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#f87171", letterSpacing: ".12em", marginBottom: "5px" }}>ISSUE</div>
                <div style={{ fontSize: "12px", color: "#aaa", lineHeight: 1.65 }}>{issue}</div>
              </div>
              <div style={{ padding: "11px 14px", background: "rgba(74,222,128,0.03)", borderLeft: "1px solid #0e0e0e" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#4ade80", letterSpacing: ".12em", marginBottom: "5px" }}>FIX</div>
                <div style={{ fontSize: "12px", color: "#aaa", lineHeight: 1.65 }}>{data.fixes?.[i] || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && !hasIssues && (
        <div style={{ paddingBottom: "14px", paddingLeft: "48px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#4ade80" }}>✓ No issues</div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function SkillLint() {
  const [view, setView] = useState("upload");
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState(() => loadHistory());
  const [msgIdx, setMsgIdx] = useState(0);
  const [hasKey, setHasKey] = useState(() => keyManager.isValid());
  const [staticResult, setStaticResult] = useState(null);
  const fileRef = useRef();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (view !== "loading") return;
    const t = setInterval(() => setMsgIdx(m => (m + 1) % LOADING_MSGS.length), 1900);
    return () => clearInterval(t);
  }, [view]);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f); setError(null);
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = () => rej(new Error("Failed to read file"));
      r.readAsText(f);
    }).then(text => {
      setContent(text);
      try { setStaticResult(runStaticAnalysis(text)); } catch { /* analysis errors must not block upload */ }
    }).catch(err => setError(err.message));
  }, []);

  const evaluate = async (apiKey) => {
    if (!content.trim()) return;
    setView("loading"); setMsgIdx(0); setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey || "",
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Evaluation failed");
      }
      if (!data.overall_score) {
        throw new Error("Empty response from evaluation. Try again.");
      }
      const entry = {
        id: Date.now(), filename: file?.name || "pasted",
        score: data.overall_score,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        result: data
      };
      const h = [entry, ...history].slice(0, 20);
      saveHistory(h); setHistory(h);
      setResult(data); setView("result");
    } catch (err) {
      setError(err.message || "Evaluation failed. Try again.");
      setView("upload");
    }
  };

  const reset = () => { setView("upload"); setFile(null); setContent(""); setResult(null); setError(null); setStaticResult(null); };

  const exportMd = () => {
    if (!result) return;
    const lines = [
      `# SkillLint Report — ${file?.name || "pasted"}`,
      `**Score:** ${result.overall_score}/100 (${scoreLabel(result.overall_score)})`,
      `**Verdict:** ${result.overall_verdict}`, "",
      `## Top Priority Fix`, result.top_priority_fix, "",
    ];
    if (result.rewritten_trigger) lines.push(`## Rewritten Trigger`, result.rewritten_trigger, "");
    lines.push(`## Breakdown`, "");
    CATEGORIES.forEach(cat => {
      const d = result.categories?.[cat.id]; if (!d) return;
      lines.push(`### ${cat.label} — ${d.score}/100`, d.summary, "");
      d.issues?.forEach((issue, i) => { lines.push(`**Issue:** ${issue}`, `**Fix:** ${d.fixes?.[i] || "—"}`, ""); });
    });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" })),
      download: `skilllint-${(file?.name || "report").replace(".md", "")}-report.md`
    });
    a.click();
  };


  // ── UPLOAD ──────────────────────────────────────────────────────────────────
  if (view === "upload") return (
    <div style={BASE}>
      {FONTS}
      <Nav onLogoClick={reset} right={[
        history.length > 0 && <NavBtn key="h" label={`HISTORY (${history.length})`} onClick={() => setView("history")} />
      ]} />
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 48px" }}>
        <div style={{ padding: "80px 0 56px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#555",
            letterSpacing: ".18em", border: "1px solid #1e1e1e",
            padding: "5px 10px", borderRadius: "2px", marginBottom: "28px"
          }}>
            <span style={{ width: "5px", height: "5px", background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
            75 HEURISTICS · 10 CATEGORIES
          </div>
          <h1 style={{ fontSize: "46px", fontWeight: "300", lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-.03em", color: "#efefef" }}>
            Lint your<br /><em style={{ fontStyle: "italic", color: "#444" }}>skill files.</em>
          </h1>
          <p style={{ fontSize: "14px", color: "#777", fontWeight: "300", maxWidth: "380px", lineHeight: 1.85, margin: 0 }}>
            Upload a <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#666", background: "#0f0f0f", padding: "2px 7px", borderRadius: "3px" }}>.md</code> skill file. Score it across 75 heuristics. Get specific rewrites for every failing dimension.
          </p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => !file && fileRef.current.click()}
          style={{
            border: `1px dashed ${dragOver ? "#333" : file ? "#1e1e1e" : "#141414"}`,
            borderRadius: "8px", padding: file ? "24px 28px" : "52px 28px",
            cursor: file ? "default" : "pointer",
            background: dragOver ? "#0c0c0c" : "#090909",
            transition: "all .15s", marginBottom: "14px"
          }}
        >
          <input ref={fileRef} type="file" accept=".md,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#4ade80", marginBottom: "3px" }}>✓ {file.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#666" }}>
                  {(file.size / 1024).toFixed(1)} KB · {content.split('\n').length} lines
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setFile(null); setContent(""); }} style={{
                background: "none", border: "1px solid #1a1a1a", borderRadius: "3px",
                padding: "5px 10px", cursor: "pointer", color: "#666",
                fontFamily: "'JetBrains Mono',monospace", fontSize: "9px"
              }}>CLEAR</button>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "22px", color: "#333", marginBottom: "10px" }}>↑</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#555", letterSpacing: ".1em" }}>DROP FILE OR CLICK TO BROWSE</div>
            </div>
          )}
        </div>

        {!file && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#555", letterSpacing: ".15em", marginBottom: "6px" }}>OR PASTE CONTENT</div>
            <textarea value={content} onChange={e => {
              const text = e.target.value;
              setContent(text);
              clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                if (text.trim()) try { setStaticResult(runStaticAnalysis(text)); } catch { /* analysis errors silent */ }
                else setStaticResult(null);
              }, 300);
            }}
              placeholder="Paste skill file content..."
              style={{
                width: "100%", height: "130px", background: "#090909",
                border: "1px solid #111", borderRadius: "6px", padding: "12px 14px",
                color: "#888", fontSize: "11px", fontFamily: "'JetBrains Mono',monospace",
                resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.7
              }}
              onFocus={e => e.target.style.borderColor = "#1e1e1e"}
              onBlur={e => e.target.style.borderColor = "#111"}
            />
          </div>
        )}

        <KeyInput onKeySet={() => setHasKey(true)} onKeyClear={() => setHasKey(false)} />

        {staticResult && (
          <div style={{ marginBottom: "14px", padding: "16px 18px", background: "#090909", border: "1px solid #141414", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#666", letterSpacing: ".15em" }}>STRUCTURE SCORE</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "18px", fontWeight: "700", color: scoreColor(staticResult.staticScore) }}>{staticResult.staticScore}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#555" }}>/ 100</span>
              </div>
            </div>
            {Object.entries(staticResult.staticCategories).map(([id, data]) => {
              const cat = CATEGORIES.find(c => c.id === id);
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#555", flex: "0 0 140px" }}>{cat?.label || id}</div>
                  <div style={{ flex: 1, height: "2px", background: "#141414", borderRadius: "1px" }}>
                    <div style={{ height: "100%", width: `${data.score}%`, background: scoreColor(data.score) }} />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: scoreColor(data.score), minWidth: "24px", textAlign: "right" }}>{data.score}</span>
                </div>
              );
            })}
            <div style={{ marginTop: "10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#444", letterSpacing: ".1em" }}>
              {staticResult.heuristicsEvaluated} of 75 heuristics · add key for full evaluation
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#100808", border: "1px solid #2a0f0f", borderRadius: "4px" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#f87171" }}>{error}</span>
          </div>
        )}

        <button
          disabled={!content.trim()}
          onClick={() => {
            if (!hasKey) {
              document.getElementById("key-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            evaluate(keyManager.get());
          }}
          style={{
            width: "100%", padding: "15px",
            background: content.trim() ? "#e8e8e8" : "#0e0e0e",
            color: content.trim() ? "#080808" : "#222",
            border: "none", borderRadius: "6px",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "11px",
            letterSpacing: ".1em", fontWeight: "600",
            cursor: content.trim() ? "pointer" : "default",
            transition: "all .2s", marginBottom: "72px"
          }}
          onMouseEnter={e => content.trim() && (e.currentTarget.style.background = "#fff")}
          onMouseLeave={e => content.trim() && (e.currentTarget.style.background = "#e8e8e8")}
        >{hasKey ? "RUN EVALUATION →" : "ADD KEY TO EVALUATE →"}</button>
      </div>
    </div>
  );

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (view === "loading") return (
    <div style={{ ...BASE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "28px" }}>
      {FONTS}
      <style>{`@keyframes bar { from { background:#111; transform:scaleY(.5); } to { background:#3a3a3a; transform:scaleY(1); } }`}</style>
      <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "36px" }}>
        {CATEGORIES.map((_, i) => (
          <div key={i} style={{ width: "3px", height: "100%", background: "#111", borderRadius: "2px", animation: `bar 0.9s ease-in-out ${i * 0.09}s infinite alternate`, transformOrigin: "bottom" }} />
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#888", letterSpacing: ".06em", minHeight: "18px" }}>{LOADING_MSGS[msgIdx]}</div>
        <div style={{ marginTop: "6px", fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#555" }}>{file?.name || "pasted content"}</div>
      </div>
    </div>
  );

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (view === "result" && result) {
    const col = scoreColor(result.overall_score);
    const stats = result.file_stats || {};
    return (
      <div style={BASE}>
        {FONTS}
        <Nav onLogoClick={reset} right={[
          <NavBtn key="exp" label="EXPORT .MD" onClick={exportMd} />,
          <NavBtn key="hist" label="HISTORY" onClick={() => setView("history")} />,
          <NavBtn key="new" label="NEW FILE" onClick={reset} />
        ]} />
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 48px 80px" }}>

          {/* Hero */}
          <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", gap: "40px", alignItems: "center", padding: "52px 0 40px", borderBottom: "1px solid #0e0e0e" }}>
            <ScoreArc score={result.overall_score} size={148} />
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#666", letterSpacing: ".15em", marginBottom: "6px" }}>
                {file?.name || "pasted content"}
              </div>
              <div style={{ fontSize: "17px", fontWeight: "300", lineHeight: 1.6, color: "#ccc", marginBottom: "20px", maxWidth: "440px" }}>
                {result.overall_verdict}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { label: "~tokens", value: result.token_estimate || "?" },
                  { label: "lines", value: stats.lines || "?" },
                  { label: "examples", value: stats.has_examples ? "✓" : "✗", ok: stats.has_examples },
                  { label: "output spec", value: stats.has_output_spec ? "✓" : "✗", ok: stats.has_output_spec },
                  { label: "neg. triggers", value: stats.has_negative_triggers ? "✓" : "✗", ok: stats.has_negative_triggers },
                ].map(s => (
                  <div key={s.label} style={{ padding: "8px 12px", background: "#0b0b0b", border: "1px solid #141414", borderRadius: "5px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#666", letterSpacing: ".1em", marginBottom: "3px" }}>{s.label.toUpperCase()}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", fontWeight: "600", color: s.ok === undefined ? "#666" : s.ok ? "#4ade80" : "#f87171" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top fix */}
          <div style={{ margin: "28px 0", padding: "18px 22px", background: "#0b0b09", border: "1px solid #1c1c14", borderLeft: `3px solid ${col}`, borderRadius: "6px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: col, letterSpacing: ".15em", marginBottom: "9px" }}>TOP PRIORITY FIX</div>
            <div style={{ fontSize: "14px", color: "#bbb", lineHeight: 1.8 }}>{result.top_priority_fix}</div>
          </div>

          {/* Rewritten trigger */}
          {result.rewritten_trigger && (
            <div style={{ marginBottom: "28px", padding: "18px 22px", background: "#090c09", border: "1px solid #141e14", borderLeft: "3px solid #4ade80", borderRadius: "6px" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#4ade80", letterSpacing: ".15em", marginBottom: "9px" }}>REWRITTEN TRIGGER</div>
              <div style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.85, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-wrap" }}>{result.rewritten_trigger}</div>
            </div>
          )}

          {/* Breakdown header */}
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 160px 28px", gap: "16px", padding: "10px 0 10px", borderBottom: "1px solid #0e0e0e", marginBottom: "0" }}>
            {["#", "CATEGORY", "SCORE", ""].map((h, i) => (
              <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#555", letterSpacing: ".12em" }}>{h}</span>
            ))}
          </div>

          {CATEGORIES.map((cat, i) => {
            const d = result.categories?.[cat.id];
            return d ? <CategoryRow key={cat.id} cat={cat} data={d} index={i} /> : null;
          })}

        </div>
      </div>
    );
  }

  // ── HISTORY ─────────────────────────────────────────────────────────────────
  if (view === "history") return (
    <div style={BASE}>
      {FONTS}
      <Nav onLogoClick={reset} right={[<NavBtn key="b" label="← BACK" onClick={() => setView("upload")} />]} />
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "52px 48px" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#666", letterSpacing: ".2em", marginBottom: "28px" }}>EVALUATION HISTORY</div>
        {history.length === 0 ? (
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#555" }}>No evaluations yet.</div>
        ) : history.map(entry => (
          <div key={entry.id} onClick={() => { setResult(entry.result); setFile({ name: entry.filename }); setView("result"); }}
            style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: "1px solid #0e0e0e", cursor: "pointer", transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".6"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "20px", fontWeight: "700", color: scoreColor(entry.score) }}>{entry.score}</div>
            <div>
              <div style={{ fontSize: "13px", color: "#bbb", marginBottom: "2px" }}>{entry.filename}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#666" }}>{entry.date}</div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: "#555", letterSpacing: ".1em" }}>LOAD →</div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}
