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
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#4ade80" }}>key set</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#777" }}>sk-ant-...••••</span>
      <button onClick={clear} style={{
        marginLeft: "auto", background: "none", border: "none",
        color: "#777", cursor: "pointer", fontSize: "11px",
        fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".08em",
        padding: 0
      }}>CLEAR</button>
    </div>
  );

  return (
    <div id="key-input">
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "12px",
        color: "#888", letterSpacing: ".06em", marginBottom: "8px"
      }}>
        ANTHROPIC API KEY — stored in your browser only
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setInputError(""); }}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder="sk-ant-..."
          style={{
            flex: 1, background: "#0c0c0c",
            border: `1px solid ${inputError ? "#f87171" : "#1e1e1e"}`,
            borderRadius: "4px", padding: "10px 12px", color: "#ccc",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", outline: "none"
          }}
        />
        <button
          onClick={save}
          disabled={!val.startsWith("sk-ant-") || val.length <= 20}
          style={{
            background: (val.startsWith("sk-ant-") && val.length > 20) ? "#e8e8e8" : "#111",
            color: (val.startsWith("sk-ant-") && val.length > 20) ? "#080808" : "#444",
            border: "none", borderRadius: "4px", padding: "10px 18px",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "11px",
            letterSpacing: ".08em",
            cursor: (val.startsWith("sk-ant-") && val.length > 20) ? "pointer" : "default"
          }}
        >SAVE</button>
      </div>
      {inputError && (
        <div style={{
          marginBottom: "6px", fontFamily: "'JetBrains Mono',monospace",
          fontSize: "11px", color: "#f87171"
        }}>{inputError}</div>
      )}
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "12px", color: "#777", lineHeight: 1.6
      }}>
        Get your key at console.anthropic.com. Without a key you get structural analysis only.
      </div>
    </div>
  );
}
