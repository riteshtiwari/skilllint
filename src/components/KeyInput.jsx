import { useState } from "react";
import { keyManager } from "../lib/keyManager";
import { color, font, radius } from "../tokens.js";

const DEFAULT_API_URL = "https://api.anthropic.com";
const URL_STORAGE_KEY = "skilllint_api_url_v1";

function loadUrl() {
  try { return localStorage.getItem(URL_STORAGE_KEY) || DEFAULT_API_URL; } catch { return DEFAULT_API_URL; }
}
function saveUrl(u) {
  try { localStorage.setItem(URL_STORAGE_KEY, u); } catch { /* ignore */ }
}
function clearUrl() {
  try { localStorage.removeItem(URL_STORAGE_KEY); } catch { /* ignore */ }
}

export function KeyInput({ onKeySet, onKeyClear }) {
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(() => {
    if (keyManager.isValid()) return true;
    if (keyManager.get()) keyManager.clear();
    return false;
  });
  const [inputError, setInputError] = useState("");
  const [apiUrl, setApiUrl] = useState(() => loadUrl());
  const [urlDirty, setUrlDirty] = useState(false);

  const isValidKey = val.startsWith("sk-ant-") && val.length > 20;

  const save = () => {
    if (!isValidKey) {
      setInputError("Must start with sk-ant- and be at least 20 characters.");
      return;
    }
    setInputError("");
    keyManager.set(val);
    const trimmed = apiUrl.trim();
    if (trimmed && trimmed !== DEFAULT_API_URL) {
      saveUrl(trimmed);
    } else {
      clearUrl();
    }
    setSaved(true);
    setVal("");
    setUrlDirty(false);
    onKeySet?.();
  };

  const clear = () => {
    keyManager.clear();
    clearUrl();
    setVal("");
    setSaved(false);
    setInputError("");
    setApiUrl(DEFAULT_API_URL);
    setUrlDirty(false);
    onKeyClear?.();
  };

  if (saved) return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ fontFamily: font.mono, fontSize: "12px", color: color.green }}>key set</span>
      <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.textB }}>sk-ant-...••••</span>
      {loadUrl() !== DEFAULT_API_URL && (
        <span style={{ fontFamily: font.mono, fontSize: "11px", color: color.textB }}>· proxy</span>
      )}
      <button onClick={clear} style={{
        marginLeft: "auto", background: "none", border: "none",
        color: color.textB, cursor: "pointer", fontSize: "11px",
        fontFamily: font.mono, letterSpacing: ".08em", padding: 0,
        transition: "color 0.15s"
      }}
      onMouseEnter={e => e.currentTarget.style.color = color.brand}
      onMouseLeave={e => e.currentTarget.style.color = color.textB}
      >CLEAR</button>
    </div>
  );

  return (
    <div id="key-input">
      {/* API Key */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setInputError(""); }}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder="sk-ant-..."
          style={{
            flex: 1, background: color.surface0,
            border: `1px solid ${inputError ? color.red : color.surface7}`,
            borderRadius: radius.md, padding: "0 12px", height: "44px", color: color.text4,
            fontFamily: font.mono, fontSize: "14px", outline: "none",
            transition: "border-color 0.15s"
          }}
          onMouseEnter={e => { if (document.activeElement !== e.target && !inputError) e.target.style.borderColor = color.brand; }}
          onMouseLeave={e => { if (document.activeElement !== e.target && !inputError) e.target.style.borderColor = color.surface7; }}
          onFocus={e => { if (!inputError) e.target.style.borderColor = color.brand; }}
          onBlur={e => { if (!inputError) e.target.style.borderColor = color.surface7; }}
        />
        <button
          onClick={save}
          disabled={!isValidKey}
          style={{
            background: isValidKey ? color.btnPrimary : color.surface3,
            color: isValidKey ? color.btnPrimaryText : color.textC,
            border: "none", borderRadius: radius.md, padding: "0 18px", height: "44px",
            fontFamily: font.mono, fontSize: "11px",
            letterSpacing: ".08em",
            cursor: isValidKey ? "pointer" : "default",
            transition: "background 0.15s"
          }}
          onMouseEnter={e => { if (isValidKey) e.currentTarget.style.background = color.btnPrimaryHover; }}
          onMouseLeave={e => { if (isValidKey) e.currentTarget.style.background = color.btnPrimary; }}
        >SAVE</button>
      </div>

      {/* API URL */}
      <div style={{ marginBottom: inputError ? "6px" : "8px" }}>
        <div style={{ fontFamily: font.mono, fontSize: "10px", color: color.textC, letterSpacing: ".1em", marginBottom: "6px" }}>
          API URL — change only if using a proxy
        </div>
        <input
          type="text"
          value={apiUrl}
          onChange={e => { setApiUrl(e.target.value); setUrlDirty(true); }}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder={DEFAULT_API_URL}
          style={{
            width: "100%", background: color.surface0,
            border: `1px solid ${color.surface6}`, borderRadius: radius.md,
            padding: "0 12px", height: "38px", color: urlDirty && apiUrl !== DEFAULT_API_URL ? color.text4 : color.textC,
            fontFamily: font.mono, fontSize: "12px", outline: "none",
            boxSizing: "border-box", transition: "border-color 0.15s"
          }}
          onMouseEnter={e => { if (document.activeElement !== e.target) e.target.style.borderColor = color.brand; }}
          onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderColor = color.surface6; }}
          onFocus={e => e.target.style.borderColor = color.brand}
          onBlur={e => e.target.style.borderColor = color.surface6}
        />
      </div>

      {inputError && (
        <div style={{
          marginBottom: "8px", fontFamily: font.mono,
          fontSize: "11px", color: color.red
        }}>{inputError}</div>
      )}
    </div>
  );
}
