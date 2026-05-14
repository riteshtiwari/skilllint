import { useState, useRef, useCallback, useEffect } from "react";
import { useUser, useClerk, useSession } from "@clerk/clerk-react";
import { color, font, border, radius } from "./tokens.js";
import { keyManager } from "./lib/keyManager";
import { KeyInput } from "./components/KeyInput";
import { Landing } from "./components/Landing";
import { HamburgerMenu } from "./components/HamburgerMenu";
import { runStaticAnalysis } from "./lib/staticAnalysis";
import { saveEvaluation, loadHistory, deleteEvaluation, deleteAllEvaluations } from "./lib/history";

const CATEGORIES = [
  { id: "discoverability",       label: "Discoverability",        weight: 15 },
  { id: "instruction_quality",   label: "Instruction Quality",    weight: 18 },
  { id: "scope_boundaries",      label: "Scope & Boundaries",     weight: 12 },
  { id: "structural_integrity",  label: "Structural Integrity",   weight: 7  },
  { id: "token_economics",       label: "Token Economics",        weight: 10 },
  { id: "consistency_conflicts", label: "Consistency & Conflicts",weight: 10 },
  { id: "robustness",            label: "Robustness",             weight: 10 },
  { id: "examples_evidence",     label: "Examples & Evidence",    weight: 7  },
  { id: "maintainability",       label: "Maintainability",        weight: 3  },
  { id: "security",              label: "Security",               weight: 8  },
];

const scoreColor = s => s >= 80 ? color.green : s >= 60 ? color.amber : s >= 40 ? color.orange : color.red;
const scoreLabel = s => s >= 85 ? "EXCEPTIONAL" : s >= 65 ? "GOOD" : s >= 45 ? "NEEDS WORK" : s >= 25 ? "FAILING" : "CRITICAL";
const monoScoreColor = s => s >= 80 ? color.scoreHi : s >= 60 ? color.scoreMid : color.scoreLo;
const monoScoreUnderline = s => s >= 80 ? null : s >= 60 ? `1.5px solid ${color.underlineMid}` : `1.5px solid ${color.underlineLo}`;

const LOADING_MSGS = ["Parsing structure...", "Checking trigger precision...", "Scanning for conflicts...", "Measuring token density...", "Evaluating edge cases...", "Running 75 heuristics...", "Finalizing report..."];

const BASE = { minHeight: "100vh", background: color.bg, color: color.text3, fontFamily: font.sans };

// Heuristic check — does this text look like a skill file?
function looksLikeSkillFile(text) {
  const hasDescriptionOrTrigger =
    /^description:/im.test(text) ||
    /^trigger:/im.test(text) ||
    /^## (description|trigger|when to use|overview)/im.test(text);
  const hasInstructionalLanguage =
    /(^|\n)\s*(use |run |call |load |read |write |create |generate |do not |never |always )/im.test(text);
  return hasDescriptionOrTrigger || hasInstructionalLanguage;
}

function NavBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "1px solid #333", borderRadius: radius.md,
      padding: "6px 14px", cursor: "pointer", color: color.text4,
      fontFamily: font.mono, fontSize: "10px", letterSpacing: ".08em", transition: "all .15s"
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color.brand; e.currentTarget.style.color = color.brand; e.currentTarget.style.background = color.surface4; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = color.text4; e.currentTarget.style.background = "none"; }}>
      {label}
    </button>
  );
}

function Nav({ onLogoClick, right, center }) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 48px", height: "60px", borderBottom: border.strong,
      position: "sticky", top: 0, background: color.bg, zIndex: 10
    }}>
      <button onClick={onLogoClick} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{ width: "24px", height: "24px", border: `1.5px solid ${color.brand}`, display: "grid", placeItems: "center", fontFamily: font.mono, fontSize: "9px", fontWeight: "700", color: color.brand }}>SL</div>
        <span style={{ fontFamily: font.mono, fontSize: "13px", letterSpacing: ".06em", color: color.text4 }}>skilllint<span style={{ color: color.text8 }}>.dev</span></span>
      </button>
      {center && <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>{center}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>{right}</div>
    </nav>
  );
}

