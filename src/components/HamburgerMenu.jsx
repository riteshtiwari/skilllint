import { useState, useEffect, useRef } from "react";
import { color, font, radius, border } from "../tokens.js";

export function HamburgerMenu({ onHistory, onSettings, onSignOut, historyCount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const item = (label, onClick, danger = false) => (
    <button
      key={label}
      onClick={() => { setOpen(false); onClick(); }}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: font.mono, fontSize: "12px",
        color: danger ? color.red : color.text8,
        letterSpacing: "0.08em",
        padding: "10px 16px",
        transition: "color 0.1s, background 0.1s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? color.hoverDangerBg : color.hoverSurface;
        e.currentTarget.style.color = danger ? color.hoverDanger : color.brand;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.color = danger ? color.red : color.text8;
      }}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: open ? color.hoverSurface : "none",
          border: `1px solid ${open ? color.brand : "#333"}`,
          borderRadius: radius.md,
          width: "36px", height: "32px",
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "4px",
          transition: "all 0.15s",
          padding: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = color.brand;
          e.currentTarget.style.background = color.hoverSurface;
          e.currentTarget.querySelectorAll("span").forEach(s => s.style.background = color.brand);
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = open ? color.brand : "#333";
          e.currentTarget.style.background = open ? color.hoverSurface : "none";
          e.currentTarget.querySelectorAll("span").forEach(s => s.style.background = open ? color.brand : color.text7);
        }}
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            display: "block", width: "14px", height: "1px",
            background: open ? color.brand : color.text7,
            transition: "background 0.15s",
          }} />
        ))}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: color.surface1,
          border: border.faint,
          borderRadius: radius.lg,
          minWidth: "180px",
          zIndex: 200,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {item(historyCount > 0 ? `HISTORY  (${historyCount})` : "HISTORY", onHistory)}
          {item("SETTINGS", onSettings)}
          <div style={{ height: "1px", background: color.surface6, margin: "2px 0" }} />
          {item("SIGN OUT", onSignOut, true)}
        </div>
      )}
    </div>
  );
}
