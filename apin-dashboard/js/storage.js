// ============================================================
// storage.js v2 — chrome.storage.local + JSON export/import
// All data survives folder renames / device moves via JSON backup
// ============================================================

const Storage = (() => {

  // ── Schema version (bump when structure changes) ──────────
  const SCHEMA_VERSION = 2;

  const STORAGE_KEY = 'apin_data';   // single key for all state

  // ── Defaults ──────────────────────────────────────────────
  const makeDefaults = () => ({
    schemaVersion: SCHEMA_VERSION,
    settings: {
      backgroundUrl: '',
      backgroundBlob: null,       // base64 data-url; excluded from JSON export
      widgetOpacity: 0.82,
      colorScheme: 'dark',        // 'dark' | 'light' | 'custom'
      customColors: {
        bg: '#0d0d1a',
        widget: '#16162a',
        accent: '#7c6af7',
        text: '#e2e0ff',
      },
      searchEngine: 'google',     // 'google' | 'bing' | 'duckduckgo' | 'custom'
      searchEngineCustomUrl: '',  // used when searchEngine === 'custom'
      logoWidget: {
        enabled: true,
        type: 'text',             // 'text' | 'image'
        text: 'Apin Dashboard',
        imageUrl: '',
        imageBlob: null,
      },
    },
    quickLinks: [                 // main row (large icons), like Chrome's top sites
      { id: 'ql_1', title: 'Google',   url: 'https://google.com',   favicon: '' },
      { id: 'ql_2', title: 'YouTube',  url: 'https://youtube.com',  favicon: '' },
      { id: 'ql_3', title: 'GitHub',   url: 'https://github.com',   favicon: '' },
      { id: 'ql_4', title: 'Gmail',    url: 'https://gmail.com',    favicon: '' },
      { id: 'ql_5', title: 'Notion',   url: 'https://notion.so',    favicon: '' },
      { id: 'ql_6', title: 'Twitter',  url: 'https://x.com',        favicon: '' },
    ],
    groups: [                     // bookmark folder-widgets
      {
        id: 'g_default',
        title: 'Quick Links',
        color: '#7c6af7',
        bookmarks: [
          { id: 'b_1', title: 'Google',  url: 'https://google.com',  favicon: '' },
          { id: 'b_2', title: 'GitHub',  url: 'https://github.com',  favicon: '' },
          { id: 'b_3', title: 'YouTube', url: 'https://youtube.com', favicon: '' },
        ],
      },
    ],
  });

  // ── Low-level chrome.storage r/w ─────────────────────────
  async function readRaw() {
    if (typeof chrome === 'undefined' || !chrome.storage) return null;
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (res) => resolve(res[STORAGE_KEY] ?? null));
    });
  }

  async function writeRaw(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
    });
  }

  // ── Load all data (merge with defaults for forward-compat) ─
  async function load() {
    const raw = await readRaw();
    if (!raw) return makeDefaults();
    // Deep-merge: defaults provide any keys missing after an upgrade
    const def = makeDefaults();
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: deepMerge(def.settings, raw.settings ?? {}),
      quickLinks: raw.quickLinks ?? def.quickLinks,
      groups:     raw.groups     ?? def.groups,
    };
  }

  // ── Save everything ───────────────────────────────────────
  async function save(data) {
    await writeRaw(data);
  }

  // ── Helpers ───────────────────────────────────────────────
  function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = deepMerge(target[key] ?? {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function getFaviconUrl(url) {
    try {
      const origin = new URL(url).origin;
      return `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
    } catch { return ''; }
  }

  // ══════════════════════════════════════════════════════════
  // JSON EXPORT / IMPORT  (portability across devices/folders)
  // ══════════════════════════════════════════════════════════

  /**
   * Export all data as a downloadable JSON file.
   * Note: backgroundBlob and logoWidget.imageBlob are excluded
   * (they can be huge; user should re-upload after moving).
   */
  async function exportJSON(data) {
    const exportable = JSON.parse(JSON.stringify(data));
    // Strip blobs — they're too large and device-specific
    if (exportable.settings) {
      exportable.settings.backgroundBlob = null;
      if (exportable.settings.logoWidget) {
        exportable.settings.logoWidget.imageBlob = null;
      }
    }
    exportable._exportedAt = new Date().toISOString();
    exportable._version = SCHEMA_VERSION;

    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Import from a JSON file.
   * Returns the merged data object (caller must call save() and re-render).
   */
  async function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          // Validate minimally
          if (!parsed.groups && !parsed.quickLinks && !parsed.settings) {
            throw new Error('Invalid backup file');
          }
          const def = makeDefaults();
          const merged = {
            schemaVersion: SCHEMA_VERSION,
            settings:   deepMerge(def.settings,   parsed.settings   ?? {}),
            quickLinks: parsed.quickLinks ?? def.quickLinks,
            groups:     parsed.groups     ?? def.groups,
          };
          // Preserve existing blobs (not in export)
          const current = await readRaw();
          if (current?.settings?.backgroundBlob)
            merged.settings.backgroundBlob = current.settings.backgroundBlob;
          if (current?.settings?.logoWidget?.imageBlob)
            merged.settings.logoWidget.imageBlob = current.settings.logoWidget.imageBlob;

          await writeRaw(merged);
          resolve(merged);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  // ── Settings ──────────────────────────────────────────────
  async function updateSettings(patch, data) {
    data.settings = deepMerge(data.settings, patch);
    await save(data);
    return data;
  }

  // ── Quick Links CRUD ──────────────────────────────────────
  async function addQuickLink(data, title, url) {
    const ql = { id: generateId('ql'), title, url, favicon: getFaviconUrl(url) };
    data.quickLinks.push(ql);
    await save(data);
    return data;
  }

  async function deleteQuickLink(data, id) {
    data.quickLinks = data.quickLinks.filter((q) => q.id !== id);
    await save(data);
    return data;
  }

  async function updateQuickLink(data, id, patch) {
    const idx = data.quickLinks.findIndex((q) => q.id === id);
    if (idx !== -1) data.quickLinks[idx] = { ...data.quickLinks[idx], ...patch };
    await save(data);
    return data;
  }

  // ── Groups CRUD ───────────────────────────────────────────
  async function addGroup(data, title, color) {
    const g = { id: generateId('g'), title, color: color || '#7c6af7', bookmarks: [] };
    data.groups.push(g);
    await save(data);
    return data;
  }

  async function updateGroup(data, groupId, patch) {
    const idx = data.groups.findIndex((g) => g.id === groupId);
    if (idx !== -1) data.groups[idx] = { ...data.groups[idx], ...patch };
    await save(data);
    return data;
  }

  async function deleteGroup(data, groupId) {
    data.groups = data.groups.filter((g) => g.id !== groupId);
    await save(data);
    return data;
  }

  // ── Bookmarks CRUD ────────────────────────────────────────
  async function addBookmark(data, groupId, title, url) {
    const group = data.groups.find((g) => g.id === groupId);
    if (!group) return data;
    group.bookmarks.push({ id: generateId('b'), title, url, favicon: getFaviconUrl(url) });
    await save(data);
    return data;
  }

  async function deleteBookmark(data, groupId, bookmarkId) {
    const group = data.groups.find((g) => g.id === groupId);
    if (group) group.bookmarks = group.bookmarks.filter((b) => b.id !== bookmarkId);
    await save(data);
    return data;
  }

  return {
    load,
    save,
    exportJSON,
    importJSON,
    updateSettings,
    addQuickLink,
    deleteQuickLink,
    updateQuickLink,
    addGroup,
    updateGroup,
    deleteGroup,
    addBookmark,
    deleteBookmark,
    generateId,
    getFaviconUrl,
  };
})();
