import { useState } from "react";
import { keyManager } from "../lib/keyManager";

export function KeyInput({ onKeySet, onKeyClear }) {
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(() => {
    // Clear any stored key that no longer passes validation (e.g. old format)
    if (keyManager.isValid()) return true;
    if (keyManager.get()) keyManager.clear();
    return false;
  });
  const [inputError, setInputError] = useState("");

  const save = () => {
    if (!val.startsWith("sk-ant-") || val.length <= 20) {
      setInputError("Must start with sk-ant- and be at least 20 characters.");
      return;
    }
    setInputError("");
    keyManager.set(val);
    setSaved(true);
    setVal("");
    onKeySet?.();
  };

  const clear = () => {
    keyManager.clear();
    setVal("");
    setSaved(false);
    setInputError("");
    onKeyClear?.();
  };

  if (saved) return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 16px", background: "#090c09",
      border: "1px solid #1a2a1a", borderRadius: "6px",
      marginBottom: "14px"
    }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#4ade80" }}>
        key set
      </span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#555" }}>
        sk-ant-...••••
      </span>
      <button onClick={clear} style={{
        marginLeft: "auto", background: "none", border: "none",
        color: "#555", cursor: "pointer", fontSize: "11px",
        fontFamily: "'JetBrains Mono',monospace"
      }}>CLEAR</button>
    </div>
  );

  return (
    <div id="key-input" style={{
      padding: "16px", background: "#0a0a0a",
      border: "1px solid #1a1a1a", borderRadius: "6px",
      marginBottom: "14px"
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
        color: "#666", letterSpacing: ".1em", marginBottom: "8px"
      }}>
        ANTHROPIC API KEY — stored in your browser only
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setInputError(""); }}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder="sk-ant-..."
          style={{
            flex: 1, background: "#080808",
            border: `1px solid ${inputError ? "#f87171" : "#1a1a1a"}`,
            borderRadius: "4px", padding: "9px 12px", color: "#ccc",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", outline: "none"
          }}
        />
        <button
          onClick={save}
          disabled={!val.startsWith("sk-ant-")}
          style={{
            background: val.startsWith("sk-ant-") ? "#e8e8e8" : "#111",
            color: val.startsWith("sk-ant-") ? "#080808" : "#333",
            border: "none", borderRadius: "4px", padding: "9px 16px",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "11px",
            cursor: val.startsWith("sk-ant-") ? "pointer" : "default"
          }}
        >SAVE</button>
      </div>
      {inputError && (
        <div style={{
          marginTop: "6px", fontFamily: "'JetBrains Mono',monospace",
          fontSize: "9px", color: "#f87171"
        }}>{inputError}</div>
      )}
      <div style={{
        marginTop: "8px", fontFamily: "'JetBrains Mono',monospace",
        fontSize: "9px", color: "#444", lineHeight: 1.6
      }}>
        Get your key at console.anthropic.com. Without a key you get structural analysis only.
      </div>
    </div>
  );
}