// ── StaticCategoryRow ─────────────────────────────────────────────────────────
function StaticCategoryRow({ label, data, last }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${color.surface3}` }}>
      <div
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 0", cursor: "pointer",
          background: hovered ? "#141414" : "transparent",
          margin: "0 -24px", paddingLeft: "24px", paddingRight: "24px",
          transition: "background 0.12s",
        }}
      >
        <div style={{ fontFamily: font.mono, fontSize: "12px", color: color.text4, flex: "0 0 160px" }}>{label}</div>
        <div style={{ flex: 1, height: "3px", background: color.barTrack, borderRadius: "2px" }}>
          <div style={{ height: "100%", width: `${data.score}%`, background: color.barFill, borderRadius: "2px" }} />
        </div>
        <div style={{ minWidth: "24px", textAlign: "right" }}>
          <span style={{
            fontFamily: font.mono, fontSize: "12px", fontWeight: "600",
            color: monoScoreColor(data.score),
            borderBottom: monoScoreUnderline(data.score),
            paddingBottom: monoScoreUnderline(data.score) ? "1px" : undefined,
          }}>{data.score}</span>
        </div>
        <div
          style={{ width: "16px", textAlign: "center", fontFamily: font.mono, fontSize: "14px", color: hovered ? "#aaa" : color.text8, transition: "color 0.12s", flexShrink: 0 }}
        >{open ? "−" : "+"}</div>
      </div>

      {open && (
        <div style={{ background: "#111", borderRadius: "4px", padding: "12px 14px", margin: "2px 0 8px" }}>
          <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.text8, letterSpacing: "0.12em", marginBottom: "8px" }}>
            CHECKED: {data.checkedSummary}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: data.improvement ? "10px" : 0 }}>
            {data.checks?.map((chk, i) => (
              <div key={i} style={{
                fontFamily: font.mono,
                fontSize: chk.passed ? "11px" : "12px",
                color: chk.passed ? color.text7 : "#aaa",
                lineHeight: 1.5,
              }}>
                {chk.passed ? "✓" : "✗"} {chk.text}
              </div>
            ))}
          </div>
          {data.improvement && (
            <>
              <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.text8, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "10px", marginBottom: "4px" }}>
                HOW TO IMPROVE
              </div>
              <div style={{ fontFamily: font.sans, fontSize: "12px", color: "#888", lineHeight: 1.6 }}>
                {data.improvement}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── ScoreArc ──────────────────────────────────────────────────────────────────
function ScoreArc({ score, size = 160 }) {
  const r = 58, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arc = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color.barTrack} strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color.barFill} strokeWidth="8"
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={color.scoreNum}
        fontSize="42" fontWeight="700" fontFamily={font.mono}>{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill={color.scoreCaption}
        fontSize="10" fontFamily={font.mono} letterSpacing="2">{scoreLabel(score)}</text>
    </svg>
  );
}

// ── CategoryRow ───────────────────────────────────────────────────────────────
function CategoryRow({ cat, data, index }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasIssues = data.issues?.length > 0;

  return (
    <div style={{ borderBottom: `1px solid ${color.surface3}` }}>
      <div
        onClick={() => hasIssues && setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "grid", gridTemplateColumns: "36px 1fr 180px 28px",
          alignItems: "center", gap: "16px",
          cursor: hasIssues ? "pointer" : "default",
          background: hovered ? color.surface4 : "transparent",
          margin: "0 -48px",
          padding: "20px 48px",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.text7 }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <div style={{ fontSize: "14px", color: color.text1, fontWeight: "500", marginBottom: "4px" }}>{cat.label}</div>
          <div style={{ fontSize: "13px", color: color.text5, lineHeight: 1.6 }}>{data.summary}</div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "4px", background: color.barTrack, borderRadius: "2px" }}>
              <div style={{ height: "100%", width: `${data.score}%`, background: color.barFill, borderRadius: "2px", transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
            </div>
            <div style={{ minWidth: "28px", textAlign: "right" }}>
              <span style={{ fontFamily: font.mono, fontSize: "14px", fontWeight: "600", color: monoScoreColor(data.score), borderBottom: monoScoreUnderline(data.score), paddingBottom: monoScoreUnderline(data.score) ? "1px" : undefined }}>{data.score}</span>
            </div>
          </div>
          <div style={{ marginTop: "5px", fontFamily: font.mono, fontSize: "10px", color: color.text7, letterSpacing: "0.1em" }}>{cat.weight}% WEIGHT</div>
        </div>
        <div style={{ color: color.text6, fontSize: "16px", textAlign: "center", userSelect: "none", transition: "transform .2s", transform: open ? "rotate(45deg)" : "none" }}>
          {hasIssues ? "+" : "·"}
        </div>
      </div>

      {open && hasIssues && (
        <div style={{ paddingBottom: "20px", paddingLeft: "52px" }}>
          {data.issues.map((issue, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", marginBottom: "1px" }}>
              <div style={{ padding: "14px 16px", background: "rgba(248,113,113,0.04)" }}>
                <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.red, letterSpacing: ".12em", marginBottom: "6px" }}>ISSUE</div>
                <div style={{ fontSize: "13px", color: color.text6, lineHeight: 1.65 }}>{issue}</div>
              </div>
              <div style={{ padding: "14px 16px", background: "rgba(74,222,128,0.03)", borderLeft: `1px solid ${color.surface3}` }}>
                <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.green, letterSpacing: ".12em", marginBottom: "6px" }}>FIX</div>
                <div style={{ fontSize: "13px", color: color.text6, lineHeight: 1.65 }}>{data.fixes?.[i] || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && !hasIssues && (
        <div style={{ paddingBottom: "16px", paddingLeft: "52px", fontFamily: font.mono, fontSize: "12px", color: color.green }}>No issues</div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function SkillLint() {
  const { isLoaded: clerkLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { session } = useSession();
  const [view, setView] = useState("landing");
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [hasKey, setHasKey] = useState(() => keyManager.isValid());
  const [staticResult, setStaticResult] = useState(null);
  const [fileWarning, setFileWarning] = useState(null);
  const fileRef = useRef();
  const debounceRef = useRef(null);
  const prevSignedIn = useRef(false);

  const getToken = useCallback(() =>
    session?.getToken({ template: "supabase" }), [session]);

  useEffect(() => {
    if (view !== "loading") return;
    const t = setInterval(() => setMsgIdx(m => (m + 1) % LOADING_MSGS.length), 1900);
    return () => clearInterval(t);
  }, [view]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Navigate to upload on sign-in, reset to landing on sign-out
  useEffect(() => {
    if (!clerkLoaded) return;
    if (prevSignedIn.current === false && isSignedIn) {
      setView("upload");
      setHistoryLoading(true);
      getToken().then(token => {
        if (!token) return;
        return loadHistory({ clerkToken: token });
      }).then(data => {
        if (data) setHistory(data);
      }).catch(() => {
        // History load failure must not block the app
      }).finally(() => setHistoryLoading(false));
    }
    if (prevSignedIn.current === true && !isSignedIn) {
      keyManager.clear();
      setView("landing");
      setFile(null);
      setContent("");
      setResult(null);
      setError(null);
      setStaticResult(null);
      setFileWarning(null);
      setHasKey(false);
      setHistory([]);
    }
    prevSignedIn.current = isSignedIn;
  }, [clerkLoaded, isSignedIn, getToken]);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f); setError(null); setStaticResult(null); setFileWarning(null);
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = () => rej(new Error("Failed to read file"));
      r.readAsText(f);
    }).then(text => {
      setContent(text);
      if (!looksLikeSkillFile(text)) {
        setFileWarning("This doesn't look like a skill file. Skill files should have a description field and instructional content.");
      }
    }).catch(err => setError(err.message));
  }, []);

  const runFreeAnalysis = () => {
    if (!content.trim()) return;
    try {
      setStaticResult(runStaticAnalysis(content));
    } catch {
      setError("Static analysis failed. Check that your file is valid text.");
    }
  };

  const evaluate = async (apiKey) => {
    if (!content.trim()) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    setView("loading"); setMsgIdx(0); setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey || "",
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // Error responses are JSON; success is a streamed text response
      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch { errData = {}; }
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      // Read the streamed text, flushing decoder at end
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) { raw += decoder.decode(); break; }
        raw += decoder.decode(value, { stream: true });
      }

      // Check sentinel — if missing, stream was truncated before completion
      const SENTINEL_DONE  = "\n__DONE__\n";
      const SENTINEL_ERROR = "\n__ERROR__:";
      if (raw.includes(SENTINEL_ERROR)) {
        const msg = raw.split(SENTINEL_ERROR)[1]?.trim() || "API error during evaluation";
        throw new Error(msg);
      }
      if (!raw.includes(SENTINEL_DONE)) {
        throw new Error("Evaluation timed out mid-response. Try again.");
      }

      const body = raw.split(SENTINEL_DONE)[0];
      const clean = body.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      if (!clean) throw new Error("Empty response from evaluation. Try again.");

      let data;
      try {
        data = JSON.parse(clean);
      } catch {
        throw new Error("Failed to parse evaluation response. Try again.");
      }

      if (data.overall_score == null) {
        throw new Error("Empty response from evaluation. Try again.");
      }
      setResult(data); setView("result");
      // Save to Supabase in the background — failure must not affect the result view
      getToken().then(token => {
        if (!token) return;
        return saveEvaluation({
          clerkToken: token,
          userId: user.id,
          filename: file?.name || "pasted",
          score: data.overall_score,
          staticScore: null,
          result: data,
          staticResult: null,
        });
      }).then(saved => {
        if (saved) {
          const entry = {
            id: saved.id,
            filename: file?.name || "pasted",
            score: data.overall_score,
            created_at: saved.created_at,
            result: data,
          };
          setHistory(prev => [entry, ...prev].slice(0, 20));
        }
      }).catch(() => {
        // History save failure must not affect the result view
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("Evaluation timed out. Try again with a shorter file.");
      } else {
        setError(err.message || "Evaluation failed. Try again.");
      }
      setView("upload");
    }
  };

  const reset = () => { setView("upload"); setFile(null); setContent(""); setResult(null); setError(null); setStaticResult(null); setFileWarning(null); };

  const clearHistory = () => {
    setHistory([]);
    getToken().then(token => {
      if (!token) return;
      return deleteAllEvaluations({ clerkToken: token, userId: user.id });
    }).catch(() => {
      // Deletion failure is non-fatal — optimistic update already applied
    });
  };

  const deleteHistoryEntry = (id) => {
    setHistory(prev => prev.filter(e => e.id !== id));
    getToken().then(token => {
      if (!token) return;
      return deleteEvaluation({ clerkToken: token, id });
    }).catch(() => {
      // Deletion failure is non-fatal
    });
  };

  const loadEntry = (entry) => { setResult(entry.result); setFile({ name: entry.filename }); setView("result"); };

  const appMenu = (
    <HamburgerMenu
      historyCount={history.length}
      onHistory={() => setView("history")}
      onSettings={() => setView("settings")}
      onSignOut={() => signOut({ redirectUrl: "/" })}
    />
  );

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
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skilllint-${(file?.name || "report").replace(".md", "")}-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };


  // ── LANDING ─────────────────────────────────────────────────────────────────
  if (view === "landing") return <Landing onStart={() => setView("upload")} />;

  // ── UPLOAD ──────────────────────────────────────────────────────────────────
  if (view === "upload") return (
    <div style={BASE}>
      <Nav onLogoClick={() => setView("landing")} right={appMenu} />

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 64px" }}>

        {/* Hero */}
        <div style={{ paddingTop: "52px" }}>
          <div style={{
            fontFamily: font.mono, fontSize: "11px", color: color.text8,
            letterSpacing: ".18em", marginBottom: "16px"
          }}>
            80 HEURISTICS · 10 CATEGORIES
          </div>
          <h1 style={{ fontSize: "56px", fontWeight: "300", lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-.02em", color: color.text2 }}>
            Lint your<br /><em style={{ fontStyle: "italic", color: color.text8 }}>skill files.</em>
          </h1>
          <p style={{ fontSize: "16px", color: color.text8, fontWeight: "300", lineHeight: 1.7, margin: "0 0 40px" }}>
            Upload a <code style={{ fontFamily: font.mono, fontSize: "13px", color: color.text7, background: color.surface2, padding: "2px 7px", borderRadius: radius.sm, border: border.default }}>.md</code> skill file. Score it across 75 heuristics. Get specific rewrites for every failing dimension.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => !file && fileRef.current.click()}
          onMouseEnter={e => { if (!file && !dragOver) { e.currentTarget.style.borderColor = color.brand; e.currentTarget.style.background = color.surface2; } }}
          onMouseLeave={e => { if (!file && !dragOver) { e.currentTarget.style.borderColor = color.surface8; e.currentTarget.style.background = color.surface0; } }}
          style={{
            border: `1px dashed ${dragOver ? color.green : color.surface8}`,
            borderRadius: radius.xl,
            padding: "48px 32px",
            cursor: file ? "default" : "pointer",
            background: dragOver ? color.bgGood : color.surface0,
            transition: "all .15s",
            textAlign: "center",
          }}
        >
          <input ref={fileRef} type="file" accept=".md,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
              <div>
                <div style={{ fontFamily: font.mono, fontSize: "16px", color: color.green, marginBottom: "6px", fontWeight: "500" }}>{file.name}</div>
                <div style={{ fontFamily: font.mono, fontSize: "13px", color: color.text8 }}>
                  {(file.size / 1024).toFixed(1)} KB · {content.split('\n').length} lines
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setFile(null); setContent(""); setStaticResult(null); setFileWarning(null); }}
                style={{
                  background: "none", border: "1px solid #333", borderRadius: radius.sm,
                  padding: "6px 12px", cursor: "pointer", color: color.text8,
                  fontFamily: font.mono, fontSize: "10px", letterSpacing: ".08em",
                  transition: "all .15s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color.brand; e.currentTarget.style.color = color.brand; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = color.text8; }}
              >CLEAR</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "20px", color: dragOver ? color.green : color.text7, marginBottom: "10px", transition: "color .15s" }}>↑</div>
              <div style={{ fontFamily: font.mono, fontSize: "13px", color: dragOver ? color.green : color.text8, letterSpacing: ".1em", transition: "color .15s", marginBottom: "4px" }}>DROP FILE OR CLICK TO BROWSE</div>
              <div style={{ fontFamily: font.mono, fontSize: "12px", color: color.text8 }}>.md or .txt</div>
            </>
          )}
        </div>

        {/* File warning */}
        {fileWarning && (
          <div style={{ marginTop: "16px", padding: "16px 20px", background: color.bgWarning, borderLeft: border.warning, borderRadius: radius.md }}>
            <div style={{ fontFamily: font.mono, fontSize: "11px", color: color.amber, marginBottom: "6px", letterSpacing: ".08em" }}>WARNING</div>
            <div style={{ fontSize: "14px", color: color.text4, lineHeight: 1.6, marginBottom: "8px" }}>{fileWarning}</div>
            <button
              onClick={() => setFileWarning(null)}
              style={{ background: "none", border: "none", padding: 0, fontFamily: font.mono, fontSize: "13px", color: color.text8, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = color.text4}
              onMouseLeave={e => e.currentTarget.style.color = color.text8}
            >Proceed anyway</button>
          </div>
        )}

        {/* Paste textarea — only when no file */}
        {!file && (
          <div>
            <div style={{ fontFamily: font.mono, fontSize: "11px", color: color.text8, letterSpacing: ".1em", marginTop: "24px", marginBottom: "8px" }}>OR PASTE CONTENT</div>
            <textarea value={content} onChange={e => { setContent(e.target.value); setStaticResult(null); setFileWarning(null); }}
              placeholder="Paste skill file content..."
              style={{
                width: "100%", height: "80px", background: color.surface1,
                border: border.faint, borderRadius: radius.lg, padding: "10px 14px",
                color: color.text8, fontSize: "13px", fontFamily: font.mono,
                resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6,
                transition: "border-color .15s"
              }}
              onMouseEnter={e => { if (document.activeElement !== e.target) e.target.style.borderColor = color.brand; }}
              onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderColor = color.surface6; }}
              onFocus={e => e.target.style.borderColor = color.brand}
              onBlur={e => e.target.style.borderColor = color.surface6}
            />
          </div>
        )}

        {/* Static analysis result — only shown after explicit click */}
        {staticResult && (
          staticResult.invalidFile ? (
            <div style={{ marginTop: "24px", fontFamily: font.mono, fontSize: "13px", color: color.text8, lineHeight: 1.6 }}>
              This doesn&apos;t look like a skill file.
            </div>
          ) : (
            <div style={{ marginTop: "24px", padding: "20px 24px", background: color.surface1, border: border.strong, borderRadius: radius.lg }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "20px" }}>
                <div style={{ fontFamily: font.mono, fontSize: "11px", color: color.scoreCaption, letterSpacing: ".15em" }}>STRUCTURE SCORE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontFamily: font.mono, fontSize: "52px", fontWeight: "700", lineHeight: 1, color: color.scoreNum }}>{staticResult.staticScore}</span>
                  <span style={{ fontFamily: font.mono, fontSize: "20px", color: color.scoreDenom }}>/ 100</span>
                </div>
              </div>
              {Object.entries(staticResult.staticCategories).map(([id, data], i, arr) => {
                const cat = CATEGORIES.find(c => c.id === id);
                return (
                  <StaticCategoryRow
                    key={id}
                    label={cat?.label || id}
                    data={data}
                    last={i === arr.length - 1}
                  />
                );
              })}
              <div style={{ marginTop: "12px", fontFamily: font.mono, fontSize: "11px", color: color.text8, lineHeight: 1.6 }}>
                {staticResult.heuristicsEvaluated} of 80 heuristics — add key in Settings for full evaluation
              </div>
            </div>
          )
        )}

        {error && (
          <div style={{ marginTop: "20px", padding: "12px 16px", background: color.bgError, border: `1px solid ${color.borderError}`, borderRadius: radius.md }}>
            <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.red }}>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "24px", marginBottom: "80px" }}>
          {hasKey ? (
            <button
              disabled={!content.trim()}
              onClick={() => {
                if (!keyManager.isValid()) { setHasKey(false); setView("settings"); return; }
                evaluate(keyManager.get());
              }}
              style={{
                width: "100%", padding: "0", height: "52px",
                background: content.trim() ? color.btnPrimary : color.surface3,
                color: content.trim() ? color.btnPrimaryText : color.textD,
                border: content.trim() ? "none" : border.default,
                borderRadius: radius.lg,
                fontFamily: font.mono, fontSize: "13px",
                letterSpacing: ".1em", fontWeight: "700",
                cursor: content.trim() ? "pointer" : "default",
                transition: "all .15s"
              }}
              onMouseEnter={e => { if (content.trim()) { e.currentTarget.style.background = color.btnPrimaryHover; e.currentTarget.style.color = color.btnPrimaryText; } }}
              onMouseLeave={e => { if (content.trim()) { e.currentTarget.style.background = color.btnPrimary; e.currentTarget.style.color = color.btnPrimaryText; } }}
            >RUN FULL EVALUATION — 80 HEURISTICS</button>
          ) : (
            <>
              <button
                disabled={!content.trim()}
                onClick={runFreeAnalysis}
                style={{
                  width: "100%", padding: "0", height: "52px",
                  background: content.trim() ? color.btnPrimary : color.surface3,
                  color: content.trim() ? color.btnPrimaryText : color.textD,
                  border: content.trim() ? "none" : border.default,
                  borderRadius: radius.lg,
                  fontFamily: font.mono, fontSize: "13px",
                  letterSpacing: ".1em", fontWeight: "700",
                  cursor: content.trim() ? "pointer" : "default",
                  transition: "all .15s"
                }}
                onMouseEnter={e => { if (content.trim()) { e.currentTarget.style.background = color.btnPrimaryHover; e.currentTarget.style.color = color.btnPrimaryText; } }}
                onMouseLeave={e => { if (content.trim()) { e.currentTarget.style.background = color.btnPrimary; e.currentTarget.style.color = color.btnPrimaryText; } }}
              >RUN FREE ANALYSIS — 27 HEURISTICS</button>
              <button
                onClick={() => setView("settings")}
                style={{
                  width: "100%", padding: "0", height: "52px",
                  background: color.surface3,
                  color: color.text8,
                  border: "1px solid #333",
                  borderRadius: radius.lg,
                  fontFamily: font.mono, fontSize: "13px",
                  letterSpacing: ".1em", fontWeight: "600",
                  cursor: "pointer",
                  transition: "all .15s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color.brand; e.currentTarget.style.color = color.brand; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = color.text8; }}
              >RUN FULL EVALUATION — 80 HEURISTICS, ADD KEY IN SETTINGS</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (view === "loading") return (
    <div style={{ ...BASE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "40px" }}>
      <style>{`@keyframes bar { from { background:#333; transform:scaleY(.4); } to { background:#ccc; transform:scaleY(1); } }`}</style>
      <div style={{ display: "flex", gap: "5px", alignItems: "flex-end", height: "64px" }}>
        {CATEGORIES.map((_, i) => (
          <div key={i} style={{ width: "4px", height: "100%", background: "#333", borderRadius: "2px", animation: `bar 0.9s ease-in-out ${i * 0.09}s infinite alternate`, transformOrigin: "bottom" }} />
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: font.mono, fontSize: "15px", color: "#e8e8e8", letterSpacing: ".08em", minHeight: "24px" }}>{LOADING_MSGS[msgIdx]}</div>
        <div style={{ marginTop: "10px", fontFamily: font.mono, fontSize: "12px", color: color.text7 }}>{file?.name || "pasted content"}</div>
      </div>
    </div>
  );

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (view === "result" && result) {
    const col = scoreColor(result.overall_score);
    const stats = result.file_stats || {};
    return (
      <div style={BASE}>
        <Nav onLogoClick={() => setView("landing")} right={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <NavBtn label="EXPORT .MD" onClick={exportMd} />
            <NavBtn label="NEW FILE" onClick={reset} />
            {appMenu}
          </div>
        } />
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 48px 80px" }}>

          {/* Hero */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "40px", alignItems: "center", padding: "52px 0 40px", borderBottom: `1px solid ${color.surface3}` }}>
            <ScoreArc score={result.overall_score} size={160} />
            <div>
              <div style={{ fontFamily: font.mono, fontSize: "13px", color: color.text8, marginBottom: "8px" }}>
                {file?.name || "pasted content"}
              </div>
              <div style={{ fontSize: "17px", fontWeight: "300", lineHeight: 1.6, color: color.text4, marginBottom: "20px", maxWidth: "440px" }}>
                {result.overall_verdict}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { label: "~tokens", value: result.token_estimate || "?" },
                  { label: "lines", value: stats.lines || "?" },
                  { label: "examples", value: stats.has_examples ? "yes" : "no", ok: stats.has_examples },
                  { label: "output spec", value: stats.has_output_spec ? "yes" : "no", ok: stats.has_output_spec },
                  { label: "neg. triggers", value: stats.has_negative_triggers ? "yes" : "no", ok: stats.has_negative_triggers },
                ].map(s => (
                  <div key={s.label} style={{ padding: "10px 14px", background: color.surface1, border: `1px solid ${color.surface5}`, borderRadius: "5px" }}>
                    <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.text8, letterSpacing: ".1em", marginBottom: "4px" }}>{s.label.toUpperCase()}</div>
                    <div style={{ fontFamily: font.mono, fontSize: "14px", fontWeight: "600", color: s.ok === undefined ? color.text7 : s.ok ? color.green : color.red }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top fix */}
          <div style={{ margin: "28px 0", padding: "20px 24px", background: color.bgTopFix, border: border.default, borderLeft: `3px solid ${col}`, borderRadius: radius.lg }}>
            <div style={{ fontFamily: font.mono, fontSize: "10px", color: col, letterSpacing: ".15em", marginBottom: "10px" }}>TOP PRIORITY FIX</div>
            <div style={{ fontSize: "15px", color: color.text5, lineHeight: 1.8 }}>{result.top_priority_fix}</div>
          </div>

          {/* Rewritten trigger */}
          {result.rewritten_trigger && (
            <div style={{ marginBottom: "28px", padding: "20px 24px", background: color.bgGood, border: border.default, borderLeft: `3px solid ${color.green}`, borderRadius: radius.lg }}>
              <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.green, letterSpacing: ".15em", marginBottom: "10px" }}>REWRITTEN TRIGGER</div>
              <div style={{ fontSize: "13px", color: color.text6, lineHeight: 1.85, fontFamily: font.mono, whiteSpace: "pre-wrap" }}>{result.rewritten_trigger}</div>
            </div>
          )}

          {/* Breakdown header */}
          <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 180px 28px", gap: "16px", padding: "12px 0", borderBottom: `1px solid ${color.surface3}` }}>
            {["#", "CATEGORY", "SCORE", ""].map((h, i) => (
              <span key={i} style={{ fontFamily: font.mono, fontSize: "10px", color: color.text6, letterSpacing: ".12em" }}>{h}</span>
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

  const backBtn = (
    <NavBtn label="← BACK" onClick={() => setView("upload")} />
  );

  // ── HISTORY ─────────────────────────────────────────────────────────────────
  if (view === "history") return (
    <div style={BASE}>
      <Nav onLogoClick={() => setView("landing")} right={<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>{backBtn}{appMenu}</div>} />
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "52px 48px 80px" }}>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <div style={{ fontFamily: font.mono, fontSize: "11px", color: color.text8, letterSpacing: ".18em", marginBottom: "8px" }}>EVALUATION HISTORY</div>
            <div style={{ fontSize: "13px", color: color.text8 }}>
              {historyLoading ? "Loading..." : history.length === 0 ? "No evaluations yet." : `${history.length} evaluation${history.length === 1 ? "" : "s"}`}
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontFamily: font.mono, fontSize: "11px",
                color: color.text8, letterSpacing: ".08em", transition: "color .15s"
              }}
              onMouseEnter={e => e.currentTarget.style.color = color.red}
              onMouseLeave={e => e.currentTarget.style.color = color.text8}
            >CLEAR ALL</button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ paddingTop: "60px", textAlign: "center" }}>
            <div style={{ fontFamily: font.mono, fontSize: "13px", color: color.text8, marginBottom: "12px" }}>—</div>
            <div style={{ fontSize: "14px", color: color.text8, lineHeight: 1.7 }}>
              Run your first evaluation to see results here.
            </div>
          </div>
        ) : history.map(entry => (
          <div key={entry.id}
            style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", alignItems: "center", gap: "20px", borderBottom: `1px solid ${color.surface3}`, transition: "background .15s", borderRadius: radius.md, margin: "0 -12px", padding: "18px 12px" }}
            onMouseEnter={e => e.currentTarget.style.background = color.surface3}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <div onClick={() => loadEntry(entry)} style={{ cursor: "pointer" }}>
              <div style={{ fontFamily: font.mono, fontSize: "28px", fontWeight: "700", lineHeight: 1, color: scoreColor(entry.score) }}>{entry.score}</div>
              <div style={{ fontFamily: font.mono, fontSize: "9px", color: scoreColor(entry.score), letterSpacing: ".1em", marginTop: "3px", opacity: 0.7 }}>{scoreLabel(entry.score)}</div>
            </div>
            <div onClick={() => loadEntry(entry)} style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "14px", color: color.text4, marginBottom: "4px", fontWeight: "400" }}>{entry.filename}</div>
              <div style={{ fontFamily: font.mono, fontSize: "11px", color: color.text8 }}>
                {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => loadEntry(entry)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: font.mono, fontSize: "10px",
                  color: color.text8, letterSpacing: ".1em", transition: "color .15s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = color.brand}
                onMouseLeave={e => e.currentTarget.style.color = color.text8}
              >LOAD →</button>
              <button
                onClick={() => deleteHistoryEntry(entry.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: font.mono, fontSize: "14px",
                  color: color.text8, lineHeight: 1, transition: "color .15s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = color.red}
                onMouseLeave={e => e.currentTarget.style.color = color.text8}
              >×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── SETTINGS ─────────────────────────────────────────────────────────────────
  if (view === "settings") {
    const email = user?.primaryEmailAddress?.emailAddress;
    const name = user?.fullName || user?.firstName;
    return (
      <div style={BASE}>
        <Nav onLogoClick={() => setView("landing")} right={<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>{backBtn}{appMenu}</div>} />
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "52px 48px 80px" }}>

          <div style={{ fontFamily: font.mono, fontSize: "11px", color: color.text8, letterSpacing: ".18em", marginBottom: "40px" }}>SETTINGS</div>

          {/* Account section */}
          <div style={{ marginBottom: "48px" }}>
            <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.text8, letterSpacing: ".15em", marginBottom: "16px" }}>ACCOUNT</div>
            <div
              style={{ padding: "20px 24px", background: color.surface1, border: border.faint, borderRadius: radius.lg, transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color.brand}
              onMouseLeave={e => e.currentTarget.style.borderColor = color.surface6}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  {name && (
                    <div style={{ fontSize: "15px", color: color.text4, fontWeight: "400", marginBottom: "4px" }}>{name}</div>
                  )}
                  <div style={{ fontFamily: font.mono, fontSize: "13px", color: color.text8 }}>{email || "—"}</div>
                </div>
                <button
                  onClick={() => signOut({ redirectUrl: "/" })}
                  style={{
                    background: "none", border: `1px solid ${color.borderError}`,
                    borderRadius: radius.md, padding: "8px 16px", cursor: "pointer",
                    fontFamily: font.mono, fontSize: "11px",
                    color: color.red, letterSpacing: ".08em", transition: "all .15s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = color.hoverDangerBg; e.currentTarget.style.borderColor = color.red; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = color.borderError; }}
                >SIGN OUT</button>
              </div>
            </div>
          </div>

          {/* API Key section */}
          <div style={{ marginBottom: "48px" }}>
            <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.text8, letterSpacing: ".15em", marginBottom: "16px" }}>ANTHROPIC API KEY</div>
            <div
              style={{ padding: "20px 24px", background: color.surface1, border: border.faint, borderRadius: radius.lg, transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color.brand}
              onMouseLeave={e => e.currentTarget.style.borderColor = color.surface6}
            >
              <div style={{ fontSize: "13px", color: color.text8, lineHeight: 1.7, marginBottom: "20px" }}>
                Stored in your browser only. Each evaluation forwards it directly to Anthropic and nowhere else.
              </div>
              <KeyInput onKeySet={() => setHasKey(true)} onKeyClear={() => setHasKey(false)} />
            </div>
          </div>

          {/* Data section */}
          <div>
            <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.text8, letterSpacing: ".15em", marginBottom: "16px" }}>DATA</div>
            <div
              style={{ padding: "20px 24px", background: color.surface1, border: border.faint, borderRadius: radius.lg, transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color.brand}
              onMouseLeave={e => e.currentTarget.style.borderColor = color.surface6}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "14px", color: color.text8, marginBottom: "4px" }}>Evaluation history</div>
                  <div style={{ fontFamily: font.mono, fontSize: "12px", color: color.text8 }}>
                    {history.length} stored
                  </div>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    style={{
                      background: "none", border: `1px solid ${color.borderError}`,
                      borderRadius: radius.md, padding: "8px 16px", cursor: "pointer",
                      fontFamily: font.mono, fontSize: "11px",
                      color: color.red, letterSpacing: ".08em", transition: "all .15s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = color.hoverDangerBg; e.currentTarget.style.borderColor = color.red; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = color.borderError; }}
                  >CLEAR HISTORY</button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
