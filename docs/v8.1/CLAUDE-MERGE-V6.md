# MEDIXA v6 merge instructions

Base: v5 reader. New: Lasso single-stroke selection/drag/scale/delete, magnified writing pad, pen-only pointer filter.

Files: site/pdf-notes.html, site/js/study-mode-v6.js, site/css/study-mode-v6.css.

Keep Claude authentication and cloud progress untouched. This patch saves annotations locally via the existing v1 storage key. Merge the three files carefully rather than replacing newer authentication work.

Limitations: Lasso currently selects an individual stroke by proximity (not multi-stroke freeform polygon). Zoom pad writes to a selectable normalized page area. Pen-only mode blocks touch ink but does not provide hardware-level palm rejection. Pressure sensitivity and true zoom-window synchronization remain future work.
