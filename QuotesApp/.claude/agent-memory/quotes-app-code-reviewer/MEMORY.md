# Code Reviewer Memory Index

- [animationend + reduced-motion pitfall](feedback_animationend_reduced_motion.md) — `animationend` won't fire when `animation:none`; class leaks until next render; use a JS matchMedia guard
- [CSS.escape for post-render querySelector](feedback_css_escape_pattern.md) — uid() IDs are CSS-safe; imported IDs are not; always CSS.escape + if(star) guard for attribute selectors
