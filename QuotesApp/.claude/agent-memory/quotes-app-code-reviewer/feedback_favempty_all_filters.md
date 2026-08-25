---
name: favempty-all-filters
description: favEmpty empty-state guard must include every state filter — missing one causes wrong message when multiple filters combine with favoritesOnly
metadata:
  type: feedback
---

The `favEmpty` boolean in `render()` determines whether to show "No favorites yet" vs "Nothing matches" when `visibleQuotes()` returns an empty array. It must test ALL active state filters:

```js
// WRONG — missing state.category (and any future filter)
const favEmpty = state.favoritesOnly && !state.search && !state.tag && !state.author;

// CORRECT
const favEmpty = state.favoritesOnly && !state.search && !state.tag && !state.author && !state.category;
```

**Why:** If both `favoritesOnly` and `category` are active and no favorites exist in that category, `favEmpty` is truthy even though another filter is also narrowing the set. The user sees "No favorites yet" but they may have favorites outside that category — the accurate message is "Nothing matches."

**How to apply:** Any time a new filter dimension is added to `state`, add a corresponding `!state.<newFilter>` term to the `favEmpty` guard in `render()`. Treat it as a checklist item alongside adding the filter to `visibleQuotes()` and `renderFilters()`.

See also: [[animationend-reduced-motion-pitfall]]
