---
name: css-escape-selector-pattern
description: CSS.escape is needed for querySelector attribute selectors when IDs can come from import (arbitrary strings); uid() IDs are always CSS-safe so the fallback is only a risk for imported quotes
metadata:
  type: feedback
---

QuotesApp IDs from `uid()` are always `q_` + alphanumeric, so they are CSS-safe without escaping. However, imported quotes pass through `normalize()` as `String(o.id)`, which can be arbitrary. An unescaped imported ID in an attribute selector like `[data-id="foo"bar"]` corrupts the selector.

The safe pattern is:
```js
'.fav[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'
```

`CSS.escape` is available in all browsers that support `prefers-reduced-motion` (Chrome 46+, Firefox 48+, Safari 10+), so the fallback effectively means IE only. The `if (star)` guard downstream prevents crashes — the animation just silently skips if the selector fails.

**Why:** Imported IDs are arbitrary strings; native `uid()` IDs are CSS-safe but imports are not constrained.

**How to apply:** Any post-render `querySelector` using an id-derived attribute selector must go through `CSS.escape`. The `if (found)` guard is mandatory whenever the node might not exist (e.g. filtered out of view).

See also: [[animationend-reduced-motion-pitfall]]
