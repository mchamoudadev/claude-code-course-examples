---
name: animationend-reduced-motion-pitfall
description: animationend never fires when animation:none — class leaks until next render; full re-render makes it functionally harmless but JS guard is cleaner
metadata:
  type: feedback
---

When a class triggers a CSS animation and cleanup relies on `animationend` with `{ once: true }`, `animationend` will NOT fire if `animation: none` is applied (e.g. via `prefers-reduced-motion: reduce`). The class then leaks on the DOM node.

In QuotesApp this is harmless because `render()` rebuilds `innerHTML` on every action, so no node survives more than one interaction. But the correct pattern is to gate the class addition behind a JS media-query check:

```js
const reducedMotion = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reducedMotion) {
  node.classList.add("my-anim-class");
  node.addEventListener("animationend", () => node.classList.remove("my-anim-class"), { once: true });
}
```

**Why:** Aligns JS path with CSS intent; removes hidden dependency on `animationend` firing.

**How to apply:** Flag any `animationend`-based cleanup that coexists with a CSS reduced-motion `animation: none` override. Check post-render DOM queries that add animation classes.

See also: [[css-escape-selector-pattern]]
