import { useState } from "react";
import { useUser, useClerk, UserButton } from '@clerk/clerk-react';
import { color, font, border } from "../tokens.js";

const ANIM = `
@keyframes sl-slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sl-eyebrow { opacity: 0; animation: sl-slideUp 0.6s 0.1s ease forwards; }
.sl-h1      { opacity: 0; animation: sl-slideUp 0.7s 0.2s ease forwards; }
.sl-sub     { opacity: 0; animation: sl-slideUp 0.6s 0.35s ease forwards; }
.sl-cta     { opacity: 0; animation: sl-slideUp 0.6s 0.5s ease forwards; }
.sl-stats   { opacity: 0; animation: sl-slideUp 0.6s 0.65s ease forwards; }

@keyframes sl-dot-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1;   }
}
@keyframes sl-dot-exit {
  0%, 60%  { opacity: 1; }
  100%     { opacity: 0; }
}
@keyframes sl-report-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.sl-dot-exit      { animation: sl-dot-exit   5s ease-in-out 1 forwards; }
.sl-dot-pulse     { animation: sl-dot-pulse  0.7s ease-in-out infinite; }
.sl-report-reveal { animation: sl-report-enter 1.2s 4.2s ease-in-out 1 forwards; }
`;

// Seeded pseudo-random — stable across renders, no re-render flicker
function _r(seed) { const x = Math.sin(seed) * 43758.5453; return x - Math.floor(x); }

// Processing dots — static positions, group pulse controls the "active" feel
const PARTICLES = Array.from({ length: 800 }, (_, i) => ({
  left:    `${_r(i * 13.7 + 1) * 98 + 1}%`,
  top:     `${_r(i * 7.3  + 2) * 98 + 1}%`,
  size:    _r(i * 3.7 + 2) < 0.6 ? 1 : 1.5,
  opacity: 0.3 + _r(i * 5.3 + 6) * 0.65,
}));

// Mock report data — decorative only, colors are intentional demo values
const CATS = [
  { name: "Discoverability",     pct: 42, score: "42", barColor: "#3a3a3a", scoreColor: "#888",    underline: "#7a3535" },
  { name: "Instruction Quality", pct: 58, score: "58", barColor: "#484848", scoreColor: "#888",    underline: "#7a5c1a" },
  { name: "Scope & Boundaries",  pct: 71, score: "71", barColor: "#585858", scoreColor: "#888",    underline: "#7a5c1a" },
  { name: "Token Economics",     pct: 65, score: "65", barColor: "#525252", scoreColor: "#828282", underline: "#7a5c1a" },
  { name: "Robustness",          pct: 38, score: "38", barColor: "#363636", scoreColor: "#888",    underline: "#7a3535" },
  { name: "Examples & Evidence", pct: 20, score: "20", barColor: "#2a2a2a", scoreColor: "#888",    underline: "#7a3535" },
  { name: "Structural Integrity",pct: 88, score: "88", barColor: "#787878", scoreColor: "#aaa",    underline: null     },
  { name: "Maintainability",     pct: 74, score: "74", barColor: "#606060", scoreColor: "#909090", underline: "#7a5c1a" },
];

