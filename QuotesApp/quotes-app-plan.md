# Quotes App — Plan

A small, for-fun app to store and retrieve quotes you like. Laptop only. Single HTML file, no server, no build, no dependencies.

---

## Decisions

These were settled by discussion, not assumed:

| Topic | Decision |
| --- | --- |
| **Purpose** | Build for fun — optimize for satisfying-to-build and pleasant-to-use, keep it small. |
| **Platform** | Laptop only. No phone, no sync. |
| **Shape** | A single HTML file you double-click to open in the browser. No server, no build step. |
| **Language** | Plain JavaScript. No types, no compilation. |
| **Storage** | Auto-save to `localStorage` (never lose data) **+** Export/Import a real `quotes.json` for backup, hand-editing, and portability. |
| **Scale** | Hundreds of quotes. Everything runs in memory — instant. |

---

## Data model

A quote is an object. Only `text` is required; the rest are optional and you fill in what you have.

| Field | Required | Notes |
| --- | --- | --- |
| `text` | ✅ | The quote itself. |
| `author` | optional | Who said/wrote it. |
| `source` | optional | Book, article, or URL. |
| `tags` | optional | Themes. Entered comma-separated, stored as a list. |
| `page` | optional | Page number (mostly for books). |
| `note` | optional | Your own reason for saving it. |
| `dateAdded` | auto | Captured automatically. |
| `id` | auto | Unique id per quote (for edit/delete). |

---

## Features

- **Add a quote** — a form: text + the optional fields.
- **Browse** — quotes as cards, newest first.
- **Search** — a live box that filters across text, author, and note.
- **Filter** — click a tag chip or an author to narrow the list; click again to clear.
- **Surprise me** — a button that spotlights one random quote.
- **Edit & delete** — fix a typo or remove a quote. (Table stakes; included even though not explicitly requested.)
- **Export / Import** — download `quotes.json`; load it back.

---

## How it's structured

- **One file**: HTML + a `<style>` block + one plain-JS `<script>`.
- Quotes live as an array of objects in `localStorage` under a versioned key.
- All retrieval (search / filter / random) runs in memory — trivial at hundreds of quotes.
- User text is **escaped on render**, so a quote containing `<` or `&` can't break the layout.
- A real design pass: clean, calm, reading-focused typography — since *reading* the quotes is the whole point. Not generic-bootstrap look.

---

## Defaults (changeable)

- Newest-first ordering.
- "Surprise me" = random on each click (not a fixed daily quote).
- Look: warm, minimal, quote-forward. Open to a different vibe (dark, playful, terminal-green, serif-literary…).

---

## Build order

1. Scaffold the HTML file: header (title, Export/Import, Surprise me), add-quote form, filter bar, quote-list container.
2. Data layer: localStorage load/save, the quote schema, add/edit/delete, export/import.
3. Render quote cards from the current filtered list.
4. Wire up search + tag/author filtering to re-render.
5. Random spotlight.
6. Styling / design pass.

---

## Caveat

`localStorage` on a `file://` page can be wiped if you clear browsing data — that's exactly why Export exists. Habit: hit Export now and then to keep a real `quotes.json` backup.
