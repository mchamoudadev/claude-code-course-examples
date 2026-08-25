"use strict";
(function () {
  // ---------------------------------------------------------------------------
  // Data layer: localStorage load/save + schema + CRUD + export/import
  // ---------------------------------------------------------------------------
  const STORE_KEY = "quotes.v1";

  /** In-memory source of truth. Array of quote objects. */
  let quotes = [];

  /** UI state. */
  const state = {
    search: "",
    tag: null,
    author: null,
    category: null,
    favoritesOnly: false,
    spotlightId: null,
  };

  function uid() {
    return "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) { quotes = []; return; }
      const parsed = JSON.parse(raw);
      quotes = Array.isArray(parsed) ? parsed.map(normalize).filter(Boolean) : [];
    } catch (err) {
      console.error("Failed to load quotes:", err);
      quotes = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(quotes));
    } catch (err) {
      console.error("Failed to save quotes:", err);
      toast("Couldn't save — storage may be full or blocked.");
    }
  }

  /** Coerce an arbitrary object into a valid quote, or null if unusable. */
  function normalize(o) {
    if (!o || typeof o !== "object") return null;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (!text) return null;
    let tags = [];
    if (Array.isArray(o.tags)) {
      tags = o.tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof o.tags === "string") {
      tags = parseTags(o.tags);
    }
    return {
      id: o.id ? String(o.id) : uid(),
      text,
      author: typeof o.author === "string" ? o.author.trim() : "",
      category: typeof o.category === "string" ? o.category.trim() : "",
      source: typeof o.source === "string" ? o.source.trim() : "",
      tags,
      page: o.page != null && String(o.page).trim() !== "" ? String(o.page).trim() : "",
      note: typeof o.note === "string" ? o.note.trim() : "",
      favorite: o.favorite === true,
      dateAdded: o.dateAdded || new Date().toISOString(),
    };
  }

  function parseTags(str) {
    return String(str)
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)
      // de-dupe, case-insensitive, keep first spelling
      .filter((t, i, arr) => arr.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i);
  }

  function addQuote(data) {
    const q = normalize(Object.assign({ dateAdded: new Date().toISOString() }, data));
    if (!q) return null;
    quotes.push(q);
    save();
    return q;
  }

  function updateQuote(id, data) {
    const idx = quotes.findIndex(q => q.id === id);
    if (idx === -1) return null;
    const merged = normalize(Object.assign({}, quotes[idx], data, { id, dateAdded: quotes[idx].dateAdded }));
    if (!merged) return null;
    quotes[idx] = merged;
    save();
    return merged;
  }

  function deleteQuote(id) {
    const idx = quotes.findIndex(q => q.id === id);
    if (idx === -1) return false;
    quotes.splice(idx, 1);
    if (state.spotlightId === id) state.spotlightId = null;
    save();
    return true;
  }

  function toggleFavorite(id) {
    const q = quotes.find(x => x.id === id);
    if (!q) return null;
    q.favorite = !q.favorite;
    save();
    return q.favorite;
  }

  // ---------------------------------------------------------------------------
  // Retrieval: filter + search (all in memory)
  // ---------------------------------------------------------------------------
  function visibleQuotes() {
    const q = state.search.trim().toLowerCase();
    let list = quotes.slice();

    if (state.favoritesOnly) {
      list = list.filter(item => item.favorite);
    }
    if (state.tag) {
      const t = state.tag.toLowerCase();
      list = list.filter(item => item.tags.some(tag => tag.toLowerCase() === t));
    }
    if (state.author) {
      const a = state.author.toLowerCase();
      list = list.filter(item => item.author.toLowerCase() === a);
    }
    if (state.category) {
      const c = state.category.toLowerCase();
      list = list.filter(item => item.category.toLowerCase() === c);
    }
    if (q) {
      list = list.filter(item =>
        item.text.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q)
      );
    }
    // newest first
    list.sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || ""));
    return list;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const listEl = $("#list");
  const countEl = $("#count");
  const filtersEl = $("#filters");
  const spotlightHost = $("#spotlight-host");
  const btnFavorites = $("#btn-favorites");
  const categoryOptions = $("#category-options");

  /** Escape user text so it can't break layout or inject markup. */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Escape, then highlight the current search term. Operates on raw text. */
  function escHighlight(s) {
    const term = state.search.trim();
    if (!term) return esc(s);
    const lower = String(s).toLowerCase();
    const t = term.toLowerCase();
    let out = "";
    let i = 0;
    while (i < s.length) {
      const at = lower.indexOf(t, i);
      if (at === -1) { out += esc(s.slice(i)); break; }
      out += esc(s.slice(i, at));
      out += '<mark class="hit">' + esc(s.slice(at, at + t.length)) + "</mark>";
      i = at + t.length;
    }
    return out;
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d)) return "";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return ""; }
  }

  function isUrl(s) { return /^https?:\/\//i.test(s); }

  /** Deterministic hue (0–359) from a string, so each tag/category gets a stable color. */
  function hueFor(s) {
    let h = 0;
    const str = String(s);
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  function sourceHtml(q) {
    let src = q.source ? escHighlight(q.source) : "";
    if (q.source && isUrl(q.source)) {
      src = '<a href="' + esc(q.source) + '" target="_blank" rel="noopener">' + escHighlight(q.source) + "</a>";
    }
    if (q.page) {
      src += (q.source ? ", " : "") + "p.&nbsp;" + esc(q.page);
    }
    return src;
  }

  function bylineHtml(q) {
    const parts = [];
    if (q.author) {
      parts.push('<span class="author" data-author="' + esc(q.author) + '">' + escHighlight(q.author) + "</span>");
    }
    const src = sourceHtml(q);
    if (src) {
      if (parts.length) parts.push('<span class="sep">·</span>');
      parts.push('<span class="source">' + src + "</span>");
    }
    return parts.join(" ");
  }

  function cardHtml(q) {
    let html = '<article class="card" data-id="' + esc(q.id) + '">';
    html += "<blockquote>" + escHighlight(q.text) + "</blockquote>";

    const byline = bylineHtml(q);
    if (byline) html += '<div class="byline">' + byline + "</div>";

    if (q.note) html += '<div class="note">' + escHighlight(q.note) + "</div>";

    if (q.category) {
      html += '<div class="cat-line"><span class="cat" data-category="' + esc(q.category) +
        '" style="--h:' + hueFor(q.category) + '" title="Group by this category">' +
        escHighlight(q.category) + "</span></div>";
    }

    if (q.tags.length) {
      html += '<div class="tags">' +
        q.tags.map(t => '<span class="tag" data-tag="' + esc(t) + '">' + esc(t) + "</span>").join("") +
        "</div>";
    }

    html += '<div class="card-foot">';
    html += '<span class="date">' + esc(fmtDate(q.dateAdded)) + "</span>";
    const favLabel = q.favorite ? "Remove from favorites" : "Add to favorites";
    html += '<button class="icon fav" data-act="fav" data-id="' + esc(q.id) +
      '" aria-pressed="' + (q.favorite ? "true" : "false") +
      '" aria-label="' + favLabel + '" title="' + favLabel + '">' +
      (q.favorite ? "★" : "☆") + "</button>";
    html += '<button class="icon ghost" data-act="image" data-id="' + esc(q.id) +
      '" title="Save this quote as an image">Save image</button>';
    html += '<button class="icon ghost" data-act="edit" data-id="' + esc(q.id) + '">Edit</button>';
    html += '<button class="icon danger" data-act="delete" data-id="' + esc(q.id) + '">Delete</button>';
    html += "</div></article>";
    return html;
  }

  function renderFilters() {
    let html = "";
    if (state.favoritesOnly) {
      html += '<span class="filter-pill"><span class="k">★</span> Favorites' +
        ' <button data-clear="favorites" title="Show all quotes">✕</button></span>';
    }
    if (state.tag) {
      html += '<span class="filter-pill"><span class="k">tag</span> ' + esc(state.tag) +
        ' <button data-clear="tag" title="Clear tag filter">✕</button></span>';
    }
    if (state.author) {
      html += '<span class="filter-pill"><span class="k">author</span> ' + esc(state.author) +
        ' <button data-clear="author" title="Clear author filter">✕</button></span>';
    }
    if (state.category) {
      html += '<span class="filter-pill"><span class="k">category</span> ' + esc(state.category) +
        ' <button data-clear="category" title="Clear category filter">✕</button></span>';
    }
    filtersEl.innerHTML = html;
  }

  /** Refresh the <datalist> of existing categories for the form's autocomplete. */
  function renderCategoryOptions() {
    const seen = new Set();
    const cats = [];
    for (const q of quotes) {
      if (!q.category) continue;
      const key = q.category.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cats.push(q.category);
    }
    cats.sort((a, b) => a.localeCompare(b));
    categoryOptions.innerHTML = cats.map(c => '<option value="' + esc(c) + '"></option>').join("");
  }

  function renderCount(n) {
    const total = quotes.length;
    if (total === 0) { countEl.textContent = ""; return; }
    const filtered = (state.search || state.tag || state.author || state.category || state.favoritesOnly);
    countEl.textContent = filtered
      ? n + " of " + total + (total === 1 ? " quote" : " quotes")
      : total + (total === 1 ? " quote" : " quotes");
  }

  function render() {
    renderFilters();
    renderCategoryOptions();
    btnFavorites.setAttribute("aria-pressed", state.favoritesOnly ? "true" : "false");
    const list = visibleQuotes();
    renderCount(list.length);

    if (quotes.length === 0) {
      listEl.innerHTML =
        '<div class="empty"><div class="big">No quotes yet</div>' +
        '<div class="sub">Open the form above and save your first line — or Import a <code>quotes.json</code>.</div></div>';
      return;
    }
    if (list.length === 0) {
      const favEmpty = state.favoritesOnly && !state.search && !state.tag && !state.author;
      listEl.innerHTML = favEmpty
        ? '<div class="empty"><div class="big">No favorites yet</div>' +
          '<div class="sub">Tap the ☆ on any quote to keep it here.</div></div>'
        : '<div class="empty"><div class="big">Nothing matches</div>' +
          '<div class="sub">Try a different search or clear your filters.</div></div>';
      return;
    }
    listEl.innerHTML = list.map(cardHtml).join("");
  }

  // ---------------------------------------------------------------------------
  // Spotlight (Surprise me)
  // ---------------------------------------------------------------------------
  function renderSpotlight() {
    const id = state.spotlightId;
    if (!id) { spotlightHost.innerHTML = ""; return; }
    const q = quotes.find(x => x.id === id);
    if (!q) { spotlightHost.innerHTML = ""; state.spotlightId = null; return; }

    let html = '<div class="spotlight">';
    html += '<div class="badge"><span>Surprise</span><span class="badge-actions">' +
      '<button data-save-image title="Save this quote as an image">Save image</button>' +
      '<button data-close-spotlight title="Dismiss">✕</button></span></div>';
    html += "<blockquote>" + esc(q.text) + "</blockquote>";
    const meta = [];
    if (q.author) meta.push("— " + esc(q.author));
    const src = sourceHtml(q);
    if (src) meta.push(src);
    if (meta.length) html += '<div class="meta">' + meta.join(" &nbsp;·&nbsp; ") + "</div>";
    html += "</div>";
    spotlightHost.innerHTML = html;
  }

  function surprise() {
    if (quotes.length === 0) { toast("Add a quote first."); return; }
    let pick;
    if (quotes.length === 1) {
      pick = quotes[0];
    } else {
      // avoid repeating the current spotlight
      do { pick = quotes[Math.floor(Math.random() * quotes.length)]; }
      while (pick.id === state.spotlightId);
    }
    state.spotlightId = pick.id;
    renderSpotlight();
    spotlightHost.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------------------------------------------------------------------------
  // Form: add + edit
  // ---------------------------------------------------------------------------
  const form = $("#quote-form");
  const composer = $("#composer");
  const f = {
    id: $("#edit-id"), text: $("#text"), author: $("#author"), category: $("#category"),
    source: $("#source"), tags: $("#tags"), page: $("#page"), note: $("#note"),
  };
  const composerTitle = $("#composer-title");
  const btnCancel = $("#btn-cancel");
  const btnSave = $("#btn-save");
  const formError = $("#form-error");

  function resetForm() {
    form.reset();
    f.id.value = "";
    formError.textContent = "";
    composerTitle.textContent = "Add a quote";
    btnSave.textContent = "Save quote";
    btnCancel.hidden = true;
  }

  function startEdit(id) {
    const q = quotes.find(x => x.id === id);
    if (!q) return;
    f.id.value = q.id;
    f.text.value = q.text;
    f.author.value = q.author;
    f.category.value = q.category;
    f.source.value = q.source;
    f.tags.value = q.tags.join(", ");
    f.page.value = q.page;
    f.note.value = q.note;
    composerTitle.textContent = "Edit quote";
    btnSave.textContent = "Update quote";
    btnCancel.hidden = false;
    formError.textContent = "";
    composer.open = true;
    f.text.focus();
    composer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const text = f.text.value.trim();
    if (!text) {
      formError.textContent = "A quote needs some text.";
      f.text.focus();
      return;
    }
    const data = {
      text,
      author: f.author.value,
      category: f.category.value,
      source: f.source.value,
      tags: parseTags(f.tags.value),
      page: f.page.value,
      note: f.note.value,
    };
    const editing = f.id.value;
    if (editing) {
      updateQuote(editing, data);
      toast("Quote updated.");
    } else {
      addQuote(data);
      toast("Quote saved.");
    }
    resetForm();
    if (editing) composer.open = false;
    render();
  });

  btnCancel.addEventListener("click", function () {
    resetForm();
    composer.open = false;
  });

  // ---------------------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------------------
  function exportJson() {
    if (quotes.length === 0) { toast("Nothing to export yet."); return; }
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "quotes-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Exported " + quotes.length + " quote" + (quotes.length === 1 ? "" : "s") + ".");
  }

  const fileInput = $("#file-import");
  function importJson(file) {
    const reader = new FileReader();
    reader.onload = function () {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        toast("That file isn't valid JSON.");
        return;
      }
      const incoming = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.quotes) ? parsed.quotes : null);
      if (!incoming) { toast("Expected a JSON array of quotes."); return; }

      const existingIds = new Set(quotes.map(q => q.id));
      let added = 0, skipped = 0;
      for (const raw of incoming) {
        const q = normalize(raw);
        if (!q) { skipped++; continue; }
        if (existingIds.has(q.id)) { q.id = uid(); } // avoid collision, keep both
        quotes.push(q);
        existingIds.add(q.id);
        added++;
      }
      save();
      render();
      toast("Imported " + added + " quote" + (added === 1 ? "" : "s") +
        (skipped ? " (" + skipped + " skipped)" : "") + ".");
    };
    reader.onerror = function () { toast("Couldn't read that file."); };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // Save as image: render a quote onto a canvas "poster" and download a PNG.
  // Zero-dependency — drawn by hand with the Canvas API, styled from the same
  // design tokens as the page so the image matches the app.
  // ---------------------------------------------------------------------------
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /** Greedily wrap raw text into lines that fit maxWidth at the current ctx.font. */
  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    for (const para of String(text).split(/\n/)) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { lines.push(""); continue; }
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (line && ctx.measureText(test).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  /** Build a 1080×1080 poster canvas for one quote. Async: waits on web fonts. */
  async function renderQuoteCanvas(q) {
    const W = 1080, H = 1080;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = W * ratio;
    canvas.height = H * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    const ink    = cssVar("--ink", "#1a1916");
    const ink2   = cssVar("--ink-2", "#57534b");
    const ink3   = cssVar("--ink-3", "#8e897e");
    const paper  = cssVar("--paper", "#fcfbf8");
    const line2  = cssVar("--line-2", "#d7d2c5");
    const marker = cssVar("--marker", "#d8f549");
    const display = '"Fraunces", Georgia, "Times New Roman", serif';
    const mono = '"Spline Sans Mono", ui-monospace, Menlo, monospace';

    // Make sure the web fonts are ready before we measure/draw; fall back silently.
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([
          document.fonts.load('500 64px "Fraunces"'),
          document.fonts.load('500 24px "Spline Sans Mono"'),
        ]);
      }
    } catch (e) { /* system fonts will stand in */ }

    // Paper
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);

    const padX = 100;
    const maxWidth = W - padX * 2;

    // Eyebrow
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = ink3;
    ctx.font = '500 18px ' + mono;
    ctx.save();
    // letter-spaced uppercase, drawn glyph-by-glyph for tracking
    drawTracked(ctx, "THE COMMONPLACE BOOK", padX, 112, 3.5);
    ctx.restore();

    // Quote text — shrink the type until the block fits the middle band.
    const bandTop = 250, bandBottom = 838;
    let size = 64;
    let lines = [];
    let lineHeight = 0;
    while (size >= 30) {
      ctx.font = '500 ' + size + 'px ' + display;
      lines = wrapLines(ctx, q.text, maxWidth);
      lineHeight = Math.round(size * 1.3);
      if (lines.length * lineHeight <= (bandBottom - bandTop) - 56) break;
      size -= 3;
    }

    // Highlighter swipe — the app's signature — sits above the quote block.
    const blockH = 56 + lines.length * lineHeight;
    let y = bandTop + Math.max(0, ((bandBottom - bandTop) - blockH) / 2);
    roundRectPath(ctx, padX, y, 74, 16, 5);
    ctx.fillStyle = marker;
    ctx.fill();

    // Quote lines
    y += 56;
    ctx.fillStyle = ink;
    ctx.font = '500 ' + size + 'px ' + display;
    ctx.textBaseline = "top";
    for (const ln of lines) {
      ctx.fillText(ln, padX, y);
      y += lineHeight;
    }

    // Byline
    ctx.textBaseline = "alphabetic";
    let by = "";
    if (q.author) by += "— " + q.author;
    const srcBits = [];
    if (q.source) srcBits.push(q.source);
    if (q.page) srcBits.push("p. " + q.page);
    const srcText = srcBits.join(", ");
    ctx.font = '500 22px ' + mono;
    if (by) {
      ctx.fillStyle = ink2;
      ctx.fillText(by, padX, 906);
    }
    if (srcText) {
      ctx.fillStyle = ink3;
      ctx.fillText(srcText, padX, by ? 940 : 906);
    }

    // Footer rule + wordmark + brand dot, with the date on the right.
    ctx.strokeStyle = line2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, 982);
    ctx.lineTo(W - padX, 982);
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.font = '500 30px ' + display;
    ctx.textBaseline = "alphabetic";
    const mark = "Quotes";
    ctx.fillText(mark, padX, 1024);
    const markW = ctx.measureText(mark).width;
    ctx.beginPath();
    ctx.arc(padX + markW + 12, 1016, 5, 0, Math.PI * 2);
    ctx.fillStyle = marker;
    ctx.fill();

    const dateStr = fmtDate(q.dateAdded);
    if (dateStr) {
      ctx.fillStyle = ink3;
      ctx.font = '500 16px ' + mono;
      ctx.textAlign = "right";
      drawTracked(ctx, dateStr.toUpperCase(), W - padX, 1019, 1.5, "right");
      ctx.textAlign = "left";
    }

    return canvas;
  }

  /** Draw text with manual letter-spacing (canvas has no native tracking). */
  function drawTracked(ctx, text, x, y, gap, align) {
    const chars = String(text).split("");
    if (align === "right") {
      let total = 0;
      for (const c of chars) total += ctx.measureText(c).width + gap;
      x -= total - gap;
    }
    for (const c of chars) {
      ctx.fillText(c, x, y);
      x += ctx.measureText(c).width + gap;
    }
  }

  /** Path a rounded rectangle (roundRect isn't in every engine). */
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function saveQuoteImage(id) {
    const q = quotes.find(x => x.id === id);
    if (!q) return;
    try {
      const canvas = await renderQuoteCanvas(q);
      canvas.toBlob(function (blob) {
        if (!blob) { toast("Couldn't create the image."); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = "quote-" + stamp + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Image saved.");
      }, "image/png");
    } catch (err) {
      console.error("Failed to render quote image:", err);
      toast("Couldn't create the image.");
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  $("#btn-surprise").addEventListener("click", surprise);
  btnFavorites.addEventListener("click", function () {
    state.favoritesOnly = !state.favoritesOnly;
    render();
  });
  $("#btn-export").addEventListener("click", exportJson);
  $("#btn-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", function () {
    if (this.files && this.files[0]) importJson(this.files[0]);
    this.value = "";
  });

  let searchTimer = null;
  $("#search").addEventListener("input", function () {
    const v = this.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = v; render(); }, 80);
  });

  // Delegated clicks on the list (edit/delete/tag/author)
  listEl.addEventListener("click", function (e) {
    const actBtn = e.target.closest("[data-act]");
    if (actBtn) {
      const id = actBtn.getAttribute("data-id");
      const act = actBtn.getAttribute("data-act");
      if (act === "fav") {
        const nowFav = toggleFavorite(id);
        render();
        // render() replaced the star with a fresh node; play the pop on the
        // new one, but only when the quote just became a favorite.
        if (nowFav) {
          const star = listEl.querySelector('.fav[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
          if (star) {
            star.classList.add("fav--pop");
            star.addEventListener("animationend", function () {
              star.classList.remove("fav--pop");
            }, { once: true });
          }
        }
        toast(nowFav ? "Added to favorites." : "Removed from favorites.");
      }
      else if (act === "image") saveQuoteImage(id);
      else if (act === "edit") startEdit(id);
      else if (act === "delete") {
        const q = quotes.find(x => x.id === id);
        const preview = q ? '"' + q.text.slice(0, 50) + (q.text.length > 50 ? "…" : "") + '"' : "this quote";
        if (confirm("Delete " + preview + "?")) {
          deleteQuote(id);
          render();
          renderSpotlight();
          toast("Quote deleted.");
        }
      }
      return;
    }
    const tagEl = e.target.closest("[data-tag]");
    if (tagEl) {
      const t = tagEl.getAttribute("data-tag");
      state.tag = (state.tag && state.tag.toLowerCase() === t.toLowerCase()) ? null : t;
      render();
      return;
    }
    const authorEl = e.target.closest("[data-author]");
    if (authorEl) {
      const a = authorEl.getAttribute("data-author");
      state.author = (state.author && state.author.toLowerCase() === a.toLowerCase()) ? null : a;
      render();
      return;
    }
    const catEl = e.target.closest("[data-category]");
    if (catEl) {
      const c = catEl.getAttribute("data-category");
      state.category = (state.category && state.category.toLowerCase() === c.toLowerCase()) ? null : c;
      render();
      return;
    }
  });

  // Clear-filter pills
  filtersEl.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-clear]");
    if (!btn) return;
    const which = btn.getAttribute("data-clear");
    if (which === "tag") state.tag = null;
    if (which === "author") state.author = null;
    if (which === "category") state.category = null;
    if (which === "favorites") state.favoritesOnly = false;
    render();
  });

  // Spotlight actions: save image / dismiss
  spotlightHost.addEventListener("click", function (e) {
    if (e.target.closest("[data-save-image]")) {
      if (state.spotlightId) saveQuoteImage(state.spotlightId);
      return;
    }
    if (e.target.closest("[data-close-spotlight]")) {
      state.spotlightId = null;
      renderSpotlight();
    }
  });

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  load();
  render();

  // Expose a tiny hook for manual/automated verification in the console.
  window.__quotes = {
    get all() { return quotes; },
    add: addQuote,
    toggleFavorite,
    state,
    seed() {
      const samples = [
        { text: "The unexamined life is not worth living.", author: "Socrates", category: "Philosophy", source: "Apology", tags: "philosophy, life" },
        { text: "What we think, we become.", author: "Buddha", category: "Philosophy", tags: "mind, philosophy", note: "On attention." },
        { text: "It is not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein", category: "Science", tags: "persistence, science", page: 12 },
      ];
      samples.forEach(addQuote);
      render();
      return quotes.length;
    },
  };
})();