function CatRow({ cat, last }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid", gridTemplateColumns: "158px 1fr 32px",
        alignItems: "center", gap: "16px",
        padding: "9px 6px",
        borderBottom: last ? "none" : border.subtle,
        borderRadius: "3px",
        background: hovered ? color.surface5 : "transparent",
        cursor: "default",
        transition: "background 0.12s",
      }}
    >
      <div style={{
        fontFamily: font.mono, fontSize: "11px",
        color: hovered ? color.text3 : color.text8,
        transition: "color 0.12s",
      }}>{cat.name}</div>
      <div style={{ height: "1px", background: color.surface7, borderRadius: "1px", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${cat.pct}%`, background: cat.barColor, borderRadius: "1px" }} />
      </div>
      <div style={{ fontFamily: font.mono, fontSize: "11px", fontWeight: "500", textAlign: "right", color: cat.scoreColor }}>
        {cat.underline
          ? <span style={{ borderBottom: `1.5px solid ${cat.underline}`, paddingBottom: "1px" }}>{cat.score}</span>
          : cat.score}
      </div>
    </div>
  );
}

export function Landing({ onStart, isMobile }) {
  const { isLoaded, isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const handleStart = () => {
    if (!isLoaded) return;
    if (isSignedIn) { onStart(); return; }
    openSignIn();
  };

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", background: color.bgLanding, color: color.text1, fontFamily: font.sans, WebkitFontSmoothing: "antialiased" }}>
      <style>{ANIM}</style>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 48px", borderBottom: border.strong, background: color.bgLanding, zIndex: 100
      }}>
        {/* Logo */}
        <div
          onClick={handleStart}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <div style={{
            width: "26px", height: "26px", border: `1.5px solid ${color.brand}`,
            display: "grid", placeItems: "center",
            fontFamily: font.mono, fontSize: "9px", fontWeight: "500", color: color.brand
          }}>SL</div>
          <span style={{ fontFamily: font.mono, fontSize: "13px", color: color.text4, letterSpacing: "0.04em" }}>
            skilllint<span style={{ color: color.text8 }}>.dev</span>
          </span>
        </div>

        {/* Nav right */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isLoaded && isSignedIn ? (
            <UserButton appearance={{
              elements: { avatarBox: { width: "28px", height: "28px", borderRadius: "4px" } }
            }} />
          ) : (
            <button
              disabled={!isLoaded}
              onClick={() => openSignIn()}
              style={{
                fontFamily: font.mono, fontSize: "11px",
                color: isLoaded ? color.text8 : color.textC,
                background: "none",
                border: `1px solid ${isLoaded ? color.surface8 : color.surface6}`,
                padding: "7px 18px", borderRadius: "4px",
                cursor: isLoaded ? "pointer" : "default",
                letterSpacing: "0.06em", transition: "all 0.15s"
              }}
              onMouseEnter={e => { if (isLoaded) { e.currentTarget.style.color = color.brand; e.currentTarget.style.borderColor = color.brand; e.currentTarget.style.background = color.surface6; } }}
              onMouseLeave={e => { if (isLoaded) { e.currentTarget.style.color = color.text8; e.currentTarget.style.borderColor = color.surface8; e.currentTarget.style.background = "none"; } }}
            >SIGN IN</button>
          )}
          <button
            onClick={handleStart}
            style={{
              fontFamily: font.mono, fontSize: "11px", color: color.btnPrimaryText, background: color.btnPrimary,
              border: "none", padding: "8px 20px", borderRadius: "4px",
              cursor: "pointer", letterSpacing: "0.06em", fontWeight: "500", transition: "all 0.15s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = color.btnPrimaryHover; e.currentTarget.style.color = color.btnPrimaryText; }}
            onMouseLeave={e => { e.currentTarget.style.background = color.btnPrimary; e.currentTarget.style.color = color.btnPrimaryText; }}
          >{isLoaded && isSignedIn ? "OPEN APP" : "GET STARTED"}</button>
        </div>
      </nav>

      {/* Two-column grid — collapses to single column on mobile */}
      <div style={{
        position: "fixed", inset: "56px 0 0 0",
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
        overflow: isMobile ? "auto" : "hidden",
      }}>

        {/* Left panel */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: isMobile ? "flex-start" : "center",
          padding: isMobile ? "40px 24px 120px" : "0 64px 0 72px",
          borderRight: isMobile ? "none" : border.strong,
          position: "relative",
          flexShrink: 0,
        }}>
          <div className="sl-eyebrow" style={{
            fontFamily: font.mono, fontSize: "10px", color: color.text8,
            letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "28px",
            display: "flex", alignItems: "center", gap: "10px"
          }}>
            <span style={{ width: "24px", height: "1px", background: color.textC, display: "inline-block", flexShrink: 0 }} />
            Skill file quality
          </div>

          <h1 className="sl-h1" style={{
            fontSize: isMobile ? "38px" : "58px", fontWeight: "200", lineHeight: 1.06,
            letterSpacing: "-0.03em", color: color.text1, margin: "0 0 28px"
          }}>
            Your skill files<br />
            are <em style={{ fontStyle: "italic", fontWeight: "200", color: color.textB }}>probably</em><br />
            <span style={{ fontWeight: "300", color: color.text1 }}>broken.</span>
          </h1>

          <p className="sl-sub" style={{
            fontSize: "15px", fontWeight: "300", color: color.text8,
            lineHeight: 1.8, maxWidth: "400px", margin: "0 0 48px"
          }}>
            Bad skill files <b style={{ color: color.text4, fontWeight: "400" }}>silently degrade Claude.</b>{" "}
            Wrong triggers. Vague instructions. No edge cases.
            You don&apos;t know until something fails in production.
            SkillLint scores every dimension and rewrites
            what&apos;s wrong.
          </p>

          <div className="sl-cta" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={handleStart}
              style={{
                fontFamily: font.mono, fontSize: "12px", color: color.btnPrimaryText, background: color.btnPrimary,
                border: "none", padding: "14px 32px", borderRadius: "6px",
                cursor: "pointer", letterSpacing: "0.08em", fontWeight: "500",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = color.btnPrimaryHover;
                e.currentTarget.style.color = color.btnPrimaryText;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,255,255,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = color.btnPrimary;
                e.currentTarget.style.color = color.btnPrimaryText;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >EVALUATE YOUR SKILL →</button>
            {(!isLoaded || !isSignedIn) && (
              <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.text8, letterSpacing: "0.05em" }}>
                Free. No key needed to start.
              </span>
            )}
          </div>

          <div className="sl-stats" style={{
            position: isMobile ? "static" : "absolute",
            bottom: isMobile ? undefined : "48px",
            left: isMobile ? undefined : "72px",
            display: "flex", gap: isMobile ? "28px" : "40px",
            marginTop: isMobile ? "48px" : undefined,
          }}>
            {[
              { num: "80",  label: "Heuristics" },
              { num: "10",  label: "Categories" },
              { num: "~3¢", label: "Per evaluation" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: font.mono, fontSize: "22px", fontWeight: "400", color: color.text6, letterSpacing: "-0.02em" }}>{s.num}</div>
                <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.textA, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "3px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — animated mock report. Hidden on mobile: 800 particle nodes are
            not worth rendering when the panel isn't visible. */}
        {!isMobile && <div style={{ background: color.bgLanding, position: "relative", overflow: "hidden" }}>

          {/* Processing dots — static field, group pulses as one unit */}
          <div className="sl-dot-exit" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div className="sl-dot-pulse" style={{ position: "absolute", inset: 0 }}>
              {PARTICLES.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: p.left, top: p.top,
                    width: `${p.size}px`, height: `${p.size}px`,
                    borderRadius: "50%",
                    background: `rgba(255,255,255,${p.opacity})`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Report content — fades in after dots clear */}
          <div
            className="sl-report-reveal"
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0,
            }}
          >
            <div style={{ width: "500px" }}>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "32px", paddingBottom: "16px", borderBottom: border.subtle }}>
                <div style={{ fontFamily: font.mono, fontSize: "12px", color: color.text6, letterSpacing: "0.02em" }}>docx/SKILL.md</div>
                <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.text8, letterSpacing: "0.05em" }}>116 lines · ~340 tokens</div>
              </div>

              <div style={{ marginBottom: "28px", paddingBottom: "24px", borderBottom: border.subtle }}>
                <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.text8, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "10px" }}>Overall Score</div>
                <div style={{ display: "flex", alignItems: "baseline", marginBottom: "6px" }}>
                  <span style={{ fontFamily: font.mono, fontSize: "72px", fontWeight: "300", lineHeight: 1, color: color.text3, letterSpacing: "-0.03em" }}>63</span>
                  <span style={{ fontFamily: font.mono, fontSize: "22px", fontWeight: "300", color: color.text8, marginLeft: "4px", alignSelf: "flex-end", marginBottom: "8px" }}>/100</span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: "300", color: color.text7, lineHeight: 1.7, maxWidth: "420px" }}>
                  Trigger misfires on 3 competing skills.
                  Instructions assume context Claude won&apos;t have.
                  No edge case handling found.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", marginBottom: "24px" }}>
                {CATS.map((cat, i) => (
                  <CatRow key={cat.name} cat={cat} last={i === CATS.length - 1} />
                ))}
              </div>

              <div style={{ paddingTop: "14px", borderTop: border.subtle }}>
                <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.text8, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "8px" }}>Top Priority Fix</div>
                <div style={{ fontSize: "13px", fontWeight: "300", color: color.text8, lineHeight: 1.7 }}>
                  Rewrite the description field — add 3 specific trigger
                  phrases and 2 explicit exclusions to prevent conflicts
                  with pdf-reading and docx skills.
                </div>
              </div>

            </div>
          </div>

        </div>}

      </div>
    </div>
  );
}
