// ============================================================
// ui.js v2 — Full UI: clock, search, logo, quick links, groups, settings
// ============================================================

const UI = (() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let D = null;          // global data object
  let sortables = [];
  let sidebarOpen = false;
  let qlSortable = null;
  let qlAbort = null;
  let groupAbort = null;

  // ══════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════
  async function init() {
    D = await Storage.load();
    applyTheme();
    startClock();
    renderLogo();
    renderSearch();
    renderQuickLinks();
    renderGroups();
    bindTopbar();
    bindSettings();
    bindModals();
    bindGroupEvents($('#groups-container'));
    bindImageFallbacks();
  }

  // ══════════════════════════════════════════════════════════
  // CLOCK
  // ══════════════════════════════════════════════════════════
  function startClock() {
    tick();
    setInterval(tick, 1000);
  }
  function tick() {
    const now = new Date();
    const t = $('#clock-time');
    const d = $('#clock-date');
    if (t) t.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d) d.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ══════════════════════════════════════════════════════════
  // THEME / SETTINGS → DOM
  // ══════════════════════════════════════════════════════════
  function applyTheme() {
    const s = D.settings;
    const root = document.documentElement;

    // Background
    const bg = $('#bg-layer');
    if (bg) {
      const src = s.backgroundBlob || s.backgroundUrl || '';
      bg.style.backgroundImage = src ? `url(${src})` : '';
    }

    // Colors
    const palettes = {
      dark: {
        bg:'#0d0d1a', widget:'#16162a', border:'#2a2a4a',
        accent:'#7c6af7', accentH:'#9d8fff',
        text:'#e2e0ff', muted:'#8882b8', surface:'#1e1e38', danger:'#f75a5a',
      },
      light: {
        bg:'#f0eff9', widget:'#ffffff', border:'#dddaff',
        accent:'#6354e8', accentH:'#7c6af7',
        text:'#1a1730', muted:'#6b6490', surface:'#e9e7ff', danger:'#dc2626',
      },
    };

    let p;
    if (s.colorScheme === 'custom') {
      const cc = s.customColors;
      p = {
        bg: cc.bg, widget: cc.widget, border: cc.widget + '66',
        accent: cc.accent, accentH: cc.accent,
        text: cc.text, muted: cc.text + '99', surface: cc.widget + 'cc', danger: '#f75a5a',
      };
    } else {
      p = palettes[s.colorScheme] || palettes.dark;
    }

    root.style.setProperty('--c-bg',      p.bg);
    root.style.setProperty('--c-widget',  p.widget);
    root.style.setProperty('--c-border',  p.border);
    root.style.setProperty('--c-accent',  p.accent);
    root.style.setProperty('--c-accentH', p.accentH);
    root.style.setProperty('--c-text',    p.text);
    root.style.setProperty('--c-muted',   p.muted);
    root.style.setProperty('--c-surface', p.surface);
    root.style.setProperty('--c-danger',  p.danger);
    root.style.setProperty('--opacity',   s.widgetOpacity ?? 0.82);

    syncSettingsUI();
  }

  // ══════════════════════════════════════════════════════════
  // LOGO WIDGET
  // ══════════════════════════════════════════════════════════
  function renderLogo() {
    const el = $('#logo-widget');
    if (!el) return;
    const lw = D.settings.logoWidget;
    if (!lw.enabled) { el.style.display = 'none'; return; }
    el.style.display = '';

    if (lw.type === 'image') {
      const src = lw.imageBlob || lw.imageUrl || '';
      el.innerHTML = src
        ? `<img src="${src}" class="logo-img" alt="logo" />`
        : `<span class="logo-text">${esc(lw.text || 'Apin Dashboard')}</span>`;
    } else {
      el.innerHTML = `<span class="logo-text">${esc(lw.text || 'Apin Dashboard')}</span>`;
    }
  }

  // ══════════════════════════════════════════════════════════
  // SEARCH BAR
  // ══════════════════════════════════════════════════════════
  function renderSearch() {
    // Just update the form action; DOM is static
    const form = $('#search-form');
    if (!form) return;
    const engine = D.settings.searchEngine || 'google';
    const urls = {
      google:     'https://www.google.com/search',
      bing:       'https://www.bing.com/search',
      duckduckgo: 'https://duckduckgo.com/',
      brave:      'https://search.brave.com/search',
    };
    form.action = engine === 'custom'
      ? (D.settings.searchEngineCustomUrl || 'https://www.google.com/search')
      : (urls[engine] || 'https://www.google.com/search');
    // param name
    const params = { google:'q', bing:'q', duckduckgo:'q', brave:'q', custom:'q' };
    const inp = $('#search-input');
    if (inp) inp.name = params[engine] || 'q';
  }

  // ══════════════════════════════════════════════════════════
  // QUICK LINKS (big icon row)
  // ══════════════════════════════════════════════════════════
  function renderQuickLinks() {
    const wrap = $('#quick-links-row');
    if (!wrap) return;
    wrap.innerHTML = '';

    // #6 — backfill missing favicons once and persist
    let faviconsDirty = false;
    D.quickLinks.forEach(ql => {
      if (!ql.favicon) { ql.favicon = Storage.getFaviconUrl(ql.url); faviconsDirty = true; }
    });
    if (faviconsDirty) Storage.save(D);

    D.quickLinks.forEach((ql) => {
      const item = document.createElement('div');
      item.className = 'ql-item';
      item.dataset.id = ql.id;
      const favicon = ql.favicon;
      item.innerHTML = `
        <a href="${safeUrl(ql.url)}" class="ql-link" title="${esc(ql.url)}">
          <div class="ql-icon">
            <img src="${safeUrl(favicon)}" alt="" class="ql-favicon" data-fallback="${esc((ql.title||'?')[0].toUpperCase())}" />
            <span class="ql-letter" style="display:none">${esc((ql.title||'?')[0].toUpperCase())}</span>
          </div>
          <span class="ql-label">${esc(ql.title)}</span>
        </a>
        <button class="ql-del-btn" data-id="${ql.id}" title="Remove">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>`;
      wrap.appendChild(item);
    });

    // Add new button
    const addBtn = document.createElement('div');
    addBtn.className = 'ql-item ql-add';
    addBtn.id = 'ql-add-btn';
    addBtn.innerHTML = `
      <div class="ql-link" style="cursor:pointer">
        <div class="ql-icon ql-icon-add">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <span class="ql-label">Add</span>
      </div>`;
    wrap.appendChild(addBtn);

    // Sortable — destroy previous instance before creating a new one
    if (window.Sortable) {
      qlSortable?.destroy();
      qlSortable = Sortable.create(wrap, {
        animation: 160,
        filter: '.ql-add',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: async () => {
          const ids = $$('#quick-links-row .ql-item:not(.ql-add)').map(el => el.dataset.id);
          D.quickLinks = ids.map(id => D.quickLinks.find(q => q.id === id)).filter(Boolean);
          await Storage.save(D);
        },
      });
    }

    // Events — abort previous listener before adding a new one
    qlAbort?.abort();
    qlAbort = new AbortController();
    wrap.addEventListener('click', async (e) => {
      const del = e.target.closest('.ql-del-btn');
      if (del) {
        e.preventDefault();
        D = await Storage.deleteQuickLink(D, del.dataset.id);
        renderQuickLinks();
        return;
      }
      if (e.target.closest('#ql-add-btn')) {
        showModal('ql-modal');
        $('#ql-modal-title')?.focus();
      }
    }, { signal: qlAbort.signal });
  }

  // ══════════════════════════════════════════════════════════
  // GROUPS (bookmark folder widgets)
  // ══════════════════════════════════════════════════════════
  function renderGroups() {
    const container = $('#groups-container');
    if (!container) return;

    sortables.forEach(s => { try { s.destroy(); } catch(_){} });
    sortables = [];
    container.innerHTML = '';

    D.groups.forEach(group => {
      container.appendChild(buildGroupWidget(group));
    });

    // Group-level drag
    sortables.push(Sortable.create(container, {
      animation: 200,
      handle: '.group-drag-handle',
      ghostClass: 'sortable-ghost',
      onEnd: async () => {
        const ordered = $$('#groups-container .group-widget')
          .map(el => D.groups.find(g => g.id === el.dataset.gid))
          .filter(Boolean);
        D.groups = ordered;
        await Storage.save(D);
      },
    }));

    // Bookmark-level drag (cross-group)
    D.groups.forEach(group => {
      const list = container.querySelector(`.bookmarks-list[data-gid="${group.id}"]`);
      if (!list) return;
      sortables.push(Sortable.create(list, {
        group: 'bookmarks',
        animation: 140,
        ghostClass: 'sortable-ghost',
        onEnd: async (evt) => {
          const fromGid = evt.from.dataset.gid;
          const toGid   = evt.to.dataset.gid;
          const fromG = D.groups.find(g => g.id === fromGid);
          const toG   = D.groups.find(g => g.id === toGid);
          if (!fromG || !toG) return;
          const [moved] = fromG.bookmarks.splice(evt.oldIndex, 1);
          toG.bookmarks.splice(evt.newIndex, 0, moved);
          await Storage.save(D);
        },
      }));
    });

  }

  function buildGroupWidget(group) {
    const wrap = document.createElement('div');
    wrap.className = 'group-widget';
    wrap.dataset.gid = group.id;

    const accent = group.color || 'var(--c-accent)';
    wrap.innerHTML = `
      <div class="widget-inner" style="--ga:${accent}">
        <div class="widget-header">
          <span class="group-drag-handle" title="Drag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9"  cy="4"  r="1.5"/><circle cx="15" cy="4"  r="1.5"/>
              <circle cx="9"  cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9"  cy="20" r="1.5"/><circle cx="15" cy="20" r="1.5"/>
            </svg>
          </span>
          <span class="group-dot" style="background:${accent}"></span>
          <h3 class="widget-title" data-gid="${group.id}">${esc(group.title)}</h3>
          <div class="widget-actions">
            <button class="icon-btn add-bm-btn" data-gid="${group.id}" title="Add bookmark">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button class="icon-btn del-group-btn" data-gid="${group.id}" title="Delete group">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
        <ul class="bookmarks-list" data-gid="${group.id}">
          ${group.bookmarks.length === 0
            ? '<li class="bm-empty">No bookmarks yet — click <strong>+</strong> to add</li>'
            : group.bookmarks.map(b => buildBookmarkLi(b, group.id)).join('')}
        </ul>
        <div class="add-bm-form hidden" id="abf-${group.id}">
          <input class="bm-input" id="abf-title-${group.id}" placeholder="Title" maxlength="50" />
          <input class="bm-input" id="abf-url-${group.id}"   placeholder="https://…" type="url" />
          <div class="bm-form-btns">
            <button class="btn-primary bm-save-btn" data-gid="${group.id}">Add</button>
            <button class="btn-ghost   bm-cancel-btn" data-gid="${group.id}">Cancel</button>
          </div>
        </div>
      </div>`;
    return wrap;
  }

  function buildBookmarkLi(b, gid) {
    const fav = b.favicon || Storage.getFaviconUrl(b.url);
    return `
      <li class="bm-item" data-bid="${b.id}" data-gid="${gid}">
        <a href="${safeUrl(b.url)}" class="bm-link" title="${esc(b.url)}">
          <img src="${safeUrl(fav)}" class="bm-fav" alt="" data-fallback="${esc((b.title||'?')[0])}" />
          <span class="bm-fav-fb" style="display:none">${esc((b.title||'?')[0])}</span>
          <span class="bm-title">${esc(b.title)}</span>
        </a>
        <button class="icon-btn del-bm-btn" data-bid="${b.id}" data-gid="${gid}" title="Remove">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </li>`;
  }

  // ══════════════════════════════════════════════════════════
  // IMAGE FALLBACKS  (replaces inline onerror)
  // ══════════════════════════════════════════════════════════
  function bindImageFallbacks() {
    // error events on <img> don't bubble — use capture on document once
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.classList.contains('ql-favicon')) {
        img.style.display = 'none';
        const letter = img.nextElementSibling;
        if (letter?.classList.contains('ql-letter')) letter.style.display = 'flex';
      } else if (img.classList.contains('bm-fav')) {
        img.style.display = 'none';
        const fb = img.nextElementSibling;
        if (fb?.classList.contains('bm-fav-fb')) fb.style.display = 'flex';
      }
    }, true); // capture phase — reaches img before it can be removed
  }

  function bindGroupEvents(container) {
    // Called once from init() — event delegation works on dynamically re-rendered children
    container.addEventListener('click', async (e) => {
      // Delete group
      const dg = e.target.closest('.del-group-btn');
      if (dg) {
        if (!confirm('Delete group and all bookmarks?')) return;
        D = await Storage.deleteGroup(D, dg.dataset.gid);
        renderGroups(); return;
      }
      // Open add-bookmark form
      const ab = e.target.closest('.add-bm-btn');
      if (ab) {
        const f = $(`#abf-${ab.dataset.gid}`);
        f?.classList.toggle('hidden');
        $(`#abf-title-${ab.dataset.gid}`)?.focus(); return;
      }
      // Save bookmark
      const sv = e.target.closest('.bm-save-btn');
      if (sv) {
        const gid = sv.dataset.gid;
        let url   = $(`#abf-url-${gid}`)?.value.trim();
        const ttl = $(`#abf-title-${gid}`)?.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        D = await Storage.addBookmark(D, gid, ttl || url, url);
        renderGroups(); return;
      }
      // Cancel form
      const cx = e.target.closest('.bm-cancel-btn');
      if (cx) { $(`#abf-${cx.dataset.gid}`)?.classList.add('hidden'); return; }
      // Delete bookmark
      const db = e.target.closest('.del-bm-btn');
      if (db) {
        D = await Storage.deleteBookmark(D, db.dataset.gid, db.dataset.bid);
        renderGroups(); return;
      }
      // Inline edit group title
      const wt = e.target.closest('.widget-title');
      if (wt) { startEditTitle(wt); return; }
    });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const form = e.target.closest('.add-bm-form');
      if (form) form.querySelector('.bm-save-btn')?.click();
    });
  }

  function startEditTitle(el) {
    const gid = el.dataset.gid;
    const orig = el.textContent;
    const inp = document.createElement('input');
    inp.className = 'widget-title-input';
    inp.value = orig;
    el.replaceWith(inp);
    inp.focus(); inp.select();
    let cancelled = false;
    const done = async () => {
      if (cancelled) { renderGroups(); return; }
      const v = inp.value.trim() || orig;
      D = await Storage.updateGroup(D, gid, { title: v });
      renderGroups();
    };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inp.blur();
      if (e.key === 'Escape') { cancelled = true; inp.blur(); }
    });
  }

  // ══════════════════════════════════════════════════════════
  // TOP BAR BINDINGS
  // ══════════════════════════════════════════════════════════
  function bindTopbar() {
    $('#settings-toggle-btn')?.addEventListener('click', openSidebar);
    $('#add-group-btn')?.addEventListener('click', () => showModal('add-group-modal'));
  }

  // ══════════════════════════════════════════════════════════
  // SIDEBAR
  // ══════════════════════════════════════════════════════════
  function openSidebar()  {
    sidebarOpen = true;
    $('#settings-sidebar')?.classList.add('open');
    $('#sidebar-overlay')?.classList.add('active');
  }
  function closeSidebar() {
    sidebarOpen = false;
    $('#settings-sidebar')?.classList.remove('open');
    $('#sidebar-overlay')?.classList.remove('active');
  }

  function syncSettingsUI() {
    const s = D.settings;
    const lw = s.logoWidget || {};

    const set = (id, v) => { const el = $(id); if (el) el.value = v ?? ''; };
    const chk = (id, v) => { const el = $(id); if (el) el.checked = !!v; };

    set('#setting-bg-url',         s.backgroundUrl);
    set('#setting-opacity',        s.widgetOpacity ?? 0.82);
    set('#setting-scheme',         s.colorScheme || 'dark');
    set('#setting-search-engine',  s.searchEngine || 'google');
    set('#setting-search-custom',  s.searchEngineCustomUrl || '');
    set('#setting-logo-type',      lw.type || 'text');
    set('#setting-logo-text',      lw.text || 'Apin Dashboard');
    set('#setting-logo-url',       lw.imageUrl || '');
    chk('#setting-logo-enabled',   lw.enabled !== false);

    const ov = $('#opacity-value');
    if (ov) ov.textContent = Math.round((s.widgetOpacity ?? 0.82) * 100) + '%';

    const cs = $('#custom-colors-section');
    if (cs) cs.style.display = s.colorScheme === 'custom' ? 'block' : 'none';

    const sc = $('#search-custom-row');
    if (sc) sc.style.display = s.searchEngine === 'custom' ? 'flex' : 'none';

    const lt = $('#logo-text-row');
    const li = $('#logo-image-row');
    if (lt) lt.style.display = (lw.type !== 'image') ? 'flex' : 'none';
    if (li) li.style.display = (lw.type === 'image')  ? 'flex' : 'none';

    const cc = s.customColors || {};
    set('#cc-bg',     cc.bg);
    set('#cc-widget', cc.widget);
    set('#cc-accent', cc.accent);
    set('#cc-text',   cc.text);
  }

  // ══════════════════════════════════════════════════════════
  // SETTINGS PANEL BINDINGS
  // ══════════════════════════════════════════════════════════
  function bindSettings() {
    $('#sidebar-overlay')?.addEventListener('click', closeSidebar);
    $('#settings-close-btn')?.addEventListener('click', closeSidebar);

    // Background URL
    let bgT;
    $('#setting-bg-url')?.addEventListener('input', e => {
      clearTimeout(bgT);
      bgT = setTimeout(async () => {
        D = await Storage.updateSettings({ backgroundUrl: e.target.value.trim(), backgroundBlob: null }, D);
        applyTheme();
      }, 600);
    });

    // Background file
    $('#setting-bg-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = async ev => {
        D = await Storage.updateSettings({ backgroundBlob: ev.target.result, backgroundUrl: '' }, D);
        applyTheme();
      };
      r.readAsDataURL(file);
    });

    $('#clear-bg-btn')?.addEventListener('click', async () => {
      D = await Storage.updateSettings({ backgroundUrl: '', backgroundBlob: null }, D);
      const el = $('#setting-bg-url'); if (el) el.value = '';
      applyTheme();
    });

    // Opacity
    $('#setting-opacity')?.addEventListener('input', async e => {
      const v = parseFloat(e.target.value);
      const ov = $('#opacity-value'); if (ov) ov.textContent = Math.round(v*100) + '%';
      D = await Storage.updateSettings({ widgetOpacity: v }, D);
      document.documentElement.style.setProperty('--opacity', v);
    });

    // Color scheme
    $('#setting-scheme')?.addEventListener('change', async e => {
      D = await Storage.updateSettings({ colorScheme: e.target.value }, D);
      applyTheme();
    });

    // Custom colors
    for (const [id, key] of [['#cc-bg','bg'],['#cc-widget','widget'],['#cc-accent','accent'],['#cc-text','text']]) {
      $(id)?.addEventListener('input', async e => {
        const cc = { ...(D.settings.customColors||{}), [key]: e.target.value };
        D = await Storage.updateSettings({ customColors: cc }, D);
        if (D.settings.colorScheme === 'custom') applyTheme();
      });
    }

    // Search engine
    $('#setting-search-engine')?.addEventListener('change', async e => {
      D = await Storage.updateSettings({ searchEngine: e.target.value }, D);
      const sc = $('#search-custom-row');
      if (sc) sc.style.display = e.target.value === 'custom' ? 'flex' : 'none';
      renderSearch();
    });
    let scT;
    $('#setting-search-custom')?.addEventListener('input', e => {
      clearTimeout(scT);
      scT = setTimeout(async () => {
        D = await Storage.updateSettings({ searchEngineCustomUrl: e.target.value.trim() }, D);
        renderSearch();
      }, 600);
    });

    // Logo enabled
    $('#setting-logo-enabled')?.addEventListener('change', async e => {
      D = await Storage.updateSettings({ logoWidget: { ...D.settings.logoWidget, enabled: e.target.checked } }, D);
      renderLogo();
    });

    // Logo type
    $('#setting-logo-type')?.addEventListener('change', async e => {
      D = await Storage.updateSettings({ logoWidget: { ...D.settings.logoWidget, type: e.target.value } }, D);
      syncSettingsUI();
      renderLogo();
    });

    // Logo text
    let ltT;
    $('#setting-logo-text')?.addEventListener('input', e => {
      clearTimeout(ltT);
      ltT = setTimeout(async () => {
        D = await Storage.updateSettings({ logoWidget: { ...D.settings.logoWidget, text: e.target.value } }, D);
        renderLogo();
      }, 400);
    });

    // Logo image URL
    let liT;
    $('#setting-logo-url')?.addEventListener('input', e => {
      clearTimeout(liT);
      liT = setTimeout(async () => {
        D = await Storage.updateSettings({ logoWidget: { ...D.settings.logoWidget, imageUrl: e.target.value.trim(), imageBlob: null } }, D);
        renderLogo();
      }, 600);
    });

    // Logo image file
    $('#setting-logo-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = async ev => {
        D = await Storage.updateSettings({ logoWidget: { ...D.settings.logoWidget, imageBlob: ev.target.result, imageUrl: '' } }, D);
        renderLogo();
      };
      r.readAsDataURL(file);
    });

    // Export JSON
    $('#export-btn')?.addEventListener('click', () => Storage.exportJSON(D));

    // Import JSON
    $('#import-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        D = await Storage.importJSON(file);
        applyTheme();
        renderLogo();
        renderSearch();
        renderQuickLinks();
        renderGroups();
        alert('Settings imported successfully!');
      } catch(err) {
        alert('Import failed: ' + err.message);
      }
      e.target.value = '';
    });
  }

  // ══════════════════════════════════════════════════════════
  // MODALS
  // ══════════════════════════════════════════════════════════
  function showModal(id)  { $(`#${id}`)?.classList.remove('hidden'); }
  function closeModal(id) { $(`#${id}`)?.classList.add('hidden'); }

  function bindModals() {
    // Add group
    $('#add-group-confirm')?.addEventListener('click', async () => {
      const title = $('#modal-group-title')?.value.trim();
      const color = $('#modal-group-color')?.value || '#7c6af7';
      if (!title) return;
      D = await Storage.addGroup(D, title, color);
      renderGroups();
      closeModal('add-group-modal');
      $('#modal-group-title').value = '';
    });
    $('#add-group-cancel')?.addEventListener('click', () => closeModal('add-group-modal'));
    $('#modal-group-title')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#add-group-confirm')?.click();
      if (e.key === 'Escape') closeModal('add-group-modal');
    });

    // Add quick link
    $('#ql-modal-confirm')?.addEventListener('click', async () => {
      const title = $('#ql-modal-title')?.value.trim();
      let url     = $('#ql-modal-url')?.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      D = await Storage.addQuickLink(D, title || url, url);
      renderQuickLinks();
      closeModal('ql-modal');
      $('#ql-modal-title').value = '';
      $('#ql-modal-url').value   = '';
    });
    $('#ql-modal-cancel')?.addEventListener('click', () => closeModal('ql-modal'));
    $('#ql-modal-url')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#ql-modal-confirm')?.click();
      if (e.key === 'Escape') closeModal('ql-modal');
    });

    // Close modals on backdrop click
    $$('.modal-backdrop').forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) m.classList.add('hidden');
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // UTILITY
  // ══════════════════════════════════════════════════════════

  /** HTML-escape for text content and non-URL attributes (title, placeholder, etc.) */
  function esc(str = '') {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  /**
   * Safe URL for href/src attributes.
   * Allows only http(s) to prevent javascript: XSS.
   * Does NOT HTML-escape — browsers expect raw URLs in href/src.
   */
  function safeUrl(url = '') {
    const s = String(url).trim();
    return /^https?:\/\//i.test(s) ? s : '#';
  }

  return { init };
})();