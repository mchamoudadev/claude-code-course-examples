---
description: Adds or extends a feature in the Quotes App. Use when the user wants to add a new field to a quote, a new filter, a button, sorting, or export — anything that touches index.html, style.css, or script.js.
---

# Add a feature to the Quotes App

1. Read `script.js` first to find the state and the render functions.
2. Put markup in `index.html`, styles in `style.css`, logic in `script.js`.
3. If the feature stores new data on a quote, save it in localStorage under `quotes-app-data` — never rename that key.
4. Wire events through the existing delegated listener on the quote list.
5. Match the style: 2-space indent, template literals for HTML, verb-first function names.
6. Reload `index.html` and confirm the new feature works and nothing else broke.