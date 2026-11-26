// Saves settings in the extension's local storage (falls back to localStorage outside the extension).
(function (root) {
  const KEY = 'gbfHelper';
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  async function load() {
    try {
      if (hasChrome) return (await chrome.storage.local.get(KEY))[KEY] || {};
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  async function save(state) {
    try {
      if (hasChrome) await chrome.storage.local.set({ [KEY]: state });
      else localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // Saving can fail in unusual browser states; the panel keeps working with what is in memory.
    }
  }

  // Calls back with the saved state whenever it changes (including from a panel in another window).
  function onChange(callback) {
    if (!hasChrome || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]) callback(changes[KEY].newValue || {});
    });
  }

  root.GBF_STORE = { load, save, onChange };
})(globalThis);
