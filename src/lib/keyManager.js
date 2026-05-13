const KEY_STORAGE = "skilllint_api_key";
const MIN_KEY_LENGTH = 20;

export const keyManager = {
  get: () => {
    try { return localStorage.getItem(KEY_STORAGE) || ""; }
    catch { return ""; }
  },
  set: (key) => {
    try { localStorage.setItem(KEY_STORAGE, key); }
    catch { /* localStorage unavailable — key not persisted */ }
  },
  clear: () => {
    try { localStorage.removeItem(KEY_STORAGE); }
    catch { /* intentional */ }
  },
  isValid: () => {
    try {
      const key = localStorage.getItem(KEY_STORAGE);
      return Boolean(key && key.startsWith("sk-ant-") && key.length > MIN_KEY_LENGTH);
    } catch { return false; }
  },
};
