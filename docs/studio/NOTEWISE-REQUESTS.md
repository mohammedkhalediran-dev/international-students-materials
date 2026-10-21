# طلبات محمد للقارئ (2026-10-21) — المواصفات والحالة

محمد أرسل 11 طلباً (فيديوهات وصور من iPad) وأعطى موافقة كاملة على التنفيذ والرفع للموقع الأصلي طلباً أو طلبين في كل مرة، دون فحوص (يفحص بنفسه).

| # | الطلب | الحالة |
|---|---|---|
| 1 | التكبير بإصبعين يصغّر الواجهة ويقفز | منشور (cf143e5) |
| 2+8 | تحديد النص مثل Notewise | منشور (bd1a2cd) |
| 3 | إعدادات القلم مثل Notewise | منشور (05a4643) |
| 4 | شكل شريط الأدوات مثل الصورة 3 | منشور (05a4643) |
| 5 | مؤقت دراسة شفاف 25/5، 50/10، مفتوح + زر في الشريط | منشور (05a4643) |
| 6 | إعدادات التظليل مثل Notewise | منشور (05a4643) |
| 7 | مؤشر الليزر + زر في الشريط | منشور (05a4643) |
| 9 | القائمة لا تختفي + الملف يتحرك عند التبديل | منشور (cf143e5): سهم ⌄/⌃ وشريط يطفو فلا تتحرك الصفحة |
| 10 | وضع القراءة (العين) | منشور (05a4643) |
| 11 | التمييز بين القلم والإصبع تلقائياً + خيار تشغيل/إطفاء القلم | منشور (cf143e5) |

## R1 — التكبير بإصبعين

### ما يظهر

I extracted the frames at 10 fps and 30 fps and measured the size of the chrome and of the content in each frame. Coordinates are in a 1000-px-wide frame, and the iPad landscape view is 1180 CSS px wide.

0.00–0.43 s: Stable. Page 1 of 8 (the "Vitamins" slide) at 97%. The pen is the active tool. The compact chrome is in place:
- left pill: ‹, grid, search, folder
- centre tool pill: undo, redo, hand, pen (teal, active), highlighter, eraser, lasso, I, T, image, ⋯
- quick bar under it: ∿, 3 widths, 5 colours, +, sliders
- right pill: green sync dot, ⋯, document icon
- ^/v edge arrows on the right
- bottom-left pill: "1/8 | 97%"

0.47 s: A two-finger spread starts and the slide begins to grow (×1.12 at 0.5 s). In the same frames the whole UI moves left by about 32 px and shrinks to about 0.96. Safari's vertical scroll indicator appears at the far right edge, so the page itself changed size.

0.5–2.1 s: The fingers keep spreading, but on screen the slide grows only slowly: ×1.26 at 0.8 s, ×1.37 at 1.1 s, ×1.5 at 1.7 s, ×1.78 at 2.1 s. Meanwhile every fixed control shrinks and drifts left and up, with a chrome scale of about 0.86 at 0.8 s, 0.68 at 1.1 s and 0.66 at 1.7–2.1 s.
- The left pill and the bottom-left page/zoom pill slide off-screen.
- The tool pill and quick bar end up small in the top-left corner.
- The right pill and the ^/v arrows end up in the middle of the screen, on top of the slide.
- A grey strip of body background opens on the left of the page.

2.1–2.3 s: The chrome suddenly shrinks again to about 0.37. The tool pill disappears, and the right pill and arrows become tiny at about x=350. The slide barely grows (×1.55).

2.8–3.07 s: The fingers are still on the glass, yet the slide gets SMALLER. It goes back to about its original size, then to about ×0.75, and the next page's "Vitamins" heading shows below it. The chrome stays tiny. Spreading the fingers is now making the content smaller.

3.10 s (one frame): The fingers lift and everything snaps at once. The chrome returns to full size and its original position. The content jumps to 237% and shows the TOP-LEFT corner of page 1 (the molecule decoration, with a huge "Vitamins" at the bottom), not the area that was under the fingers. The label reads "237%".

3.10–4.6 s: Stable. A brightness and dark-pixel check over every 30 fps frame shows no white flash and no change in sharpness, because this page is a raster image.

In short, the problem is not blurriness or blank pages. During the pinch the whole web page (all fixed toolbars included) is rescaled and moved by Safari. The content does not follow the fingers and even shrinks while they spread. On release the zoom amount and position jump.

### الهدف

محمد يريد أن يكون التكبير والتصغير بإصبعين في قارئ PDF على iPad سلساً مثل Notewise.

1. أثناء الضم والفتح: الأشرطة والأزرار ثابتة لا تتحرك ولا تصغر. والمحتوى يكبر ويصغر حول نقطة منتصف الإصبعين ويتبعهما 1:1، ويتحرك معهما عند السحب.
2. عند رفع الأصابع: لا قفزة. تبقى النقطة التي تحت الأصابع مكانها بالتكبير الذي كان ظاهراً. وإن لزم تصحيح عند حدود التكبير أو حواف الصفحة، فحركة ناعمة قصيرة.
3. لا صفحات بيضاء ولا وميض. يكون المحتوى حاداً بعد التوقف، وتُستبدل النسخة الحادة دون أي وميض.
4. حدود التكبير واحدة في كل الطرق: من 40% إلى 800%.

### تفاصيل المرجع

There is no Notewise footage for this request, so the target is the standard native behaviour Mohammed asks for. It applies the same way on iPad landscape (1180×820), iPad portrait (820×1180) and phone (390×844).

1. Chrome is fixed during the gesture. Header pills, #studio-toolbar, #st-quickbar, #st-edge-nav and #mx-dock never move or scale. Safari's own page scale must stay 1 the whole time.

2. Live preview. Once the finger distance changes by more than 6% (the existing threshold), the pages scale about the current midpoint of the two fingers, starting at exactly 1.0 with no 6% pop. They also pan with the midpoint. A point of the document under the fingers stays under them for the whole gesture.

3. Limits: the preview range equals the committed range, 0.4×–8× (R.minZoom/R.maxZoom). Currently the preview stops at 4×.

4. Release:
- The committed zoom equals the zoom shown in the preview.
- The anchor point lands exactly where the fingers were.
- If scroll clamping prevents that (top or bottom of the document, zoom below 100% where pages are centred), the remaining offset is animated away: a translate on the visible sections going to 0 over 180 ms with cubic-bezier(.2,.8,.2,1). No snap.
- With prefers-reduced-motion or .reduced-motion there is no animation.

5. Sharpness and no flash:
- During the preview the existing bitmap is scaled, so it may look slightly soft but is never blank.
- At commit the old page bitmap and the old sharp layer (.pdf-hd) stay visible, scaled to the new size, until the new renders are ready. They are then swapped in one step, so there is never a cleared or blank canvas on screen.
- Ink is redrawn in the same frame as a resize, so annotations never blink.

6. Zoom label (#st-zoom-label, "97%"): optionally updates live during the pinch as Math.round(z0*s*100)+'%'. It must update at commit as it does now.

7. A third finger is still ignored, as now. Any pointerdown during the settle animation cancels the animation immediately.

### السبب

The pinch preview scales the page container itself, main#pages, which enlarges the WHOLE DOCUMENT. iPadOS Safari then rescales the entire web page to fit, and the gesture becomes a feedback loop.

1. studio-ink.js:855-858 (navMove, switch to 'pinch') sets transformOrigin and willChange on R.root, which is main#pages. studio-ink.js:861 then sets R.root.style.transform = translate(...) scale(s) on every move.
- main#pages is the full-width, full-height column of all pages. Its own transformed box counts towards the document's scrollable overflow. Only its children's overflow is contained by its overflow-x:auto (studio.css:130).
- The document is RTL (pdf-notes.html:1), so the overflow to the left is reachable.
- Measured in Chromium at 1180×820: with scale 1.5 about the screen centre, document scrollWidth went from 1180 to 1475 (scrollX reachable to -295) and scrollHeight from 7707 to 11206. At scale 2.5: 2065 and 18404. The same transform applied per section left the document at 1180/7707, with the overflow staying inside main#pages (its scrollWidth became 1310/1790).

2. iPadOS Safari uses desktop-class browsing by default. The viewport meta (pdf-notes.html:1) is "width=device-width,initial-scale=1,viewport-fit=cover", with no shrink-to-fit=no. When the document is wider than the view, Safari re-fits the page scale to about view width ÷ document width. That page scale is applied to everything, including all position:fixed chrome, which is why the UI shrinks and drifts.
- The measurements fit this model: preview scale s≈2.0 gives page scale ≈0.66 (observed 0.68 at 1.1 s). s clamped at 4/z0=4.12 gives ≈0.39 (observed 0.36–0.37 from 2.3 s on).

3. Feedback loop. Pointer clientX/clientY are in CSS px, so when Safari lowers the page scale the CSS distance between the same physical fingers grows. n.s = d/n.d0 (studio-ink.js:860) therefore jumps up with no finger movement: the jump to the 4/z0 clamp at about 2.2 s. Content on screen is s × pageScale, so it grows less than the fingers and can even shrink (2.8–3.07 s).
- Safari's layout-width change also fires 'resize' and the root ResizeObserver: studio-reader.js:156-157 (relayout) and :219. relayout() then drops the sharp layers, lays out and scrolls the pages in the middle of the gesture.
- Media queries flip because the layout viewport is wider than 1199 px, which is why the toolbar disappears.

4. The jump on release. navUp (studio-ink.js:867-870) clears the transform, so the document width snaps back and Safari restores scale 1. It then calls R.zoomAt(n.z0*n.s, n.m0) with s inflated by the loop (237% instead of what was shown) and with m0/last measured in the other coordinate space. The content lands somewhere else: the top-left of page 1.

Secondary issues: none is visible in this video because the page is a raster slide, but each one will show on text or vector PDFs and on scroll limits.
- a) Preview clamp mismatch. studio-ink.js:854 and :860 clamp s to [0.4/z0, 4/z0], but studio-reader.js:20 clampZ allows up to 8. The pinch stops following the fingers at 400%.
- b) Pop at pinch start. studio-ink.js:856 uses n.d0 = d / s, so the preview starts at scale 1.06.
- c) Blurry then sharp at every commit. zoomAt and setZoom (studio-reader.js:137, :147, and also :156) call R.pages.forEach(dropHd), removing every sharp layer (canvas.pdf-hd, and canvas.ink-hd via M.setInkHd(false)) at the moment of commit. The low-resolution base canvas, stretched by CSS, is shown until the 120 ms timer (line 150) and a full pdf.js render finish. hd() places the layer in absolute px (line 96), so it cannot survive a layout change.
- d) Blank or partial page flash. draw() (studio-reader.js:52-65) resizes p.pdf first, which clears it, and only then renders with pdf.js into that visible canvas. In display mode pdf.js draws in roughly 15 ms slices across animation frames, so text and vector pages show white, then fill in progressively. This is worse with disableFontFace:true, where glyphs are drawn as paths.
- e) Ink blink. The ink ResizeObserver (studio-ink.js:498) calls sizePage, which clears the ink canvas (lines 397-398), but the redraw only runs on the next requestAnimationFrame. Annotations vanish for about one frame at every zoom commit.
- f) The sharp layer is rendered twice. draw() ends with hdSoon() (line 68) and the zoom timer also calls hdSoon(0) (line 150). Each hd() re-renders the full visible region even when nothing changed, which doubles the delay before the page is sharp on iPad.
- g) Wasted work during the preview. The IntersectionObserver (studio-reader.js:217) sees the transformed boxes and runs settle() mid-gesture. It renders pages at the old zoom when zooming out and can release() pages when more than MAXKEEP=4 are rendered.

### خطة التنفيذ

The main fix is steps 1–4; steps 5–9 make the settle smooth and flash-free.

1. studio-ink.js, navMove (lines 850-862), at the switch from 'pan' to 'pinch': stop touching R.root. Transform the page sections instead; they are children of main#pages, a scroll container, so their overflow stays inside it and the document size never changes.
   - On the switch:
     n.mode='pinch'; n.m0=m; n.d0=d; n.s=1; setG('pinching');
     const vh=innerHeight;
     n.secs = R.pages.filter(p=>{const r=p.el.getBoundingClientRect(); return r.bottom>-3*vh && r.top<4*vh;}).map(p=>{const r=p.el.getBoundingClientRect(); p.el.style.transformOrigin=(m[0]-r.left)+'px '+(m[1]-r.top)+'px'; p.el.style.willChange='transform'; return p.el;});
     R.freeze && R.freeze(true);
     n.d0=d (not d/s) removes the 6% pop. The band from -3vh to 4vh covers the area revealed down to the 0.4× minimum.
   - On every move:
     n.s = C.clamp(d/n.d0, R.minZoom/n.z0, R.maxZoom/n.z0); n.last=m;
     const t='translate('+(m[0]-n.m0[0])+'px,'+(m[1]-n.m0[1])+'px) scale('+n.s+')';
     for (const el of n.secs) el.style.transform=t;
     Optional: R.preview && R.preview(n.z0*n.s), which updates the label live.
     Because each section's origin is the midpoint in its own coordinates, this is the same as one scale about the fingers.
   - Also change line 854 to clamp with R.minZoom/R.maxZoom (0.4 and 8).

2. studio-ink.js, navUp (lines 863-873), when n.mode==='pinch':
   - for (const el of n.secs) { el.style.transform=''; el.style.transformOrigin=''; el.style.willChange=''; }
   - R.freeze && R.freeze(false);
   - R.zoomAt(n.z0*n.s, n.m0[0], n.m0[1], n.last[0], n.last[1]) — the new target arguments, see step 3. This replaces the separate scrollByXY(m0-last) call.
   - Keep emit('nav-end').
   - Also clear n.secs on pointercancel; it already goes through onUp → navUp.

3. studio-reader.js:
   - Add R.minZoom=0.4 and R.maxZoom=8, and make clampZ (line 20) use them.
   - zoomAt(z, cx, cy, tx=cx, ty=cy), lines 143-152: keep the anchor computation (page p under cy, fractions fx/fy). After layout, scroll the window by r2.top+fy*r2.height-ty and R.root.scrollBy by r2.left+fx*r2.width-tx.
   - Then measure the leftover offset:
     r3=p.el.getBoundingClientRect(); ex=tx-(r3.left+fx*r3.width); ey=ty-(r3.top+fy*r3.height);
     If Math.hypot(ex,ey)>1 and motion is not reduced (matchMedia('(prefers-reduced-motion: reduce)') or html/body .reduced-motion), call settleAnim(ex,ey).
   - settleAnim, applied to the sections visible in the viewport:
     el.style.transition='none'; el.style.transform=`translate(${ex}px,${ey}px)`; force a reflow; on the next requestAnimationFrame set el.style.transition='transform 180ms cubic-bezier(.2,.8,.2,1)'; el.style.transform='';
     On transitionend, or a 250 ms timeout, clear the transition.
     Keep R.frozen=true while it runs. Expose R.cancelSettle(), and call it at the start of onDown in studio-ink.js (line 530) so drawing never starts on a moving page.
   - Delay the zoom timer at line 150 until the settle ends (about 200 ms) so hd() measures untransformed rectangles.

4. studio-reader.js, R.freeze(on) and R.frozen:
   - IntersectionObserver callback (line 217): if (!R.frozen) settle(); while frozen, only record p.near.
   - relayout (line 156): if (R.frozen) { R.relayoutPending=true; return; }
   - freeze(false) runs settle() and, if pending, relayout().
   - hd() returns early while frozen.

5. pdf-notes.html line 1, viewport meta: append ",shrink-to-fit=no". This is a second line of defence against Safari re-fitting the page scale if anything ever overflows horizontally. Bump the ?v= of studio-ink.js and studio-reader.js and V in sw.js, following the CLAUDE.md convention (for example ?v=zoom65).

6. studio-reader.js, double-buffered draw() (lines 51-69):
   - Render into const off=document.createElement('canvas'); off.width=W; off.height=H; — this applies to the template, the raster image and pdf.js alike (pdf.js renders with canvasContext: off.getContext('2d')).
   - Once finished, and only if token===p.token: resize p.pdf if needed, call p.pdf.getContext('2d').drawImage(off,0,0), then off.width=off.height=0.
   - Only then set p.rendered=true and p.rw=W, emit 'rendered', and call textLayer(p, token) as before.
   - The old stretched bitmap stays visible until the swap, so there is no blank or partial frame. The transient extra memory is at most W×H (≤4M px) per running draw (R.running≤2).

7. studio-reader.js, keep the old sharp layer through a zoom:
   - In hd() (line 96), place the canvas in % of the section rather than px:
     const SW=p.el.clientWidth, SH=p.el.clientHeight; c.style.left=((p.pdf.offsetLeft+x0)/SW*100)+'%'; c.style.top=((p.pdf.offsetTop+y0)/SH*100)+'%'; c.style.width=(w/SW*100)+'%'; c.style.height=(h/SH*100)+'%';
     It then scales with layout().
   - Add cancelHd(p), which cancels p.hdTask and bumps p.hdTok but keeps p.hd. Use it instead of R.pages.forEach(dropHd) in setZoom (line 137), zoomAt (line 147) and relayout (line 156). release(p) still uses dropHd.
   - hd() already swaps the new canvas in atomically (lines 97-98).
   - De-duplicate: store p.hdKey=[R.zoom.toFixed(4),Math.round(L),Math.round(T),Math.round(Rr),Math.round(B)].join() and return early when p.hd exists with the same key. The hdSoon() at the end of draw() (line 68) then no longer re-renders an identical layer.

8. studio-ink.js, no ink blink:
   - In sizePage (lines 390-400): when the ink size changes and pg.hd exists, drop it there (pg.hd.canvas.width=0; pg.hd.canvas.remove(); pg.hd=null), because its CSS-px geometry is stale. The reader's hdSoon recreates it.
   - In the ResizeObserver callback (line 498):
     const w=pg.ink.width,h=pg.ink.height; sizePage(pg); if (pg.on && (pg.ink.width!==w || pg.ink.height!==h)) renderInk(pg); paint(pg);
     This redraws committed ink in the same frame as the clear. ResizeObserver runs after layout and before paint.

9. Optional, studio-shell.js:75: also listen to a new reader event 'zoompreview' that R.preview emits, so the "97%" label follows the pinch live. Do NOT emit 'zoom' during the preview; that would change its meaning.

10. Note for whoever runs tests later (Mohammed asked for no tests now): tests/studio_ink_engine_browser.py lines 91 and 94 assert the transform on reader.root. They need to check the sections' transform instead, and that document.documentElement.scrollWidth===clientWidth during the preview.

### مخاطر

- Sections get transforms for the length of the gesture.
  - IntersectionObserver uses transformed boxes. This is why the freeze in step 4 matters: without it, pages can be released or rendered mid-gesture.
  - Anything that reads getBoundingClientRect during the gesture (hover cursor, selection bar, the study-mask layers in sections) sees transformed rectangles. That is correct visually, but code must not store geometry then.
- The preview is now clipped at main#pages's padding box instead of spilling over the document.
  - Left and right: clipped to the column, which is correct when panels are open.
  - Bottom: when zooming in on the lower part of the LAST page, scaled content is cut about 12 px below that page's original bottom until release. If that is noticeable, add a temporary large padding-bottom to main#pages while pinching; it only adds space at the end, so nothing moves.
- Overflow inside main#pages during the preview makes it temporarily scrollable internally (vertically too). Nothing scrolls it during a pinch, but scrollIntoView or focus calls in that window could.
- Settle animation:
  - Drawing, hd() and posOf must not run while it is active (cancel it on pointerdown).
  - The zoom timer must wait for it.
  - It must be skipped under reduced motion.
- Double-buffering adds up to 4M px (about 16 MB) per concurrent draw. Keeping the stale sharp layer through a zoom keeps at most about 4.2M px until the new one replaces it. Both should be within the iPad budget (≤4M px per canvas, MAXKEEP 4), but this has not been verified on a real iPad.
- If the sharp layer is placed in %, the ink "hole" in renderInk (studio-ink.js:414-416) must keep using the ink-hd geometry. Ink-hd is still dropped and recreated on resize (step 8), so the hole stays consistent. Do not convert ink-hd to % without converting the hole maths too.
- Changing the pinch clamp to 8× lets the preview reach 800%. The canvas budget caps the base canvas, and the sharp layer covers only the visible part, so memory stays bounded.
- The CLAUDE.md conventions apply: bump ?v= and V in sw.js, and add a short Step note in CLAUDE.md.

### غير مؤكد

- I have not confirmed WebKit's exact internal mechanism on a device. The behaviour matches "desktop-class Safari re-fits page scale to view width ÷ document width" closely (scale 0.68 measured against 0.66 predicted at s≈2, and 0.37 against 0.39 at the 4.12 clamp). The root cause, that the transform on main#pages widens the document, is confirmed by measurement in Chromium. I have not verified on iPad that shrink-to-fit=no alone stops Safari re-fitting; treat it as a second line of defence, not the fix.
- We do not know whether Mohammed's iPad uses "Request Desktop Website" (the iPad default). The per-section fix works either way.
- The fall of s from about 4.1 to the committed 2.44 between 2.3 s and 3.07 s may be partly the user moving their fingers back after seeing the wrong result. Either way the feedback loop makes the gesture unpredictable.
- The page in the video is a raster slide, so the secondary issues c–f (blurry then sharp, partial or blank render, ink blink, sharp layer rendered twice) come from reading the code and are not visible in this recording. They will show on text or vector PDFs such as Guyton chapters.
- There is no Notewise zoom footage for this request, so the reference behaviour (180 ms eased settle, live % label) is a sensible native-style spec, not something copied from a video. Keep the live label optional.

الملفات: /home/user/international-students-materials/site/js/studio-ink.js, /home/user/international-students-materials/site/js/studio-reader.js, /home/user/international-students-materials/site/pdf-notes.html, /home/user/international-students-materials/site/css/studio.css, /home/user/international-students-materials/site/js/studio-shell.js, /home/user/international-students-materials/site/sw.js, /home/user/international-students-materials/tests/studio_ink_engine_browser.py, /home/user/international-students-materials/CLAUDE.md

## R2/R8 — تحديد النص

### ما يظهر

I pulled frames at 6 fps (scratchpad/req/v2-hi, v2ref-hi), plus 30 fps crops around the key moments (v2ref-30a..d) and full-resolution stills (v2ref-full-*.png). Videos are 3048x2032. That is the iPad's 1180x820 pt viewport: about 2.58 video px per pt horizontally and 2.48 vertically. A frame at 1200 px wide is about 1 pt per px.

=== v2: OUR SITE, THE PROBLEM (10.3 s, page "Vitamins" 1/8, zoom 122%, light compact UI) ===
- The PEN tool is active the whole time (pen button highlighted, quick bar with widths and colours under the toolbar). Mohammed never switches to our «تحديد نص» (I) tool. He starts selection with a finger long-press, which is the Step 64 long-press feature in pen mode.
- 0.0-0.5 s: the page scrolls up a little.
- ~2.17 s: a long-press near "Pa|rvin" on the line "Dr. Parvin Sajadi".
  - Our WHITE bar appears above, centred on the point. It is the SHORT 7-button version: تظليل (yellow-tinted marker), تسطير U, شطب S, بطاقة, سؤال ?, قناع, إلغاء X. There is no نسخ/ترجمة/بحث/مشاركة.
  - The selection is a native iOS blue slice about 15 px wide and 75 px tall. It covers part of "Pa|rvin" and runs down into "Asso|ciate" on the next line. It is a single whitespace or one-character selection drawn as a tall bar.
  - No selection handles are visible.
- 3.67 s: the selection suddenly becomes "Associate Professo". This is the native WebKit drag-extend.
  - It is drawn as an oversized blue block: about 222x75 pt, y 385-460, while the glyphs sit at y 395-420. So it reaches about 40 pt below the baseline.
  - At the same moment Chrome-iOS "Touch to Search" slides up from the bottom: a black sheet saying "Associate" and «انقر للاطلاع على نتائج البحث», with the Google G.
- 3.83 s: our bar rebuilds as the FULL 12-button bar: نسخ، تظليل، تسطير، شطب، ترجمة، بحث (globe)، مشاركة | شرح (bulb)، بطاقة، سؤال، قناع، إلغاء. It re-centres on the new bounding box, so it jumps to the left edge (x≈10) and covers "Dr. Parvin Sajadi".
- 4.33 s: the selection, our bar and the Google sheet all vanish. iOS cleared its selection on the next touch.
- 5.33 s: a second long-press between "Professor" and "of". Again a tall one-character slice and the short 7-button bar, this time centred at x≈375.
- 6.5 s: the selection is extended natively to "of Nutrition & Me" (oversized block again). The Google sheet comes back with a stale word ("Professor"). Our bar becomes the full bar again and jumps to x≈105.
- 7.33 s: the iOS/Chrome NATIVE edit menu (black pill: Copy | Select all | بحث الويب | مشاركة | القراءة بصوت عالٍ | ⋮) appears exactly where our bar was. Our bar is gone or covered. There are now two competing menus.
- 8.17 s: the selection disappears and the native menu fades.
- 9.33-10.17 s: the native menu (Copy / Select all / …) appears AGAIN with no selection visible, and stays until the end.
- Net effect for Mohammed:
  - The selection starts on a blank or wrong character.
  - There are no handles to adjust it.
  - The blue boxes are huge and misaligned.
  - Our bar keeps changing size and position.
  - The iOS menu and the Google panel pop over everything and linger.

=== v2ref: NOTEWISE, THE REFERENCE (13.6 s, Guyton ch. 26, zoomed in, dark top toolbar) ===
- The dedicated text-selection tool (the "T in a box" icon) is active; it is shown highlighted blue in the toolbar.
- 0-1.0 s: nothing selected.
- 1.15 s (one tap on "Most"): the word "Most" is selected INSTANTLY. It is shown as:
  - a light-blue fill over the word, exactly from ascender top to descender bottom;
  - a thin blue start stem at the left edge with a hollow ring knob ABOVE the line;
  - a blue end stem at the right edge with a hollow ring knob BELOW the line.
- 1.22 s (about 70 ms later): the action bar fades and scales in over about 100 ms, above the line. It is a dark pill with 7 grey icons in this order (LTR): Copy, Highlighter, Underline, Strikethrough, Translate (文A), Web search (globe with cursor), Share (three nodes).
  - Its left edge is about 5 pt right of the selection start.
  - Its bottom is about 17 pt above the line top, so it clears the start knob. Here it even covers part of the heading "KIDNEYS"; it is not moved away from content.
- 1.3-5.3 s: the END knob is dragged.
  - While dragging, that knob turns SOLID blue.
  - The end follows the finger by CHARACTER ("Most pe|ople", "familiar w|ith"), not by word.
  - Moving onto the next line selects the rest of line 1 plus the start of line 2. Each line is its own rectangle with a small gap between lines.
  - Dragging back up shrinks the selection again. It finishes as the whole first line "Most people … function".
  - The bar stays visible and does NOT move during the drag (it stays anchored at the start).
  - There is no magnifier or loupe at any time.
- 7.28 s: a tap elsewhere. Selection fill and handles vanish instantly. The bar lingers about 70 ms, then fades (scale about 0.97) over about 100 ms. That tap ONLY dismissed; it selected nothing.
- 8.23 s: a new tap on "rid" selects that word with handles. The bar appears at 8.30 s, with its left edge at "rid".
- 9.5-11.7 s: the end knob is dragged character by character through "rid the body of waste m|aterials", briefly into the next line ("metab|olism"), then back. It ends at "rid the body of waste materials that".
- 11.73 s: the Highlighter icon is tapped.
  - The highlight appears instantly as a peach rounded band: #FEE4D6 on white, the same colour as the user's earlier freehand highlight on "various hormones".
  - The selection and handles disappear in the same frame. The bar fades out in about 100 ms.
  - The text stays dark and crisp on top of the band (multiply-like).
- 12-13.6 s: the highlight remains. No colour picker or confirmation was ever shown.

### الهدف

Make text selection in the MEDIXA PDF reader (pdf-notes.html) work like Notewise on Mohammed's iPad:
- A tap on a word selects it. With the Pencil or mouse, press and drag selects a range. A finger long-press selects a word, and keeps dragging to extend.
- The selection has our own blue fill drawn tight to the text lines, plus iOS-style lollipop handles that extend it character by character across lines.
- One dark, compact, stable action bar is anchored above the selection start: نسخ · تظليل · تسطير · شطب · ترجمة · بحث · مشاركة.
- Highlighting applies instantly with the current highlighter colour and opacity, as a rounded band.
- No native iOS selection, no iOS edit menu, no Chrome Touch-to-Search, no jumping or duplicate bars.
- Saved data stays in the same storage (medixa.pdf.annotations.v1 'texthl' items with rects, quote and mark), so undo, sync and export keep working.

### تفاصيل المرجع

All measurements are in CSS px on an iPad 1180x820 viewport (1 CSS px = 1 pt).

SELECTION LOOK
- Fill: rgba(10,132,255,0.20). Sampled #D0EAFD over white. It is painted OVER the text, so the glyphs look navy (sampled glyph inside the selection: rgb(102,130,151)).
- One rectangle per text line. Vertical extent is ascender top to descender bottom of that line: 31 px tall for this ~25 px body text, i.e. about 1.2 em. The rects do not touch; there is a small gap between lines.
- First line: from the start character to the line end. Middle lines: the full line extent of that line, not the column. Last line: line start to the end character.
- Square corners, no border.
- Handle colour: #0A95FF (sampled rgb(12,150,252) / (0,149,255)).
- Start handle:
  - Stem: 1.5 px wide, from line top to line bottom, at the left edge of the first character.
  - Knob: a ring 9-10 px in diameter, 1.25 px stroke #0A95FF, fill #FFFFFF. Centred on the stem. Its bottom sits 3-4 px above the line top (knob centre ≈ lineTop − 8 px), joined to the line by the stem.
- End handle: the same, mirrored. The stem is at the right edge of the last character on the last line, and the knob hangs BELOW the line (centre ≈ lineBottom + 8 px).
- While a knob is being dragged it is filled solid #0A95FF. It becomes hollow again on release.
- No magnifier or loupe. No native iOS handles.

GESTURES
- Text tool (ours: «تحديد نص», the I icon):
  - A tap on a glyph selects the whole word under it (letters, digits, ' ’ -). The word is selected on release, with no delay.
  - A press and drag starting on text selects character by character in reading order.
- Handles: drag either knob or stem.
  - Hit area: 44x44 around the knob, plus the stem.
  - Granularity: character. Selection follows reading order across lines (and columns, in content order).
  - Never empty: at least one character stays selected. If the dragged end crosses the other, they swap (iOS behaviour).
  - The bar does NOT move or hide during the drag.
- A tap outside the selection or bar dismisses the selection and does NOT start a new one. A second tap selects again, as in the video at 7.28 s and 8.23 s.
- An action (highlight, underline, strike, copy, share) clears the selection immediately.

ACTION BAR (Notewise)
- Container:
  - position: fixed; direction: ltr.
  - height 40 px, width about 224 px for 7 buttons (7 × 31 px + 3 px inline padding + 1 px border on each side).
  - border-radius 20 px (full pill).
  - background #19181B (sampled rgb(25,24,27)); border 1 px solid #48474A (sampled rgb(73,72,75)).
  - Soft shadow: about 0 4px 14px rgba(0,0,0,.2).
- Buttons:
  - 31 px pitch, full bar height, icon only, no labels, no separators.
  - Icons: 20 px box, about 18 px visible, outline style like Material Symbols Rounded. Stroke about 1.6-1.75 px, colour #C5C4C8 (sampled rgb(196,195,198)).
  - The highlighter icon is grey, not tinted.
  - Pressed: icon #FFFFFF on a rgba(255,255,255,.12) round background.
- Order, left to right:
  1. Copy (content_copy: rounded square at top-right with an L-shaped back square at bottom-left).
  2. Highlighter (ink_highlighter: chisel marker at 45°, tip down-left).
  3. Underline (U over a bar).
  4. Strikethrough (S with a horizontal bar).
  5. Translate (文A).
  6. Web search (globe with a small arrow cursor at bottom-right, like captive_portal).
  7. Share (three connected nodes, "<" shape).
- Arabic aria-labels and titles: نسخ، تظليل، تسطير، شطب، ترجمة، بحث، مشاركة.
- Position:
  - left = x of the selection start + 5 px, clamped to [8, innerWidth − width − 8].
  - top = firstLineTop − 17 − 40, so the bar's bottom is 17 px above the first line and clears the start knob.
  - If that is under the header or toolbar (limits().top), use top = lastLineBottom + 17 (below the end knob), clamped above the bottom limit.
  - The bar stays anchored to the start while a handle is dragged. It follows the page when scrolling.
- Show: about 60-70 ms after the selection appears. opacity 0→1 and transform scale(.96)→1 over about 100 ms ease-out, transform-origin left bottom.
- Hide: about 100 ms fade or scale-out. The selection overlay disappears instantly.

ACTIONS
- Highlight (the only action shown in the video):
  - Applies instantly. Colour = current highlighter colour; opacity = current highlighter opacity.
  - Multiply blend in light mode, so text stays dark.
  - No colour chooser.
  - Clears the selection, fades the bar.
- Underline and strikethrough: same flow, one tap (not shown in the video; keep our 'mark' rendering).
- Copy: clipboard, then toast «نُسخ النص».
- Translate: our translate panel.
- Globe: web search (our search menu).
- Share: navigator.share, or copy as the fallback.

SAVED HIGHLIGHT LOOK
- One band per line, with the SAME vertical extent as the selection rectangle (measured: both span y 977-1054 at full resolution, i.e. no vertical padding).
- Rounded corners, radius ≈ 0.35 × band height (about 11 px for a 31 px band).
- Horizontally a little wider than the glyph run: about 4 px past the last glyph on the right. On the left it reached back to the end of the previous word, about 12 px.
- Colour sampled #FEE4D6 on white, the user's peach highlighter colour.

PHONE (≤720 px) AND iPAD PORTRAIT
- Same handles and same 224 px bar (it fits 390 px). Same anchoring, clamped between the header/page bar and the bottom drawing bar (limits()).
- Finger long-press is the main way to start on the phone.

### السبب

The selection is built on the browser's NATIVE selection of an invisible pdf.js text layer. On iPad (Safari, or Chrome on iOS which is WebKit with Google contextual search, as the "Touch to Search" sheet in v2 shows), iOS takes over the selection.

1. The long-press turns on native selection. site/js/studio-smart.js:181-195:
   - After 480 ms it builds a DOM Range and calls getSelection().addRange(r) (line 191).
   - It adds body.st-selecting (line 190). That activates site/css/studio.css:280-282: `.st-text{pointer-events:auto;user-select:text}` and `canvas.ink{pointer-events:none}`, plus studio.css:142 `touch-action:pan-x pan-y`.
   - From then on every touch goes to WebKit's text layer. iOS/UIKit draws its own selection, runs its own drag-extend, shows its edit menu (Copy | Select all | بحث الويب | مشاركة | القراءة بصوت عالٍ) and Chrome's Touch-to-Search. The edit menu can come back later with a collapsed selection (v2 9.33 s onward).
   - site/js/studio-ink.js:533 returns early for every pointerdown while body.st-selecting is on, so the pen cannot draw while a selection exists.
2. The native highlight is drawn by UIKit from WebKit selection geometry. iOS ignores CSS ::selection, so studio.css:279 has no effect. The geometry of the absolutely positioned, transparent, scaleX-transformed pdf.js spans (studio.css:273,278) gives boxes about 2.5× the glyph height, extended above or below the line (v2 3.67 s: y 385-460 for glyphs at 395-420). No selection handles are shown for a programmatic selection.
3. Wrong start character. wordRange() (studio-smart.js:172-180):
   - It picks the character nearest to x inside ONE span's text node. If that character is not a word character it selects that single character (line 177).
   - pdf.js places characters with a fallback font scaled to the item width, so inside a span the character x positions drift from the visible glyphs. A press on "Pa|rvin" can land on the space of "Dr. Parvin".
   - selectionAnchor() (studio-smart.js:83-95) then trims the text to '' (line 93). show() drops نسخ/ترجمة/بحث/مشاركة/شرح because a.quote is empty (lines 112 and 120). That is the short 7-button bar at 2.17 s and 5.33 s. Its highlight, underline and strike buttons would save a texthl over a space.
4. The bar jumps:
   - The selectionchange listener (studio-smart.js:200) calls show() on every native change. show() rebuilds the buttons (108-131) and re-centres the bar on the new bounding box: x = centre − w/2 (line 134). So width and position change during extension (v2 3.83 s, 6.5 s).
   - The pointerdown dismiss logic (203-209) deliberately ignores touches on .st-text and canvas.ink, so the iOS menu and our bar fight. The iOS menu can sit exactly where our bar is (v2 7.33 s).
5. Saved highlights (texthl) differ from Notewise:
   - Rects come from native Range.getClientRects (selectionAnchor line 89), whose heights depend on WebKit.
   - They are painted as sharp, unpadded rectangles: studio-ink.js:247-249 in drawStroke has no multiply; studio-ink.js:324 in drawHighlights. The PDF export does the same at studio-ink.js:956-958.
   - highlight() (studio-smart.js:543-548) never stores the highlighter's opacity (st.op), so the band always uses the default 0.35, not the user's highlighter style.
6. In the select tool, a tap selects the whole pdf.js span or line, not a word (studio-smart.js:212-221, selectNodeContents at line 219). There is no character-level adjustment except through iOS's own gestures.
7. The text layer keeps no geometry. studio-reader.js:105-115 renders it from streamTextContent() and discards the items and textDivs, so nothing tight (PDF font ascent/descent, baseline) is available.

Fix in one sentence: stop using native selection altogether (.st-text stays pointer-events:none and user-select:none), and build our own selection model from pdf.js textContent geometry, our own overlay and handles, and one stable bar.

### خطة التنفيذ

1. Keep text geometry (site/js/studio-reader.js textLayer(), lines 105-115).
   - Replace streamTextContent() with `const tc = await p.proxy.getTextContent()` (default includeMarkedContent:false, so pdf.js textDivs[i] ↔ tc.items[i]).
   - Pass `textContentSource: tc`, plus a `textDivs: divs` array you keep.
   - Store `p.tc = tc; p.divs = divs; p.vp1 = p.proxy.getViewport({scale:1})`.
   - Leave .st-text in place, but it stays pointer-events:none and user-select:none for good (it is still used by screen readers and search).

2. New module site/js/studio-textsel.js, loaded in pdf-notes.html right BEFORE studio-smart.js with the same `defer`. It exposes `M.textsel`.

   a) Glyph model per page, built lazily and cached by page id (normalised coordinates never change with zoom, and survive release()):
      - For each tc item with str, |angle| < 0.05 rad after the viewport transform (other items are not selectable):
        - `tx = pdfjsLib.Util.transform(vp1.transform, it.transform)`; `fh = Math.hypot(tx[2], tx[3])`; `base = tx[5]`.
        - `st = tc.styles[it.fontName]`.
        - asc = st.ascent if 0.5 < st.ascent < 1.3; else 1 + st.descent if descent is valid; else 0.85.
        - desc = st.descent if −0.6 < st.descent < 0; else −0.22.
        - `top = (base − asc·fh)/vp1.height`; `bottom = (base − desc·fh)/vp1.height`.
      - Per-character x, identical to pdf.js's own scaleX:
        - Canvas `ctx.font = (fh·4)+'px '+st.fontFamily`.
        - `u(k) = (tx[4] + measure(str.slice(0,k)) / measure(str) · it.width) / vp1.width`.
        - Use it.width, which is already in scale-1 viewport units.
      - Group items into lines: same line if |baseline difference| < 0.35·fh, the previous item had no hasEOL, and x does not jump backwards by more than 2 em.
      - Line box = min top / max bottom of its items.
      - Arrays: chars[], cu0[], cu1[], lineOf[], lines[{v0, v1, first, last}], plus the text string (lines joined with '\n').
   b) `hit(pageId, u, v, loose)` returns a caret index 0..N.
      - Pick the line whose [v0 − 15%, v1 + 15%] contains v. If two columns qualify, take the one nearest horizontally.
      - Otherwise (loose, during drags) the nearest line by distance.
      - Inside the line: the boundary nearest to u.
      - `wordAt(pageId, caret)` gives [a, b) over /[\p{L}\p{N}'’\-]/u within one line, or null if the point is on whitespace.
   c) State `{pageId, a, b}` (a < b, never empty).
      - API: set(pageId, a, b), clear(), get() → `{pageId, rects (per line: [u0, v0, u1, v1]), text, quote: text.slice(0,600), kind:'text', firstLine, lastLine}`.
      - Events: on('change'|'clear'|'drag-start'|'drag-end').
   d) Overlay rendering:
      - One `div.st-tsel` inside p.el, absolutely positioned on the page area: `left:var(--pa-l); top:var(--pa-t); width:var(--pa-w); height:var(--pa-h); z-index:4; pointer-events:none`.
      - Children: `.st-tsel-r` per line, with left/top/width/height in %, background rgba(10,132,255,.2).
      - Two handles `.st-tsel-h.st-s` and `.st-tsel-h.st-e`:
        - 44 px wide hit box, positioned in % at the start or end x, spanning the line height plus the knob.
        - pointer-events:auto; touch-action:none; -webkit-touch-callout:none; user-select:none.
        - Child `i` = stem (1.5 px #0A95FF). Child `b` = knob (9-10 px ring, 1.25 px #0A95FF, white fill; `.is-drag b{background:#0A95FF}`).
        - Start knob above the line top (centre −8 px). End knob below the line bottom (centre +8 px).
      - Percentages mean zoom and scroll need no extra work.
   e) Gestures. Use capture-phase document listeners, and register the select tool in the ink engine:
      - `M.registerTool('select', {down, move, up})` for Pencil and mouse:
        - down on text: if a selection exists, remember hadSel; anchor caret = hit().
        - move beyond 6 px: set(anchor, hit(loose)) live, with the bar hidden while this first drag runs.
        - up without movement: if hadSel, clear() (dismiss only); else select the word.
        - up after a drag: show the bar.
        - down off text: clear() and return false.
      - Fingers in the select tool PAN (see step 4). A finger tap (<8 px, <350 ms) on text selects the word; on non-text, or while a selection exists, it only dismisses.
      - A finger long-press of 480 ms on text, in tools select or hand, or in any tool when M.penMode() is true:
        - Keep the existing synthetic pointercancel trick (studio-smart.js:189) to stop the pan.
        - Select the word; further moves of that same finger extend by character until up; then show the bar.
      - Handle drag:
        - pointerdown on .st-tsel-h: preventDefault, stopPropagation, setPointerCapture; add .is-drag.
        - dy = pointer y − the handle line's middle.
        - move: caret = hit(u(x), v(y − dy), loose); update a or b, swapping if they cross; keep at least 1 character; re-render; do NOT move the bar.
        - up: remove .is-drag; reposition the bar only if the first line or start changed.
      - Escape and a tool change to anything other than select or hand call clear().

3. studio-smart.js changes:
   - Delete the native paths:
     - the long-press block 161-198 (move it into textsel);
     - the selectionchange listener at 200;
     - the whole-line tap at 212-221 (keep its first part: in select or hand tool, a tap with no selection on a saved texthl → hlOpen(h), checked BEFORE word selection);
     - `body.classList.toggle('st-selecting', …)` at line 61;
     - every getSelection().removeAllRanges() (130, 547, 552, 600) → M.textsel.clear().
   - selectionAnchor() (83-95) returns M.textsel.get() plus bbox = the client rect of the first line. Keep the function name; M.smart exports it.
   - Subscribe: M.textsel.on('change') → show(a) only when not dragging; on('clear') → hide().
   - show(a):
     - kind 'text' builds exactly 7 buttons, always: copy, hl, ul, st, tr, find (globe), share. Remove sep and X.
     - Study tools (شرح, بطاقة مراجعة, سؤال اختيار من متعدد, قناع دراسة) go behind ONE 8th button «المزيد» (⋯), which opens a small dark menu above or below the bar (see uncertainties).
     - kind 'region' keeps بطاقة/سؤال/قناع in the same dark pill.
   - Positioning (replace lines 132-137) as in reference_details: left = start x + 5; top = firstLineTop − 57; else below lastLineBottom + 17; clamped with limits().
   - Re-place on scroll (rAF, capture) and on M.reader.on('zoom'). Hide (opacity 0) if the first line is off-screen.
   - Animation: set hidden=false, then after 60 ms add `.is-in`. hide(): remove .is-in, then set hidden after 110 ms. Immediate for actions.
   - New icons:
     - copy (content_copy style);
     - hl as an ink_highlighter outline;
     - web as a globe with cursor: e.g. `<path d="M20.9 13A9 9 0 1 0 13 20.9"/><path d="M3.6 9h16.8M3.6 15H11M12 3a14 14 0 0 1 3.3 8M12 3a14 14 0 0 0 0 18"/><path d="m15 15 6.2 2.3-2.7 1-1.1 2.7z"/>`;
     - share as three nodes: `<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.4M8.3 13.3l7.4 4.4"/>`;
     - keep ul, st, tr.
   - Drop the colour tint on the hl icon (Notewise is grey).
   - highlight(a, color, mark):
     - Rects from the model; add `op` from M.style('highlight').op when there is no mark.
     - commit, then M.textsel.clear(), then hide() (fade).
   - Copy and share: after the action, clear() and hide().
   - Translate and search panels: keep the selection visible while the panel is open.
   - OWN selector (line 201) also includes '.st-tsel-h'.
   - The pointerdown dismiss (203-209) no longer needs the .st-text/canvas.ink exception; textsel decides taps.
   - Update the first-use hint (selectHint, line 65): «اضغط على كلمة لتحديدها، ثم اسحب الدائرتين الزرقاوين لتوسيع التحديد. بالقلم: اضغط واسحب فوق النص. بالإصبع: اضغط مطولاً ثم اسحب.»

4. studio-ink.js:
   - Line 533: remove the `body.st-selecting` early return.
   - Line 521, blocked(): add `.st-tsel-h,#st-seltools`, so handle drags never start ink or pan.
   - Line 565: `if (!pg || penMode() || S.tool === 'hand' || S.tool === 'select') return startPan(e, pg, rec);` so fingers scroll in the select tool.
   - texthl painting (drawStroke 247-249 and drawHighlights 324): build one path of rounded rects per group:
     - lh = (r[3] − r[1])·h; pad = 0.12·lh; rad = 0.35·lh;
     - `ctx.roundRect(r[0]·w − pad, r[1]·h, (r[2] − r[0])·w + 2·pad, lh, rad)`, with an arcTo fallback when roundRect is missing;
     - fill('nonzero') so overlaps never darken.
   - Also apply multiply in drawStroke's texthl branch (same rule as drawHighlights line 319).
   - markLines (306-313) is unchanged.
   - Optional: round the corners in the PDF export (956-958).

5. CSS:
   - studio.css: delete lines 142 and 279-282 (native-selection rules).
   - Add `main#pages,.st-text{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}`, plus `html[data-studio-tool=select] main#pages canvas.ink{cursor:text}`.
   - Add the .st-tsel* rules from step 2d.
   - Delete the legacy navy .st-seltools at studio.css:292, keeping [hidden].
   - studio-textactions.css lines 9-22: replace with the Notewise pill:
     - `.st-seltools{display:flex;align-items:center;gap:0;height:40px;padding:0 3px;border:1px solid #48474a;border-radius:20px;background:#19181b;box-shadow:0 4px 14px #00000033;direction:ltr;opacity:0;transform:scale(.96);transform-origin:0 100%;transition:opacity .1s ease-out,transform .1s ease-out}`
     - `.st-seltools.is-in{opacity:1;transform:none}`
     - `.st-sel-btn{width:31px;min-width:31px;height:40px;border-radius:16px;color:#c5c4c8}`
     - `.st-sel-btn svg{width:20px;height:20px;stroke-width:1.7}`
     - `.st-sel-btn:active{background:#ffffff1f;color:#fff}`
     - a dark «المزيد» menu with the same colours.
     - Same in night mode. prefers-reduced-motion: no transition.

6. studio-tools.js:609 textSel(): also return true when M.textsel.get() exists, and make Cmd/Ctrl+C copy it (keyboard users and desktop).

7. pdf-notes.html:
   - Add `<script defer src="./js/studio-textsel.js?v=sel65">` before studio-smart.js.
   - Bump ?v=sel65 on studio-reader.js, studio-ink.js, studio-smart.js, studio-tools.js, studio.css and studio-textactions.css.
   - sw.js: set V to a new value, e.g. "medixa-studio21-sync63-nw64-sel65".
   - CLAUDE.md: add a Step 65 note («التحديد صار نظاماً خاصاً بلا تحديد المتصفح»).

8. Per form factor:
   - iPad landscape and portrait: as specified; the bar is about 224 px, anchored at the start, clamped under the floating top bars (limits()).
   - Phone (≤720): the same handles and bar. Translate, explain and search panels keep their bottom sheets. Long-press is the main way in.
   - Desktop: mouse behaves like the Pencil (drag selects in the select tool).

### مخاطر

- This replaces native selection, so everything iOS gave for free has to be rebuilt: word boundaries, cross-line order, copy text, keyboard copy, accessibility. Screen readers still read .st-text, but VoiceOver users lose native select-to-copy.
- Character x positions use pdf.js's fallback-font scaling, the same as today's text layer. On bold or condensed PDF fonts the boundaries can be off by 1-3 px. Notewise uses real glyph metrics.
- Rotated text, vertical text and items with |angle| > 0.05 rad are not selectable with this model. Scanned PDFs have no text at all (the existing banner stays).
- Some PDFs have odd font ascent/descent values (clamped in the plan) or a content order that is not reading order. Selections then follow the stream order, as browsers do.
- The ink engine changes (blocked(), the select-tool pan, removing the st-selecting early return) touch input routing for every tool. Recheck palm rejection and two-finger zoom while a selection is shown.
- 31 px buttons copy Notewise but are below the 44 px touch guideline. The 40 px height and the full-width pill help.
- Existing browser tests (tests/studio_textactions_browser.py, studio_translate_browser.py, studio_sharp_select_browser.py, studio_phase4_browser.py) drive native getSelection, #st-sel-x and the whole-line tap. They will fail and need rewriting, even though Mohammed asked for no test runs.
- Older saved texthl rects (from native Range rects) and new ones (tight PDF-metric rects) differ slightly in height. Rounded painting applies to both.
- The pdf-sync merge and export are unaffected (same schema). Only `op` is now set on new texthl items; validStroke accepts op 0.02-1 (studio-core.js:52).

### غير مؤكد

- Notewise shows exactly 7 buttons. Ours also has شرح / بطاقة / سؤال / قناع and an X. I recommend 7 Notewise buttons plus one «المزيد» (⋯) holding the study actions, and dropping X (tap outside dismisses). The alternative is exactly 7 buttons with the study actions moved elsewhere. Needs Mohammed's choice; default to the ⋯ button.
- The video never shows underline, strike, copy, translate, search or share being used. Their colour and behaviour follow our existing code (underline and strike use the pen colour; the globe opens our search menu for in-file or web search). Notewise's globe probably goes straight to a web search.
- The video doesn't show whether Notewise's word selection happens on touch-down or on release, how a finger drag behaves in the text tool, or whether it auto-scrolls near the edges. The plan assumes: tap = word on release, Pencil drag = range, finger drag = scroll, finger long-press then drag = range. Auto-scroll is optional.
- The exact cause of iOS's 2.5× tall native boxes (UIKit selection geometry versus the text-layer spans) can't be reproduced here: only Chromium is installed, no WebKit. It doesn't matter once native selection is removed.
- The selection fill and handle colours are sampled from a compressed recording, so they are ±5% (#D0EAFD fill, #0A95FF handles, #19181B bar).
- Mohammed's browser in v2 looks like Chrome for iOS (Touch-to-Search, the ⋮ in the edit menu), not Safari. The plan avoids both, because neither can show a native selection any more.

الملفات: /home/user/international-students-materials/site/js/studio-smart.js, /home/user/international-students-materials/site/js/studio-ink.js, /home/user/international-students-materials/site/js/studio-reader.js, /home/user/international-students-materials/site/js/studio-tools.js, /home/user/international-students-materials/site/css/studio.css, /home/user/international-students-materials/site/css/studio-textactions.css, /home/user/international-students-materials/site/pdf-notes.html, /home/user/international-students-materials/site/sw.js, /home/user/international-students-materials/site/js/studio-core.js, /home/user/international-students-materials/site/js/studio-toolbar.js, /home/user/international-students-materials/CLAUDE.md, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v2-hi, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v2ref-hi, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/crop11_6.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/crop13.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/bar-zoom.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/knob-zoom.png

## R3/R6 — إعدادات القلم والتظليل

### ما يظهر

1.jpg (OUR reader, iPad landscape, light compact UI). The top pill holds undo/redo, hand, pen (active, teal tint, red dot), highlighter, eraser, lasso, text-select, text, image and more. The quick bar below it holds the type icon, 3 line widths, 5 colours, (+) and a settings icon. Our pen sheet opens under the quick bar. It is 356px wide, white, radius 18, and laid out top to bottom like this: a pen icon with the right-aligned title «إعدادات القلم» and an X on the left; a 70px lined preview box with a red sine wave; «الأنماط المفضلة» as 4 wrapping chips («حبر جاف • 2.5», «قلم حبر • 3», «فرشاة • 4.5», «تقني • 2») plus a dashed chip «+ حفظ الحالي»; «نوع القلم» as 5 cards with a small rendered stroke; «نمط الخط» as a 3-way segment (متصل/متقطع/منقط); «اللون», whose swatch row is cut by the bottom edge of the sheet. The quick sizes, width/opacity/smoothing sliders, the two pressure sliders and the Hold-to-Shape toggle are all below the visible area. A measurement in 1180x820 Chromium shows content scrollHeight of 1073px (pen) and 1009px (highlighter) inside a box capped at max-height 626px, so 380–450px are hidden behind an inner scroll that Mohammed does not see.

2.jpg (Notewise PEN, dark sheet, about 330 CSS px wide and 650 tall, radius about 18, bg #1e1f23):
(1) Centred title «Pen» (16px). Close X at the top end corner: a 26px grey circle (#36373b) with a #9b99a4 glyph.
(2) Preview about 100px tall: a dot grid (dots #3a3a3c, pitch about 40px, 3 rows) with no frame. The sample stroke is a short gesture in the current colour, in the middle third of the width: it rises to a hump, drops sharply and ends with a small hook.
(3) Three equal type cards, each about 95x58 CSS px, radius about 14, gap about 8. Each card has an icon on top and a label below (Natural / Ball / Calligraphy). Selected card: 2px blue border (#4b8df8), fill #1f375b, blue icon and label (#5e9eff). Unselected: 1.5px grey border, light label.
(4) «Thickness» label at start and a value pill «10» at end (pill bg #25282f, about 60x30, radius 15). Next line: «−», then a Material-3 slider, then «+». The slider's active part is a light-blue pill (#5e9eff); then a gap; a 4x22px vertical bar thumb; a gap; the inactive track (#0f4a72, about 8px tall); and a small stop dot at the far end.
(5) A divider.
(6) Rows of about 44px: «Line type» with a pill showing an S-curve icon; «Hold to draw shape ⓘ ⋯» with an outlined switch (off: a grey knob on an outlined dark track, about 50x30); «Scribble to erase ⓘ» with a switch; «Circle to lasso ⓘ» with a switch; «Pressure sensitivity» with a value pill «3»; «Stabilization ⓘ» with a value pill «0».
(7) «Color» row with «+» and «≡» icons at the end.
(8) One row of about 22px colour dots at about 36px pitch: black (thin grey outline), red (selected: slightly larger dot inside a 3–4px grey ring #474955), cyan, green, yellow, orange, purple, and a navy dot half cut. The row scrolls horizontally. A 1px vertical divider follows, then a fixed rainbow wheel swatch.

4.jpg (Notewise HIGHLIGHTER, same dark sheet, about 330x495):
- Centred title «Highlighter» and X.
- Dot-grid preview with the same gesture, drawn in translucent orange.
- «Thickness» with pill «20» and the −/slider/+ row.
- «Opacity» with pill «20%», then a full-width 24px-tall track: a checkerboard fading into the colour (transparent to orange), a 28px white ring thumb whose hollow centre shows the track, and a white stop dot at the end. This slider has no −/+.
- A divider.
- «Line tip appearance» with the current value «Round» as a 2nd line, and a 2-icon segmented pill (flat ⊏, round ⊂). The selected icon is blue inside a darker circle; the container is #25282f, about 74x40.
- «Draw straight line» with the current value «Hold to draw» as a 2nd line, and a 3-icon segmented pill: a pen-with-dot meaning hold (selected), a straight «/», and a freehand «∫».
- «Color» with + and ≡, then the same scrolling swatch row (orange selected with a grey ring) and the rainbow wheel.

3.jpg (Mohammed's toolbar reference): the Notewise toolbar in LIGHT theme. It has white pills, the active tool on a light-blue tile (#c5e0fe) with a dark icon, and the tools we lack painted over in orange. This shows that Notewise has a light theme and that Mohammed chose the light look.

### الهدف

Mohammed wants our pen and highlighter settings sheets to be Notewise sheets: the same order, the same compact one-line rows (label at start, control at end), a dot-grid stroke preview, type cards, a Material slider with −/+ and a value pill, an opacity slider on a checkerboard, icon segmented choices with the current value shown under the label, switches, and one scrolling colour row with a rainbow custom swatch. The whole sheet must be visible on his iPad without being cut or needing a hidden scroll. Every control must drive a real engine setting (M.setStyle / M.setInput); nothing fake or disabled should be shown. The sheets stay in Arabic RTL and in the light theme of the compact reader, with a Notewise-like dark variant only in our night mode.

### تفاصيل المرجع

THEME DECISION: LIGHT, same structure as Notewise. Reasons:
(a) 3.jpg, the reference Mohammed picked, is Notewise in light mode: white pills and a light-blue active tile.
(b) The compact reader (top pill, quick bar, page pill, edge arrows) is all white floating pills (studio-compact.css:2 --reader-surface #fff). A dark sheet would be the only dark island.
(c) 2.jpg and 4.jpg are dark only because that Notewise session used dark chrome; its toolbar is dark too.
(d) The colour preview on white matches the white PDF page, so what you see is what you write.
Night mode (body.medixa-dark) gets Notewise's dark values exactly through tokens.

TOKENS (define on #studio-toolbar in studio-settings.css; keep the old --ts-teal* for the other sheets).
- Light: --ts-bg #fff; --ts-ink #1f2328; --ts-muted #6b7280; --ts-line #eceef1 (dividers); --ts-line2 #dfe3e8 (card borders); --ts-pill #f1f3f5; --ts-acc #2f6fed; --ts-acc-soft #e3edfd; --ts-acc-track #c9dafa; --ts-dot #cfd5dc; --ts-ring #c9ced5; --ts-off-bg #eceef1; --ts-off-b #7a818b.
- Dark: --ts-bg #1e1f23; --ts-ink #e6e6e9; --ts-muted #a1a1aa; --ts-line #34363b; --ts-line2 #44464c; --ts-pill #2a2c31; --ts-acc #5e9eff; --ts-acc-soft #1f375b; --ts-acc-track #0f4a72; --ts-dot #3a3a3c; --ts-ring #474955; --ts-off-bg #2a2c31; --ts-off-b #8e9099.
- The accent is blue to match 3.jpg and Notewise. If Request 4 keeps the teal active tile, change only --ts-acc / --ts-acc-soft / --ts-acc-track to #168c8c / #e3f3f1 / #bfe3e0.

SHEET BOX
- Width 340px on screens wider than 720px (studio-compact.css:109 is now 356).
- Padding 6px 14px 12px; radius 20px; 1px border var(--reader-line) #dcdfe3; shadow 0 12px 34px #18273a26; gap 0.
- Opens with a 160ms ease-out fade from translateY(-6px) scale(.98), transform-origin top centre. On phones it rises from translateY(12px). No animation under reduced motion or .reduced-motion.

ROW-BY-ROW SPEC, PEN (RTL; "start" = right; target total height about 580px)
1. HEAD, 40px. A 3-column grid [40px | 1fr | 40px].
   - Centred visible title «القلم» (600 16px). The dialog aria-label stays «إعدادات القلم». The tool icon is removed.
   - Close button in column 3 (the left edge in RTL), aria «إغلاق», 40x40 hit area: a 30px circle bg var(--ts-pill) with a 16px X in --ts-muted.
2. PREVIEW, 72px, margin 2px 0 6px.
   - Canvas #ts-preview with no border and a transparent background: radial-gradient(circle, var(--ts-dot) 0 1.2px, transparent 1.7px) centre / 28px 24px. In night mode it sits on a white rounded panel (radius 12) so the colours are truthful.
   - The sample is drawn by the real M.drawStroke with the current pen, colour, width, wr, op, dash and smooth. Its path is a Notewise-like gesture through these points (fractions of W, H): (.30,.72) (.37,.56) (.44,.38) (.50,.27) (.535,.30) (.555,.45) (.57,.66) (.59,.78) (.625,.80) (.67,.72) (.70,.66). Use Catmull-Rom with 48 samples. Pressure ramps 0.15→1 over the first 40%, stays at 1 to 75%, then falls 1→0.35.
3. TYPE CARDS, 56px + 10px margin.
   - A 5-column grid with 6px gap; cards keep class .ts-preset and data-pen.
   - Order: حبر جاف (ballpoint), قلم حبر (fountain), فرشاة (brush), رصاص (pencil), تقني (technical).
   - Card: radius 14, border 1.5px var(--ts-line2), bg var(--ts-bg). On top, a 34x16 canvas with a monochrome sample of that pen type (same gesture, width min(w,3)), coloured --ts-ink normally and --ts-acc when selected. Below it, the label in 500 12px.
   - Selected card: 2px var(--ts-acc) border, var(--ts-acc-soft) fill, label in var(--ts-acc). This replaces Notewise's icons: our 5 types differ by stroke character, which a glyph cannot show.
4. THICKNESS, 30px + 40px.
   - Line A: label «السُمك» (500 14px) at start; value pill at end (<output>, min-width 56, height 30, radius 15, bg --ts-pill, 600 14px, tabular, LTR), for example «3» or «2.5».
   - Line B is direction:ltr, as in Notewise and our LTR quick bar where thin→thick runs left→right: «−» button 36x40 (aria «إنقاص السُمك»), the range (min 1, max 20, step .5), «+» 36x40 (aria «زيادة السُمك»). −/+ step by 0.5 and repeat every 120ms while held, after 400ms.
   - Range look: track 8px, radius 4. Thumb hit box 24x28 with only a 4x24 bar visible in --ts-acc. Active part --ts-acc up to (thumb centre − 8px); transparent gap; inactive --ts-acc-track from (centre + 8px); a 2px stop dot at the right end. Thumb centre = calc(12px + (100% - 24px) * var(--f)), where --f = (v−min)/(max−min) is set from JS.
5. DIVIDER: 1px var(--ts-line), margin 6px 0.
6. ROWS (min-height 42px; 48px for rows with a 2nd line). Flex, space-between, gap 10. Label block: title 500 14px var(--ts-ink); optional 2nd line 400 12.5px var(--ts-muted).
   a. «نمط الخط» with 2nd line = the current value «متصل» / «متقطع» / «منقط». Control: an icon segmented pill (container bg --ts-pill, radius 20, padding 3, height 40) of 3 circular 34x34 buttons with data-dash solid/dashed/dotted. Icons: solid M3 12h18; dashed M3 12h4M10 12h4M17 12h4; dotted M4 12h.01M9 12h.01M14 12h.01M19 12h.01 at stroke-width 3. Selected button: white circle (--ts-bg) with shadow 0 1px 3px #0000001f and the icon in --ts-acc. Others: icon in --ts-ink. Notewise's «Line type» slot shows our real line style.
   b. «ثبّت القلم لرسم شكل» plus a ⓘ button (28x28, icon 18px). The switch id ts-shapesnap, role=switch, drives M.input().shapeSnap via M.setInput({shapeSnap}).
   c. «حساسية الضغط». Control: a pill <select id=ts-pressure> with options 0–5, styled as the value pill: appearance:none, centred text with text-align-last:center, height 36, min-width 64. iPad shows its native picker. It maps to wr levels: 0 [1,1]; 1 [.8,1.25]; 2 [.6,1.5]; 3 [.4,1.85]; 4 [.25,2.2] (the default, so it shows «4»); 5 [.1,3]. When pen === 'technical' it is disabled (opacity .45, title «القلم التقني بسُمك ثابت»), because pressure has no effect there (studio-core.js:269).
   d. «ثبات الخط» plus ⓘ. Control: pill <select id=ts-smooth> with options 0–10, mapping smooth = n/10. It shows Math.round(smooth*10), so the default .45 shows «5».
   e. «الشفافية». Control: pill <select id=ts-op> with options 100%, 90% … 20%, mapping op = n/100.
   ⓘ hints are toggled inline under the row, only one open at a time, 12px muted:
   - shape: «ارسم ثم أبقِ القلم ثابتاً لحظة ليتحوّل الرسم إلى خط أو دائرة أو مستطيل مرتّب.»
   - stabilization: «رقم أعلى = خط أنعم وأقل اهتزازاً، مع تأخر بسيط خلف القلم.»
7. DIVIDER.
8. COLOUR HEADER, 28px.
   - Label «اللون» at start. When ≡ is active the label reads «الأنماط المفضلة».
   - At end, two 36x36 icon buttons:
     - «+» (M12 5v14M5 12h14), aria «حفظ القلم الحالي في المفضلة». It saves {pen,color,width,op,dash} to presets and switches the row to favourites so the new chip is seen. It is disabled at 6 presets (title «المفضلة ممتلئة — احذف نمطاً أولاً»).
     - «≡» (M5 7h14M5 11h14M5 15h14M5 19h14), aria «الأنماط المفضلة». It has aria-pressed and toggles the row below between colours and favourites. When active: bg --ts-acc-soft and icon in --ts-acc.
9. COLOUR ROW, 44px. Flex: [scroll area flex:1] [1px x 24px divider var(--ts-line2)] [rainbow 36x44].
   - Scroll area: overflow-x auto, scrollbar hidden, scroll-snap-type x proximity, touch-action pan-x, -webkit-mask-image linear-gradient(to left, #000 calc(100% - 16px), transparent) so the far (left) edge fades and the next colour shows half-cut, as in Notewise.
   - Swatches: 36x44 buttons (.ts-sw) with a 24px dot (inset 0 0 0 1px #0000001f). Selected: a 26px dot with box-shadow 0 0 0 3px var(--ts-bg), 0 0 0 6px var(--ts-ring), a grey ring as in Notewise.
   - Rainbow: the existing .ts-custom (conic wheel 24px) wrapping <input type=color id=ts-color>. It shows the selected ring when the current colour is not in the list.
   - Pen order: dark ink first, as Notewise puts black first: كحلي #18334b, أحمر #e43d56, أزرق #2f6fed, تركوازي #168c8c, أخضر #1f9d6a, أصفر #f2c230, برتقالي #e67e22, بنفسجي #7c4dff, رمادي #5b7382.
   - Favourites view (≡ on): the same row holds chips (height 34, radius 17, border 1px --ts-line2): a 12px colour dot, then «حبر جاف · 2.5», then × (shown when more than 1 chip). The active chip has a --ts-acc border and --ts-acc-soft fill. Tapping a chip applies it.
Total height: 6+40+80+66+70+13+48+42*4+13+28+44+12 ≈ 580px.

HIGHLIGHTER (target about 555px, or 596 with the horizontal-snap row shown)
- Head: «التظليل» (aria «إعدادات التظليل»).
- Preview: the same dot grid. The sample uses tool 'highlight' with the current colour/width/op/tip: the Notewise gesture for the «ثبّت» and «حر» modes, and a straight horizontal stroke from .3W to .7W at .5H for «مستقيم دائماً».
- «السُمك»: pill plus −/slider/+ (range 1–10, step .5).
- «الشفافية»: pill «30%», then a full-width range with no −/+ (10–80%, step 5, id ts-op).
  - Track: 24px tall, radius 12, background radial-gradient(circle at calc(100% - 12px) 50%, #fff 0 2.5px, transparent 3px), linear-gradient(to right, #0000, var(--sw)), repeating-conic-gradient(#dfe3e8 0 25%, #fff 0 50%) 0 0/12px 12px.
  - Thumb: 28x28, transparent, 5px solid #fff ring, shadow 0 1px 4px #0005, margin-top -2px.
  - --sw = the current colour.
- Divider.
- «شكل الطرف» with 2nd line «دائري» / «مسطح». A 2-icon segment with data-tip: flat (M18 6H6v12h12) and round (M18 6h-6a6 6 0 0 0 0 12h6).
- «رسم خط مستقيم» with 2nd line «ثبّت للاستقامة» / «مستقيم دائماً» / «حر». A 3-icon segment with data-hlmode hold / line / free. Icons: hold M4 20 13 11 plus a filled circle cx16 cy8 r3; straight M5 19 19 5; free M5 19c6 0 8-14 14-14.
- «محاذاة أفقية للسطور» switch (id ts-hsnap, the hsnap field). The row is hidden when mode = free.
- «ثبّت لرسم مستطيل أو دائرة» switch (id ts-hl-shapesnap, the shapeSnap field of the highlighter style).
- «دمج خلف النص» switch (id ts-hl-blend: multiply/normal, then M.redraw()).
- Divider; colour header (+ aria «حفظ التظليل الحالي في المفضلة», ≡); colour row with the MARKERS list (8) and the rainbow.

SWITCH LOOK (Notewise outlined)
- 48x28, radius 14.
- Off: 2px border var(--ts-off-b), bg var(--ts-off-bg), a 14px knob in var(--ts-off-b) on the RIGHT (RTL start).
- On: border and bg var(--ts-acc), a 20px white knob on the LEFT.
- Transition 150ms.

PLACEMENT
- Tablets and desktop: under the quick bar (existing top: calc(100% + 62px), studio-compact.css:64), centred on the active tool (place()). max-height is set inline by place() = (visualViewport.height || innerHeight) − sheetTop − 12, minus the dock height + 8 only when #mx-dock horizontally overlaps the sheet; minimum 240.
  - iPad landscape 1180x820: top ≈ 127–166 depending on the safe area, room ≈ 640–680, so the 580/596 sheet shows completely.
  - iPad portrait 820x1180: the toolbar is on the 2nd row, top ≈ 190, ample room.
- Phone (≤720): the existing bottom sheet above the bottom toolbar (studio-compact.css:98, inset 8px, width = 100vw−16, max-height = 100dvh − tb − 110 ≈ 680 on 844). The same rows and 5 type cards (about 66px each) fit; on a 667px-tall phone it scrolls inside.

NOTEWISE → ENGINE MAPPING
- Pen types (Natural/Ball/Calligraphy) → style.pen (5 real types; studio-core.js:17).
- Thickness → style.width.
- Line type → style.dash (solid/dashed/dotted). Notewise's own meaning, freehand/straight, has no pen equivalent: see uncertainties.
- Hold to draw shape → input.shapeSnap (studio-ink.js:699).
- Hold-to-draw-shape «⋯» (shape options) → OMIT, nothing behind it.
- Scribble to erase → OMIT, does not exist.
- Circle to lasso → OMIT, does not exist.
- Pressure sensitivity → style.wr levels (studio-core.js:292-304; wr clamps the pressure width).
- Stabilization → style.smooth (InkFilter strength; studio-ink.js:629).
- (extra, ours) opacity → style.op.
- Color + / ≡ → favourites save / favourites view, using style.presets (studio-ink.js:55-63).
- Rainbow → native colour input.
- Highlighter thickness → width.
- Highlighter opacity → op.
- Line tip → tip.
- Draw straight line hold/straight/free → {straight:true, alwaysStraight:false} / {alwaysStraight:true, straight:true} / {straight:false, alwaysStraight:false} (studio-ink.js:634, 674, 697).
- Extras kept from our engine: hsnap, shapeSnap, blend.

### السبب

Why our current sheet is "long and the colours are cut off" (1.jpg). Measured in 1180x820: pen content 1073px and highlighter content 1009px inside a 626px box with an inner scroll.

1. Too much content, one section per control.
   - The pen branch (site/js/studio-toolbar.js:340-358) builds 8 .ts-sec blocks:
     - favourites, which wrap into 2–3 chip rows plus a «حفظ الحالي» chip (favPresets, lines 294-332);
     - type cards (342-345);
     - the dash segment (346);
     - a colour grid of 9 swatches at 44x44 that wraps to 2 rows (347; css .ts-colors flex-wrap at studio-settings.css:40-41);
     - a quick-sizes row that duplicates the slider (349);
     - 3 sliders (350-352);
     - two separate pressure sliders «الأدنى/الأقصى» plus a 2-line hint (353-357);
     - the toggle (358).
   - Every section adds margin-top 10 + padding-top 10 + a border (studio-settings.css:28) and its own 12px header.
   - The highlighter branch (359-375) builds 6 sections, including two tall 2-line segmented blocks (361-362) and 4 toggles.
   - Colours come late in the order (after favourites, types and dash), so they land exactly at the bottom edge.
2. The box height is computed from the wrong geometry. studio-settings.css:16 sets max-height: calc(100dvh − --st-hdr-h − --st-tb-h − --mx-dock-h − 32px), which is 820−54−54−54−32 = 626:
   - In the compact layout on wide screens the header and the toolbar are on the same row, so subtracting both counts 54px twice.
   - The page/zoom dock sits bottom-left (studio-compact.css:36) and does not overlap the centred sheet, yet its height is subtracted.
   - The real offset of the sheet under the quick bar (top: calc(100% + 62px), studio-compact.css:64) is not considered, nor is the iPad safe-area top.
   - Result: on Mohammed's iPad the sheet starts at about 166 CSS px and is capped around 741, the swatches are half visible, and the rest of the settings are hidden behind a scroll with no visible scrollbar (overflow:auto plus overscroll-behavior:contain).
3. Width 356 (studio-compact.css:109) combined with 44px swatches gives 7 per line, which forces the 2-row wrap.

Fix:
- Rebuild the pen and highlighter branches as dense Notewise rows: no favourites block, no quick sizes, no twin pressure sliders, a single scrolling colour row, and pill selects for pressure, stabilization and opacity. This brings the content to about 580px.
- Compute max-height in place() from the sheet's real top and the actual dock overlap.

### خطة التنفيذ

All engine storage stays as it is: the medixa.studio.styles.v1 fields pen, width, op, smooth, wr, dash, presets, tip, straight, alwaysStraight, hsnap, shapeSnap and blend, plus medixa.studio.input.v1 shapeSnap. No engine or core change is needed.

1. site/js/studio-toolbar.js, constants.
   - Add WR_LEVELS = [[1,1],[.8,1.25],[.6,1.5],[.4,1.85],[.25,2.2],[.1,3]] and wrLevel(wr) = the index of the nearest level by |lo−L0| + |hi−L1|/2.
   - Add SHORT = {pen:'القلم', highlight:'التظليل'} for visible titles; keep TITLES for aria-label.
   - Reorder PEN_COLORS so dark ink comes first (كحلي, أحمر, أزرق, تركوازي, أخضر, أصفر, برتقالي, بنفسجي, رمادي).
   - Add icon path constants for the dash, tip, straight-mode, plus, list and info icons (paths listed in reference_details).
2. studio-toolbar.js, new small builders next to range()/seg(). Each one registers an upd callback so refreshSet() keeps it in sync.
   - vhead(label, id): returns a .ts-vrow with a <label> and an <output class=ts-pill>.
   - slider(id, label, min, max, step, get, set, fmt, {steppers, alpha}):
     - Builds the label/pill line plus a .ts-slrow (direction:ltr) holding the optional − and + buttons (.ts-stp, press-and-hold repeat: 400ms delay, then every 120ms) and the <input type=range class=ts-range>.
     - Sets --f on the input from the value; for alpha it also sets --sw = sty().color.
     - IMPORTANT for iPad: Safari's native range only moves when the thumb itself is dragged. Add a pointerdown handler on the input for non-mouse pointers: preventDefault, setPointerCapture, value from (clientX − left − 12)/(width − 24) snapped to step, then set() on move and up. CSS gives the input touch-action:none so the sheet does not scroll while sliding.
   - crow(label, control, {sub: ()=>text, info: hintText}): returns a .ts-crow. It holds a .ts-clab (.ts-ct title, optional .ts-cs 2nd line updated in upd), an optional ⓘ button (.ts-info, aria «معلومات») that toggles a .ts-ihint paragraph after the row (closing any other open hint), and the control.
   - pillSelect(id, aria, options, get, set): a <select class="ts-pill ts-pillsel"> whose upd sets .value; plus a way to set disabled/title.
   - iconSeg(aria, attr, [[value, iconPath, name]], get, set): a .ts-isg with .ts-isb buttons that carry data-[attr] and aria-pressed. Reuse the attribute names dash / tip / hlmode.
   - sw(id, label, get, set, info): a crow plus <input type=checkbox class=ts-sw2 role=switch id=…>. Keep the ids ts-shapesnap, ts-hsnap, ts-hl-shapesnap and ts-hl-blend.
   - colorArea(list, kind): the header (.ts-chead: the .ts-ct label, plus .ts-cact with the + button and the ≡ button with aria-pressed) and the row (.ts-crow2: .ts-cscroll, .ts-cdiv, .ts-custom with #ts-color).
     - The local state favView=false (not persisted) decides whether .ts-cscroll is filled with the colour swatches (put({color})) or with favourite chips (the existing favPresets logic without its own «حفظ الحالي» chip, as a non-wrapping row).
     - + pushes the current item (same object as favPresets add, lines 321-324), sets favView=true and re-renders the row. It is disabled when presets.length ≥ 6.
     - Re-render the favourite chips only when JSON.stringify(presets) changed, so the horizontal scroll position survives slider drags.
     - Mark .ts-custom aria-pressed when the current colour is not in the list.
3. studio-toolbar.js build(g).
   - Head: the grid head with no icon, the centred visible title SHORT[g] || TITLES[t.id] for every group, and the X in column 3 (aria-label of the dialog unchanged).
   - Replace the g==='pen' branch (lines 340-358) with, in order:
     1. the preview canvas;
     2. the type grid (.ts-presets with .ts-preset[data-pen] cards: a 34x16 canvas plus a span label);
     3. slider('ts-width', 'السُمك', 1, 20, .5, …, steppers);
     4. an hr;
     5. crow('نمط الخط', iconSeg dash, {sub});
     6. sw('ts-shapesnap', 'ثبّت القلم لرسم شكل', ()=>M.input().shapeSnap, v=>M.setInput({shapeSnap:v}), hint);
     7. crow('حساسية الضغط', pillSelect('ts-pressure', 0..5 → put({wr: WR_LEVELS[n].slice()})), disabled when sty().pen==='technical');
     8. crow('ثبات الخط', pillSelect('ts-smooth', 0..10 → put({smooth:n/10})), info);
     9. crow('الشفافية', pillSelect('ts-op', 100..20 → put({op:n/100})));
     10. an hr;
     11. colorArea(PEN_COLORS, 'pen').
   - Replace the g==='highlight' branch (lines 359-375) with:
     1. the preview;
     2. slider('ts-width', 'السُمك', 1, 10, .5, steppers);
     3. slider('ts-op', 'الشفافية', 10, 80, 5, ()=>round(op*100), v=>put({op:v/100}), v=>v+'%', {alpha:true, steppers:false});
     4. an hr;
     5. crow('شكل الطرف', iconSeg tip [flat, round], {sub});
     6. crow('رسم خط مستقيم', iconSeg hlmode [hold, line, free], {sub}), where get = alwaysStraight ? 'line' : straight ? 'hold' : 'free' and set maps to {straight, alwaysStraight} as in the mapping;
     7. sw ts-hsnap, whose row is hidden in upd when the mode is 'free';
     8. sw ts-hl-shapesnap «ثبّت لرسم مستطيل أو دائرة»;
     9. sw ts-hl-blend «دمج خلف النص» (put blend, then M.redraw());
     10. an hr;
     11. colorArea(MARKERS, 'highlight').
   - Leave the eraser, shape, text and lasso branches as they are. They inherit the new head, and optionally the new range look by sharing the .ts-range class.
4. studio-toolbar.js paintPreview() / penItem().
   - Replace the sine path with the Notewise gesture: Catmull-Rom through the 11 control points in reference_details, 48 samples, keeping the pressure ramp and the InkFilter step.
   - Highlighter: the same gesture, or a straight line when alwaysStraight, with no grey text bars.
   - Type cards: draw each chip with color = pressed ? the computed --ts-acc : the computed --ts-ink (read once with getComputedStyle(ts)), width min(s.width, 3), op 1, dash solid, smooth .5.
5. studio-toolbar.js place().
   - After positioning, set ts.style.maxHeight = max(240, (visualViewport?.height || innerHeight) − ts.getBoundingClientRect().top − 12 − (dock overlaps the sheet horizontally ? dock height + 8 : 0)) + 'px'.
   - Also call place() on visualViewport 'resize' and on orientationchange; there is already an addEventListener('resize') at line 209.
   - On phones place() returns early as today and the CSS bottom sheet rule applies.
6. site/css/studio-settings.css.
   - Add the new tokens (light on #studio-toolbar, dark under body.medixa-dark).
   - Remove .st-toolset from the max-height rule at line 16, keeping it for .st-morepop.
   - New rules:
     - .ts-head grid and .ts-title centred, and .ts-x as a 40px hit area around a 30px pill circle;
     - .ts-preview dot background, height 72, no border, and a white panel in dark mode;
     - .ts-presets / .ts-preset card states (replacing lines 34-38);
     - .ts-vrow, .ts-pill, .ts-slrow, .ts-stp, and the .ts-range track and thumb for ::-webkit-slider-runnable-track, ::-webkit-slider-thumb, ::-moz-range-track and ::-moz-range-thumb, with the calc(12px + (100% - 24px) * var(--f)) gap gradient and the stop dot;
     - .ts-sl-alpha with the checkerboard track and ring thumb;
     - .ts-hr;
     - .ts-crow, .ts-clab, .ts-ct, .ts-cs, .ts-info, .ts-ihint;
     - .ts-pillsel (appearance:none, border 0, height 36, min-width 64, radius 18, text-align-last:center; disabled opacity .45);
     - .ts-isg / .ts-isb with the pressed state and a 120ms background transition;
     - .ts-sw2 Material switch, RTL;
     - .ts-chead, .ts-cact, .ts-crow2, .ts-cscroll (scroll, mask, hidden scrollbar, pan-x), .ts-cdiv, a resized .ts-sw (36x44, 24px dot, grey selection ring), .ts-custom at 36x44, and .ts-fav at height 34 with flex-shrink:0 inside .ts-cscroll;
     - the open keyframes ts-in at 160ms, plus reduced-motion off switches.
   - Keep the existing .ts-sec / .ts-seg / .ts-qsizes rules for the eraser, shape and text sheets.
7. site/css/studio-compact.css line 109: set the width to 340px (phone stays width:auto at line 112).
8. Versions:
   - pdf-notes.html: studio-toolbar.js ?v=nw64 → ?v=nw65; studio-settings.css ?v=compact2 → ?v=nw65; studio-compact.css ?v=nw64 → ?v=nw65.
   - sw.js: V "medixa-studio20-sync63-nw64" → "medixa-studio20-sync63-nw65".
   - Add a short CLAUDE.md note in the final step: what replaced what, and that Scribble-to-erase and Circle-to-lasso were not built.
9. (Mohammed asked for no test runs.) If anyone runs tests later, tests/studio_settings_browser.py expects ts-wrmin/ts-wrmax ranges, quick sizes and the old sections. Update it to ts-pressure / ts-smooth selects and the new structure, or mark it outdated in CLAUDE.md, which already warns that this test may need updates.

NOT BUILT (omit, show nothing):
- Scribble to erase: medium cost, about 80 lines in studio-ink.js endTool (zig-zag detection, then deleting the strokes it crosses with one history op and an «تراجع» banner). The risk of false erasures on Arabic/English handwriting (س ش m w shading) is high, and it cannot be tuned without a real iPad and Pencil.
- Circle to lasso: medium cost, about 50 lines (closed-loop detection, C.lassoHit over idx(page), a floating «تحديد» chip, then M.selection.select(ids, page)). It conflicts with hold-to-shape ellipses and with students who circle words on purpose. Could come later as an opt-in switch, off by default, if Mohammed asks.
- Notewise's «⋯» (shape options) and a custom colour palette («+» as add-colour) are omitted too: there is no engine storage for them, and cleanStyle drops unknown fields.

### مخاطر

- iOS Safari range inputs ignore taps on the track and only move when the thumb itself is dragged. With a thin 4px Material bar thumb that is almost impossible, so the custom pointer handler and the 24px transparent thumb hit box are required. The custom handler must not fight the native drag: both write the same value, which is harmless.
- calc() with var(--f) inside gradients on ::-webkit-slider-runnable-track depends on custom properties inheriting into the pseudo-element. This works in WebKit and Blink; Firefox needs ::-moz-range-* duplicates.
- appearance:none on <select> plus text-align-last needs iOS 16 or later (fine). The pill selects are 36px tall, a little under Apple's 44px target; the whole row label is a <label for> to compensate.
- Pressure levels:
  - Mapping wr to 6 levels replaces any custom two-slider values once the student touches the control. Until then the pill shows the nearest level. That is acceptable, but it is a behaviour change.
  - Level 0 still tapers the ends of fountain and brush strokes, so its hint says «بلا تأثير للضغط» rather than a perfectly constant width.
  - Ballpoint changes little across levels (pressure 0.25 in core).
- Favourites:
  - The favourites row moves behind ≡ (and «+» now saves a favourite). This is less visible than before, but it keeps the sheet short; the label switch and the auto-open after «+» help.
  - Rebuilding chips on every 'style' event would reset the horizontal scroll, so rebuild only when the presets change.
- refreshSet repaints the preview and 5 chip canvases on each slider input. That is fine, but keep the chips small (34x16 at DPR ≤ 3) for iPad memory.
- Removing quick sizes and the min/max sliders from the sheet breaks tests/studio_settings_browser.py (browser test, not part of npm test).
- The accent colour must match whatever Request 4 decides for the active toolbar tile; only change the three --ts-acc tokens.
- The max-height computed in JS must be refreshed when the iPad keyboard or browser chrome changes visualViewport. Otherwise the sheet can again end below the screen.
- Night mode: the pen preview stays on a white panel so ink colours are shown truthfully on white pages. This differs slightly from Notewise's dark preview.

### غير مؤكد

- Notewise «Line type» was never opened in any frame. Its icon matches the highlighter's «freehand» option, so it most likely chooses freehand or straight for the pen. Our engine has no straight-pen mode, so the slot shows our real line style (solid/dashed/dotted). Adding an always-straight pen would need an engine change: today a straight pen stroke keeps a 1-entry pr array against 2 points and validStroke would drop it.
- What Notewise's «≡» and «+» next to Color do is not shown (probably palette list and add colour). We map them to favourites view and save-current-as-favourite, because we have no palette storage.
- The exact iPad viewport: the screenshots suggest about 1240x826 CSS px with a status-bar safe area, so the sheet top is about 166px. The height budget (about 580 pen, about 555–596 highlighter) was checked against 1180x820 and fits both.
- Whether Mohammed wants the quick bar to stay visible while the sheet is open (as now) or hidden, so the sheet sits directly under the toolbar as in Notewise. The plan keeps it visible; hiding it would add about 54px of room.
- Whether he prefers Notewise-style static icons on the 5 type cards instead of our live-rendered monochrome stroke chips. The plan keeps the chips because our 5 types differ by stroke character.
- Blue versus teal accent depends on the Request 4 toolbar decision.

الملفات: /home/user/international-students-materials/site/js/studio-toolbar.js, /home/user/international-students-materials/site/css/studio-settings.css, /home/user/international-students-materials/site/css/studio-compact.css, /home/user/international-students-materials/site/js/studio-ink.js, /home/user/international-students-materials/site/js/studio-core.js, /home/user/international-students-materials/site/css/studio.css, /home/user/international-students-materials/site/pdf-notes.html, /home/user/international-students-materials/site/sw.js, /home/user/international-students-materials/tests/studio_settings_browser.py, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/1.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/2.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/4.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/3.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/ts/cur-land-pen.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/ts/cur-land-highlight.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/ts/ts_shot.py

## R4 — شكل شريط الأدوات

### ما يظهر

Main image req/3.jpg (2000x157). It is the top strip of a Notewise screenshot in light theme: a full-width screenshot scaled to 2000px. The same toolbar appears unscribbled in dark theme in req/2.jpg, at identical x positions. All x values below are image px. The calibration converts at about 1.6 image px per CSS px: our own 54px pill measures 85px in his screenshot req/1.jpg, so his viewport is about 1210-1270 CSS px wide.

Three separate floating white pills on the cream page (#F4ECE1):

LEFT PILL
- Position: x 13-324, y 23-94. That is about 44px tall and 188px wide, with an 8px left margin.
- Five 36px buttons at centres 49.5 / 109 / 168 / 226.5 / 287. The pitch is 59 img px, about 36-37px.
- In order:
  1. ← back arrow
  2. pages grid (2x2 equal rounded squares)
  3. add page (rounded square with +)
  4. search (bold magnifier)
  5. stacked-cards icon: a rounded rect with two shorter lines above (open documents/tabs)
- All icons #1C1C1C, glyphs about 26 img px (16-17px).

CENTRE PILL
- Position: x 338-1741, about 875px wide.
- It sits only about 8px after the left pill, so it is left-anchored, not centred. It ends about 70px before the right pill.
- In order:
  - undo (372.5) and redo (431.5): small U-turn arrows, glyph about 15px, grey #A7A7A7 when disabled.
  - touch/finger toggle (492): a pointing hand with a vertical double arrow beside it. Plain black, not highlighted, while Pencil is in use.
  - Short separator at 529: 1.5px x 22px, #EFEFEF.
  - pen (566.5): a slim pencil.
  - brush (625.5): a paintbrush.
  - highlighter (686): ACTIVE. Filled circle of 58 img px (about 36px), colour #C5E0FE, icon dark navy (#011C37-#0B2545).
  - eraser (743.5): a tilted rounded block with a dividing line and no base line.
  - [scribbled = tape, 805]
  - lasso (862): a dashed circle with a small loop and tail at bottom-left.
  - [scribbled = shapes, 920]
  - image (979.5): rounded square with a sun and a mountain line.
  - text (1038.5): T inside a rounded square.
  - sticky note (1097.5): square with a folded bottom-right corner.
  - Seven scribbled slots (the computed task said 6). Matched against 2.jpg they are: emoji/sticker 1157, table 1216, zoom window 1275, a box-with-squiggle element 1335, add-element/layout 1393, ruler 1452, microphone 1512.
  - magic wand with sparkle (1572.5): not scribbled. In video v7 tapping it opens a sheet titled "Laser pointer" with Dot / Line / Glow, Fade-out delay and Color, so it is Notewise's LASER POINTER.
  - settings gear (1629.5).
  - Separator at 1667.5.
  - Chevron-down (1704.5), about 9px tall.

RIGHT PILL
- Position: x 1855-1990, about 84px.
- eye (1891.5): sits permanently in a filled grey circle (#EFEFEF, about 36px). Eye glyph #686869.
- more (1950): three solid black dots.

Shared styling
- Pills: white, no visible border, very soft 1-3px shadow (#DED9D5 band under the edge), fully rounded ends.
- Icons: thin line icons, about 1.6px stroke.

Supporting evidence
- req/2.jpg (Notewise dark, same layout):
  - pill #25282F
  - active circle #0F4A72 with icon #C9E7FF
  - icons #DDE0E7
  - eye circle and separators #464A53
- /root/.claude/uploads/.../33475121-image.jpg (Notewise dark, narrower):
  - The main bar ends with a separator and chevron-UP (^) while the secondary tool-options bar is visible beneath it.
  - Secondary bar contents: line-type curve | 3 thicknesses | 5 colour dots (selected one has a small blue dot under it) | dashed (+) | pencil-underline | separator | sliders.
  - In 3.jpg, 2.jpg and v10 the chevron is down (v) and no secondary bar is shown. This strongly suggests the chevron shows/hides the secondary options bar.
- Video v10 (f1e5be1b, extracted at 10 fps into req/v10-hi):
  - Tapping the eye turns its circle light (active). The whole centre pill then fades out in about 300ms: opacity 1 -> 0.85 -> 0.4 -> 0 across f011-f014.
  - Only the left pill and right pill (eye + more) stay, plus a small up/down page pill on the right edge. The page scrolls freely.
  - Tapping the eye again fades the centre pill back in over about 300ms (f021-f024) with the previous tool (pen) still active. It is toggled twice in the clip.
  - So hiding the toolbar is the eye's job (read-only mode), not the chevron's.

OUR READER NOW (lay/final-land.png, iPad landscape 1180)
- Left pill: ‹ text glyph, uneven masonry grid, search, folder. Four 44px buttons in a 54px pill.
- Centre pill (54px tall, centred): undo, redo | hand, pen (active = teal #def3f0 rounded square with a small v, plus a red colour dot), highlighter (yellow dot), eraser, lasso (speech-bubble-like icon), I-beam select, T, image | … more.
- Quick bar below: curve, 3 thicknesses, 5 colours, (+), sliders.
- Right pill: cloud, dark «دخول» pill, green status dot, …, notes/document icon.
- Portrait (final-port): the same centre pill moves to a second row.
- Phone: bottom bar with undo, redo, pen, highlighter, eraser, colour dot, ….

### الهدف

Mohammed wants the reader's three floating top pills to look and behave like the Notewise light toolbar in his marked screenshot. Every tool we actually have goes in Notewise's slot order with Notewise-like thin line icons. The active tool shows a light-blue filled circle. Buttons are small round 36px buttons inside 44px pills, with short separators. The bar ends in a gear (settings) and a chevron that shows/hides the tool-options bar underneath. The right pill holds the eye (read-only) and more. Tools he scribbled out (tape, shapes, sticker, table, zoom window, element box, layout, ruler, mic) do not appear on the bar. The laser pointer slot is kept for when that tool exists (R7). He also expects brush next to pen, because we already have a 'فرشاة' pen type.

### تفاصيل المرجع

SCALE: Notewise img px / 1.6 = CSS px. All values below are CSS px for body.st-compact on screens wider than 720px.

PILLS (all three, plus the quick bar)
- height 44
- padding 4
- gap 0
- border 0
- border-radius 22
- background --nw-pill
- box-shadow 0 1px 3px #0000001a, 0 0 0 .5px #0000000d
- Gap between pills: 8. Screen margin: 12 (keep --reader-top).

BUTTONS
- 36x36, border-radius 50%, colour --nw-ink.
- svg 22px, viewBox 24, stroke-width 1.6, round caps. The glyph is about 18px.
- Undo/redo svg 18px.
- Hover (only @media(hover:hover)): background --nw-hover.
- Active ([aria-pressed=true] / .active): background --nw-on, colour --nw-on-ink, transition background-color .15s.
- Disabled undo/redo: colour --nw-dim, no background, opacity 1.

SEPARATOR
- Inline element or ::before: width 1.5, height 22, radius 1, background --nw-sep, margin 0 4px.
- Used after the touch toggle and before the chevron.

TOKENS, LIGHT
- --nw-pill #fff
- --nw-ink #1c1c1c
- --nw-dim #a7a7a7
- --nw-hover #f2f2f2
- --nw-on #c5e0fe
- --nw-on-ink #0b2545
- --nw-sep #ebebeb
- --nw-chip #efefef
- --nw-chip-ink #686869

TOKENS, DARK (body.medixa-dark)
- --nw-pill #25282f
- --nw-ink #dde0e7
- --nw-dim #6e7179
- --nw-hover #33363e
- --nw-on #0f4a72
- --nw-on-ink #c9e7ff
- --nw-sep #464a53
- --nw-chip #464a53
- --nw-chip-ink #c4c7ce

LEFT PILL (#st-compact-nav), LTR, 5 buttons, about 188px wide
1. ← رجوع: existing a#st-back. Replace the '‹' text with svg `<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>`.
2. الصفحات: #medixa-thumbs-toggle. Icon: 2x2 equal squares `<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/>`, repeated at (13.5,4), (4,13.5) and (13.5,13.5).
3. إضافة صفحة: NEW #st-add-page. Icon `<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>`. Opens a small st-pop titled «إضافة صفحة بعد الحالية» with 4 rows: مسطّرة / فارغة / مربعات / نقاط.
4. بحث في الملف: #st-find-btn. Icon `<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>`, stroke 2.
5. المستندات وأدوات الدراسة: #st-compact-files, which opens #st-docmenu. Icon is a stack `<rect x="4" y="9.5" width="16" height="10.5" rx="2.5"/><path d="M6 6.5h12M8 3.5h8"/>`.

CENTRE PILL (#studio-toolbar), LTR, exact order
1. تراجع #undo: `<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>`
2. إعادة #redo: the mirror, `<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>`
3. الكتابة بالإصبع: NEW toggle #st-touch.
   - Icon: a vertical double arrow `<path d="M4 4v15M2 6l2-2 2 2M2 17l2 2 2-2"/>` plus the lucide 'pointer' hand inside `<g transform="translate(6.5 3.5) scale(.72)">`.
   - Pressed (light-blue circle) = finger draws.
   - Plain = finger scrolls (the Notewise look while using Pencil).
4. separator
5. قلم [data-tool=pen]: lucide pencil `<path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/><path d="m15 5 4 4"/>`
6. فرشاة: NEW virtual button [data-tool=brush]. Lucide brush `<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>`
7. تظليل [data-tool=highlight]: keep the current lucide highlighter.
8. ممحاة [data-tool=eraser]: `<path d="M7 21 2.7 16.7a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21z"/><path d="m5.5 10.5 8 8"/>`. No base line.
9. تحديد حر [data-tool=lasso]: `<circle cx="13.5" cy="9.5" r="6.5" stroke-dasharray="3 2.6"/><path d="M8.6 13.8c-2.3-.2-4.3.9-4.1 2.5.2 1.4 2.3 1.7 3.1.5.6-.9 0-2-1.1-2.3"/><path d="M5.8 17.6c.2 1.5-.5 2.7-1.8 3.4"/>`
10. تحديد نص [data-tool=select]: keep the I-beam. It takes the scribbled 'shapes' slot; see uncertainties.
11. إدراج صورة #studio-insert-image: `<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m20.5 15-4.2-4.2a1.5 1.5 0 0 0-2.1 0L5 20"/>`
12. نص [data-tool=text]: `<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 8h8M12 8v8.5M10.3 16.5h3.4"/>`
13. ملاحظة لاصقة [data-tool=sticky]: `<path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v9.5l-6 6H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M20.5 14.5H16a1.5 1.5 0 0 0-1.5 1.5v4.5"/>`
14. مؤشر الليزر [data-tool=laser]: only rendered once R7 registers a 'laser' tool. Uses the lucide 'wand' icon (stick from bottom-left plus a ray burst). Never add a dead button.
15. (Only when the active tool is off-bar, e.g. خط/مستطيل/دائرة/سهم/كتابة مكبرة/منطقة: that tool is shown active here, .st-extra, before the gear.)
16. الإعدادات: the existing #studio-settings button, which opens .st-morepop. Change its icon from ••• to the lucide 'settings' gear, and its label to «الإعدادات».
17. separator
18. Chevron #st-quick-toggle `<path d="m6 9 6 6 6-6"/>`.
    - aria-controls st-quickbar.
    - Expanded (quick bar visible): svg rotate(180deg), so it points up (^). Label «إخفاء خيارات الأداة».
    - Collapsed: points down (v). Label «إظهار خيارات الأداة».
    - Transition transform .2s.
    - aria-disabled with opacity .35 when the active tool has no quick bar (eraser, lasso, select, image, hand, region, zoom).

Width check: 14 buttons x 36 + 2 separators (about 10 each) + 8 padding = about 532px, or about 568 with the laser. This fits one row from 980px.

RIGHT PILL (#studio-hdr-actions), LTR
- [#acct-sync cloud as today] [#status dot, 24px, as today below 1280px] [NEW #st-readonly eye] [#st-docmenu-btn more].
- Eye #st-readonly «وضع القراءة»:
  - Icon: lucide eye `<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>`.
  - Always sits on a --nw-chip circle with --nw-chip-ink colour.
  - When active: --nw-on / --nw-on-ink. Dark-theme reference shows a light #E8E8E8 circle; the light-theme active colour was not observed.
- More: three SOLID dots `<circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/>` at x 5, 12 and 19.
- Move #st-notes-toggle («ملاحظاتي») into #st-docmenu as a labelled row. Notewise's right pill holds only eye and more.

QUICK BAR (#st-quickbar) under the centre pill
- Position: 8px below, centred on the centre pill (current position:absolute;left:50% is fine).
- Style: same pill style, height 44, buttons 36.
- Contents: tool type | 3 sizes | 5 colours | (+) | separator | sliders. Add the separator before the sliders, as in the Notewise sub-bar.
- When brush is active, the tool-type button shows the brush icon.
- Shown only when cfg.quick !== false (the chevron is expanded) and the tool is pen, brush, highlight, shapes, text or sticky.
- In = existing st-q-in .18s. Out = fade .15s.
- When collapsed, NO colour dot appears in the main bar; colour and size are reached by a second tap or a long press on the tool, which opens #st-toolset.
- Default: expanded. It was requested in Step 64, and Notewise shows ^ with the bar visible.

READ-ONLY (eye), per v10
- Tap: remember {tool, brush?} and M.setTool('hand'). Add body.st-readonly.
- The centre pill and quick bar animate `opacity 1->0` over .28s ease, then visibility:hidden / pointer-events:none.
- Tap again: restore the remembered tool (default pen). The pill fades in over .28s.
- Read-only ≡ S.tool==='hand', so the 'v' key or the gear grid's hand tool enter the same mode.
- Keep --reader-reserve unchanged so the page does not jump.
- #st-edge-nav stays visible.

GESTURES (unchanged)
- Tap a tool = select it.
- Tap the active tool again, or hold 500ms = its settings sheet #st-toolset.
- Brush behaves the same; its sheet title is «إعدادات الفرشاة».

LAYOUT BY SCREEN
- iPad landscape (≥980px): one row.
  - The left pill sits at left 12.
  - The centre pill is left-anchored at left = 12 + nav width + 8, like Notewise (this needs --st-nav-w, measured).
  - The right pill sits at right 12.
  - The quick bar sits beneath the centre pill.
- iPad portrait (721-979px):
  - Row 1: left pill + right pill (44px).
  - Row 2: centre pill centred at top = --reader-top + 52px.
  - Quick bar 8px below.
- Phone (≤720): keep the current bottom bar but use the new icons, tokens and round active circle. Keep 44px buttons there (finger).
  - Hide #st-touch and #st-quick-toggle (no quick bar on phones).
  - Brush lives in the gear grid.

RESERVED HEIGHTS (44px rows, 8px gaps, top 12)
- Landscape: --reader-reserve 68px; with st-has-quick 120px.
- Portrait (≤979): --reader-tools-top calc(var(--reader-top) + 52px); reserve 120 / 172.
- #st-edge-nav top: tools-top + 52px; with quick + 104px.
- .st-panel top: tools-top + 52px.

### السبب

This is not a bug. The current shape differs from the reference because of these specific lines:
- site/js/studio-toolbar.js:104-106 builds the compact primary list as hand, pen, highlight, eraser, lasso, select, text. It has no brush or sticky, and the hand comes first.
- site/js/studio-toolbar.js:153 appends the image button after all tools instead of between select and text.
- site/js/studio-toolbar.js:148 makes «المزيد» a ••• button instead of a gear.
- There is no touch toggle, no chevron and no eye anywhere.
- quickOn() at site/js/studio-toolbar.js:100 is always on for colour tools; nothing can collapse it.
- site/css/studio-compact.css:5,8,21,23 give 54px pills with 44px buttons, and :23-25 give a 12px-radius rounded square with a teal active state (#def3f0 / #08766e) instead of a 36px light-blue circle.
- site/css/studio-compact.css:26-28 draw full-height border separators.
- site/css/studio-settings.css:116 adds the red/yellow colour dots on the pen/highlighter, and :7 adds the small v under the active tool. Neither exists in Notewise.
- The left pill (site/js/studio-compact.js:17-19) has no add-page button and uses '‹' text from site/js/studio-shell.js:13, a masonry grid icon (studio-shell.js:26) and a folder icon.
- The right pill (studio-compact.js:26-28 plus pdf-sync.js:47-50) holds the cloud, status, ••• and notes, but no eye.
- The ••• dots are stroked rings (studio-shell.js:19) rather than solid dots.

Engine facts to respect:
- setTool (site/js/studio-ink.js:1011-1016) toggles .active on every [data-tool] whose id equals the tool. A brush button must therefore NOT carry data-tool="pen".
- penMode (studio-ink.js:517) = stylusOnly || !fingerDraw || (autoStylus && pencil seen within 14 days). A touch toggle must set autoStylus:false to really let a finger draw.
- The hand tool already makes every pointer pan (studio-ink.js:541, 565), and long-press word select works in hand (site/js/studio-smart.js:163). This makes hand the natural read-only mode.
- Strokes with pen:'brush' are already valid (Step 'compact2' notes).

### خطة التنفيذ

1. site/js/studio-toolbar.js, TOOLS (lines 11-26):
   - Swap in the icon paths from reference_details for pen, highlight (keep), eraser, lasso, text and sticky. Keep select and hand as they are.
   - Add `{ id: 'brush', name: 'فرشاة', icon: <lucide brush>, virtual: true }` right after pen.
   - Add 'brush' to SETG (→ 'pen') and TITLES (→ 'إعدادات الفرشاة').
   - DEFAULT gains `quick: true`. load() returns `quick: v.quick !== false`; it already appends unknown ids like 'brush'.

2. studio-toolbar.js, new helpers near line 60:
   - `const isBrush = () => S.tool === 'pen' && (M.style('pen') || {}).pen === 'brush';`
   - `const isOn = id => id === 'brush' ? isBrush() : id === 'pen' ? S.tool === 'pen' && !isBrush() : S.tool === id;`
   - `function activate(id)`. This is a pen/brush swap with no engine change:
     - VKEY 'medixa.studio.vpen.v1' = `{ lastPen, pen:{color,width,op,dash}, brush:{color,width,op,dash} }`, read and written in try/catch.
     - Switching to brush: save the current pen {color,width,op,dash} as .pen and lastPen = current type. Then M.setTool('pen') and M.setStyle('pen', Object.assign({width:6}, saved.brush, {pen:'brush'})).
     - Switching to pen from brush: save .brush, then M.setStyle('pen', Object.assign({}, saved.pen, {pen: lastPen || 'ballpoint'})).
     - Any other id: M.setTool(id).
   - Use isOn/activate in:
     - toolButton: `on`, the second-tap test `if (isOn(t.id) && hasSet(t.id))`, and `M.setTool(t.id)` → `activate(t.id)`.
     - holdable (line 81): `if (!isOn(id)) { closePops(); activate(id); }`.
     - sync() (lines 211-213): `on = isOn(id)`.
   - Remove the --tool-c colour-dot logic for compact (lines 214-217), or keep it and hide it in CSS.
   - anchor() (line 234) → `root.querySelector('.st-tools .st-btn.active') || root.querySelector('.st-tools [data-tool="'+S.tool+'"]')`.
   - build() (line 334): `const t = byId[isBrush() ? 'brush' : S.tool]`.

3. studio-toolbar.js render(), compact branch (COMPACT && !mqPhone.matches):
   - NW order is `['pen','brush','highlight','eraser','lasso','select','@image','text','sticky','laser']`. Filter it by byId[id] existing (so 'laser' appears only after R7 registers it in TOOLS) and by !cfg.hidden.
   - Build in this exact DOM order:
     - .st-hist: #undo (18px svg), #redo, then #st-touch.
     - .st-tools: the separator comes from ::before. For '@image', append the existing img button (class 'st-btn st-insert', id studio-insert-image). If the active tool is not in NW and is not 'hand', add it as .st-extra.
     - .st-settings: gear #studio-settings plus .st-morepop. The «أدوات أخرى» grid = all TOOLS not in NW: hand, line, rectangle, ellipse, arrow, zoom, region.
     - .st-collapse: separator from ::before, then #st-quick-toggle.
     - .st-style (quick bar).
     - #st-toolset.
   - Drop the CSS `order` hacks.
   - quickOn() adds `&& cfg.quick !== false`. When compact tablet and !quickOn(), do NOT render the st-stylebtn colour dot.
   - #st-quick-toggle:
     - onclick: `cfg.quick = !cfg.quick; save(); render();`
     - aria-expanded = String(quickOn()).
     - aria-disabled when !SETG[S.tool] || S.tool === 'eraser'.
   - The more button keeps id 'studio-settings', but gets the gear svg and the label 'الإعدادات'.
   - Inside the quick bar, add `div('st-qsep')` before the gear/sliders. For brush, `kind` shows the brush icon.

4. studio-toolbar.js, touch toggle #st-touch (built in render, refreshed in syncInput):
   - pressed = `!(M.penMode && M.penMode())`.
   - Labels:
     - when pressed: 'الكتابة بالإصبع: مفعّلة'
     - otherwise: 'الإصبع يحرّك الصفحة — اضغط للكتابة بالإصبع'
   - onclick:
     - If pressed: `M.setInput({ fingerDraw: false })`.
     - Else: `M.setInput({ fingerDraw: true, stylusOnly: false, autoStylus: false })`, because autoStylus with a detected pencil forces pen mode (studio-ink.js:517).
   - Coordinate with whatever R11 (Batch A) defines as the finger flag; bind the button to that single source of truth.
   - Hide on phones.

5. Eye / read-only (shape only here; R10 owns the full behaviour). In studio-toolbar.js, or a tiny block in studio-compact.js:
   - Create #st-readonly ('وضع القراءة', eye svg).
   - On click: if S.tool !== 'hand', store `prev = { tool: S.tool, brush: isBrush() }` and M.setTool('hand'). Otherwise restore with activate(prev.brush ? 'brush' : prev.tool || 'pen').
   - `M.on('tool', t => { document.body.classList.toggle('st-readonly', t === 'hand'); eye.setAttribute('aria-pressed', String(t === 'hand')); })`.
   - Place it in #studio-hdr-actions immediately before #st-docmenu-btn.

6. site/js/studio-compact.js init():
   - Left pill order: st-back, medixa-thumbs-toggle, NEW #st-add-page, st-find-btn, st-compact-files.
   - Replace #st-back's inner '‹' with the arrow svg; keep the aria-label/title.
   - Set the files icon to the stack svg.
   - #st-add-page:
     - Opens an st-pop under it with 4 buttons (مسطّرة/فارغة/مربعات/نقاط).
     - On pick: `const R = M.reader, cur = R.current(), ref = R.pages.find(p => p.kind === 'src') || { w: 595, h: 842 }; const rec = M.addBlank(cur, tpl, { w: ref.w, h: ref.h }); setTimeout(() => R.goto(rec.id), 150);` (same logic as studio-panels.js:56-59).
     - Remember the last template in localStorage 'medixa.studio.blanktpl' (try/catch).
   - Move #st-notes-toggle into #st-docmenu (labelled «ملاحظاتي») instead of #studio-hdr-actions.
   - Add a ResizeObserver on #st-compact-nav that sets `--st-nav-w` on documentElement.

7. site/js/studio-shell.js:
   - ICON.pages → 2x2 equal squares.
   - ICON.more → three solid dots (fill currentColor, stroke none, r 1.8).

8. site/css/studio-compact.css (body.st-compact scope; dark under body.st-compact.medixa-dark):
   - Add the --nw-* tokens.
   - Pills (header pills, #studio-toolbar, .st-quick): height/min-height 44, padding 4, border 0, radius 22, shadow; header height 44.
   - Buttons: 36px circles, svg 22px with stroke-width 1.6; undo/redo svg 18; active/hover/disabled colours.
   - .st-tools::before and .st-collapse::before as separators. Remove the border-left/border-inline-start rules at lines 27-28.
   - Override studio-settings.css:7 (active v) and :116 (colour dots) with `content:none` for tablets.
   - `#st-quick-toggle svg{transition:transform .2s}`, `[aria-expanded=true] svg{transform:rotate(180deg)}`, `[aria-disabled=true]{opacity:.35}`.
   - `#st-readonly{background:var(--nw-chip);color:var(--nw-chip-ink)}` and `[aria-pressed=true]{background:var(--nw-on);color:var(--nw-on-ink)}`.
   - `#studio-toolbar{transition:opacity .28s ease}`; `body.st-compact.st-readonly #studio-toolbar{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s ease,visibility 0s .28s}`.
   - At ≥980px: `#studio-toolbar{left:calc(var(--reader-side,12px) + var(--st-nav-w,188px) + 8px);right:auto;margin:0;max-width:calc(100vw - 400px)}`.
   - Reserve, edge-nav and panel offsets as in reference_details.
   - Quick bar: buttons and swatches 36px, swatch dots 24px, height 44.
   - Phone (≤720): keep 44px buttons; hide #st-touch and #st-quick-toggle.

9. Bump cache versions: ?v= for studio-toolbar.js, studio-compact.js/css, studio-shell.js and studio-settings.css in site/pdf-notes.html, and V in site/sw.js. Record the change in CLAUDE.md under the reader section.

### مخاطر

- Existing browser tests will break. tests/studio_settings_browser.py:129 clicks `.st-morepop [data-tool=hand]`; that still works, because hand stays in the gear grid. Other tests expect:
  - hand on the bar;
  - the «المزيد» label;
  - 54px heights;
  - the colour-dot style button on tablets;
  - the active `::after` indicator.
  Mohammed asked for no test runs, but the main agent should not claim the tests pass.
- Engine setTool (studio-ink.js:1013) toggles .active on [data-tool] by exact id. The brush button must use data-tool="brush" and must never call M.setTool('brush'): the engine has no 'brush' tool, so beginTool would draw nothing. Every path, including the customize dialog, must go through activate().
- The pen/brush snapshot swap rewrites the pen style group's colour/width/op/dash on every switch. If two switches happen within 250ms, the debounced saveStyles still persists only the last state, which is fine. Favourite presets are untouched.
- The touch toggle sets autoStylus:false. That permanently disables "switch automatically when a pen is detected". It must agree with R11's new model, or the gear-sheet checkbox (studio-autostylus) and the toggle will fight.
- Removing hand from the bar: users who used hand to scroll with Pencil now use the eye. Read-only ≡ hand means choosing hand via the 'v' key or the gear grid hides the centre pill; the eye is always visible to come back.
- 36px buttons are below Apple's 44pt touch guideline. This copies Notewise exactly, but finger taps on iPad may miss more often; phones keep 44px.
- Left-anchoring depends on --st-nav-w. If the ResizeObserver has not run yet, the 188px fallback applies. When the panels (#st-pages) are open on the left at ≥1360px, check that the toolbar does not overlap the panel.
- Moving #st-notes-toggle into the docmenu changes where students find «ملاحظاتي». studio-panels.js:27 still sets aria-expanded on it, so it keeps working.
- #status (local save state) and the guest «دخول» action in #acct-sync stay in the right pill. Notewise has neither, so the right pill will be wider than the reference (about 140px instead of 84).

### غير مؤكد

- Chevron meaning is inferred, not seen being tapped.
  - Evidence for "show/hide the tool-options bar": the Notewise dark screenshot 33475121 shows ^ with the sub-bar visible, while 3.jpg, 2.jpg and v10 show v with no sub-bar.
  - v10 shows the whole bar hiding via the eye, not the chevron.
  - If Mohammed meant "collapse the whole toolbar", the eye already does that.
- CSS sizes come from scaling the 2000px image. Calibrated on our own 54px pill in 1.jpg, that is about 1.57-1.65 img px per CSS px, so Notewise is about 44-46px pills, 36-37px buttons and 18-19px glyphs. The 3:2 screenshot and video ratio (3048x2032) does not match standard iPad sizes, so the exact device is unknown.
- Touch-toggle state colours are inferred: plain = finger scrolls, filled = finger draws. Notewise never shows it pressed in the references.
- The eye's active colour in light theme was not observed; dark theme shows a light #E8E8E8 circle. The proposed --nw-on light-blue is a choice for consistency.
- Mohammed scribbled out 'shapes' and the 'zoom window' even though we have line/rectangle/ellipse/arrow and «كتابة مكبرة». The spec follows his marks and keeps them in the gear's «أدوات أخرى» grid. He may want a single «أشكال» button in slot 7 instead.
- 'select' (I-beam) has no Notewise slot. Notewise selects text by long-press; in v2ref the T tool is active while selecting. The spec keeps select in the scribbled-shapes slot until Batch C (R2/R8) makes long-press selection work in every tool, after which it could move to the gear grid.
- The laser pointer slot depends on R7 building a 'laser' tool. Until then the slot is simply absent.
- The 7th scribble (mic) means 7 scribbled icons after sticky, not 6.
- Whether the read-only state should persist across reloads is unknown; v10 shows only in-session toggling.

الملفات: /home/user/international-students-materials/site/js/studio-toolbar.js, /home/user/international-students-materials/site/js/studio-compact.js, /home/user/international-students-materials/site/css/studio-compact.css, /home/user/international-students-materials/site/css/studio-settings.css, /home/user/international-students-materials/site/js/studio-shell.js, /home/user/international-students-materials/site/js/studio-search.js, /home/user/international-students-materials/site/js/studio-panels.js, /home/user/international-students-materials/site/js/studio-ink.js, /home/user/international-students-materials/site/js/studio-smart.js, /home/user/international-students-materials/site/js/pdf-sync.js, /home/user/international-students-materials/site/pdf-notes.html, /home/user/international-students-materials/site/sw.js, /home/user/international-students-materials/tests/studio_settings_browser.py, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/3.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/2.jpg, /root/.claude/uploads/7526f635-5416-5215-8299-b5af2d64b57b/33475121-image.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v10-hi-sheet-a.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v7-sheet.jpg, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/lay/final-land.png

## R5 — مؤقت الدراسة

### ما يظهر

Video v5 (628b373e-Screenrecorder-2026-10-21-10-21-05-136.mp4, 14.1 s, 3048x2032, iPad landscape, Notewise in its dark theme). Frames were checked at 2, 4 and 6 fps. The "study feature" in the video is Notewise's TIMER: a popover for setup, a floating countdown bar, and a minimised round badge. No other study feature appears.

0.0–1.0 s: Notewise reader. A PDF page is open ("Figure 37-4. Intrinsic pathway for initiating blood clotting", page 22). At the top is a row of document tabs. Under it is a dark toolbar (#1E2730). Left side of the toolbar: back, camera, crop, mic, cloud. Right side: book, (A), layers, sticky+, split view, sliders, STOPWATCH icon, fullscreen, ⋯. The stopwatch icon is a circle with a short detached bar on top and a short needle from the centre pointing up. A vertical tool rail runs down the right edge (undo/redo, pen, highlighter, eraser, lasso, image, text, text-select, colour dots).

~1.0 s: he taps the stopwatch icon. The icon gets a soft rounded-square highlight. A dark popover "Timer" fades in (opacity 0→1 over about 0.2–0.3 s; one captured frame shows it half-transparent). Its top is about 10 px under the toolbar and its right edge lines up just left of the right rail. Size is about 315 x 485 pt.
Popover contents, top to bottom:
- Header about 46 px: sliders/settings icon (left), title "Timer" centred (about 17 px, white), × close (right). A 1 px divider follows.
- Segmented control about 36 px tall: [Timer | Stopwatch]. Timer is active (lighter segment on a darker track).
- iOS-style wheel picker: "00 h 00 m 00 s" on a lighter band, with 01 and 02 faded below.
- "Ready" button: about 117 x 41, orange 1.5 px outline, orange text, radius about 12.
- Three 48 px list rows with 1 px dividers: "Name … Tap to enter name"; "My timer ›"; "Timer history" with a small red dot, then ›.

3.5–5.0 s: he scrolls the wheels to 02 h 06 m 00 s.

~5.3–5.5 s: he taps Ready. The popover cross-fades (one frame shows it about 50% transparent, with the page visible through it) into a compact horizontal BAR. The bar sits at the same top-right spot, right-aligned to where the popover was. It is about 353 x 54 pt, dark #29333D, radius about 14, with a soft shadow.
Bar layout, left to right:
- Collapse icon (↙↗ arrows pointing inwards), then a thin vertical divider.
- Small grey caption "2 h,6 m,0 s" over a big white "2:06:00" (about 22 px, semibold, tabular).
- Spacer, then "Stop" (red text #E8505A), "Reset" (grey #8E959D, looks disabled), and "Start" in a 40 px filled orange circle (#ED7A43, white text).

~8.75 s: he taps Start. The circle becomes a dark circle with a 2 px orange ring and orange text "Pause". "Reset" turns white (enabled). At ~9.5 s the time reads 2:05:59.

~10.25 s: he taps the collapse icon. Within about 1 frame (≤0.17 s) the bar shrinks to a 54 x 54 rounded-square BADGE. The badge is #29333D, radius about 14, holds a 46 px orange ring (1.5–2 px stroke), and shows the time in orange inside it ("2:05:58", about 12 px semibold). It is anchored at the bar's right end. One intermediate frame shows the badge at the left end, where the collapse button was, before it settles at the right. The badge keeps counting (2:05:55 at 14 s). The toolbar stopwatch icon never changes while the timer runs.

Measured colours: panel/bar/badge bg #29333D; segment track #161F28; active segment about #2E3843; wheel band #39434D; dividers #39434D; orange #ED7A43 (ring/text about #E97A47); Stop red about #E5505A; secondary text about #8B949E.

Our reader today (final-land/port/phone.png): the toolbar pill is [undo redo | hand pen highlighter eraser lasso text-select text image | ⋯]. A quick bar under it holds sizes and colours. Page arrows #st-edge-nav sit at the top right. The page/zoom pill sits at the bottom left. There is no timer anywhere in view.

### الهدف

Mohammed wants a Notewise-style study timer that he can reach with one tap from the reader's top toolbar on his iPad.

Tapping the ⏱ button opens a small dark panel just like the video's. In it he picks one of three modes: «25 / 5» (25 min focus then 5 min break, repeating on its own), «50 / 10» (the same with 50/10), or «وقت مفتوح» (a count-up stopwatch). He taps «جاهز».

A floating dark bar then appears at the top right with «ابدأ / إيقاف / إعادة / إنهاء». He can shrink it to a small round badge that keeps counting while he writes. A setting makes the floating timer see-through (adjustable transparency) so it does not hide the page.

The timer must survive switching files (each file switch reloads the page), must not drift, and must signal the change between focus and break with a sound and a visual pulse.

### تفاصيل المرجع

Sizes are CSS px for the iPad 1180x820 layout. The video measures about 2.55 video-px per pt. Arabic labels are given exactly. The colours are the video's own; put them in tokens on #st-timer-pop and #st-timer-float: --tm-bg:#29333D; --tm-track:#161F28; --tm-seg:#2E3843; --tm-line:#39434D; --tm-text:#EEF2F5; --tm-muted:#8B949E; --tm-orange:#ED7A43; --tm-red:#F0545C; --tm-break:#34C3A0 (break phase colour, our addition so focus and break can be told apart).

1) TOOLBAR BUTTON #st-timer-btn
- Class "st-btn", 44x44, stopwatch icon at 22 px, the same stroke style as the other toolbar icons: <path d="M9.5 3h5"/><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5"/>
- aria-label/title «مؤقت الدراسة»; aria-haspopup="true"; aria-expanded tracks whether the panel is open.
- Place it inside .st-settings, immediately before the ⋯ button (#studio-settings). The compact pill then reads: undo redo | hand pen highlight eraser lasso select text image | ⏱ ⋯
- While the panel is open: background var(--reader-hover), like the video's highlight.
- Optional, not in the video: a 7 px orange dot at the top-right of the icon while a session runs.
- Same button on phone; the bottom bar has room (7 buttons today, so 8 fits in 374 px).

2) PANEL #st-timer-pop
- Class "st-pop st-timerpop", dir="rtl", placed right after the button. It therefore uses the toolbar's closePops / outside-click / Escape logic.
- Tablet: position absolute, top calc(100% + 8px), inset-inline-start:auto, right:0 (right-aligned to the toolbar end, like .st-morepop), width 320, radius 18, bg --tm-bg, colour --tm-text, no border, shadow 0 16px 40px rgba(10,16,24,.35), padding 0, overflow hidden.
- Phone: the existing phone rules turn .st-pop into a bottom sheet above the toolbar automatically.
- Opening animation: opacity 0→1 and translateY(-6px→0), 180 ms ease-out. None under prefers-reduced-motion.

a) Header (48 px; 1 px --tm-line bottom border)
- Right (start): 40x40 settings icon button «إعدادات المؤقت», sliders icon.
- Centre: title «مؤقت الدراسة», 17 px, weight 600.
- Left (end): 40x40 «إغلاق» ×.
- In the settings and history sub-views, the settings icon becomes a back chevron «رجوع» (›, because of RTL) and the title becomes «إعدادات المؤقت» or «سجل الجلسات».

b) Segmented control (replaces Timer|Stopwatch)
- Margin 16 px, height 40, track --tm-track, radius 10, padding 3. Three equal segments in RTL order: «25 / 5» · «50 / 10» · «وقت مفتوح».
- Active segment: bg --tm-seg, radius 8, text --tm-text 14 px 600. Inactive: --tm-muted.
- Selecting a segment only changes the preview; it does not start anything. The selection is saved as state.preset.

c) Preview area (where the video's wheel was; about 112 px tall, centred)
- Big time: 40 px weight 600, tabular-nums, dir=ltr: «25:00», «50:00» or «00:00».
- Under it, a 13 px --tm-muted line:
  - 25/5: «تركيز 25 دقيقة ← استراحة 5 دقائق · تتكرر تلقائياً», with a 6 px orange dot before «تركيز» and a 6 px --tm-break dot before «استراحة».
  - 50/10: the same with 50 and 10.
  - Open: «يعدّ الوقت تصاعدياً حتى تُنهيه».
- Custom h/m/s wheels are NOT built: Mohammed defined the three modes.

d) Main button «جاهز»
- 120x42, centred, margin 8px auto 18px, transparent bg, 1.5 px --tm-orange border, radius 12, --tm-orange text 16 px 600.
- If a session is already active, the label is «جلسة جديدة». Pressing it ends the current session (focus time is logged) and prepares the new one.

e) List (rows 48 px, padding 0 16, 1 px --tm-line separators, 16 px text)
- «الاسم»: an inline <input> aligned to the end, placeholder «اضغط لكتابة اسم», maxlength 40, 15 px --tm-muted, no border. Saved as state.name; shown in the bar caption and in history.
- «سجل الجلسات» ‹: shows a 6 px --tm-red dot when there are history entries not yet seen. Opens the history sub-view.
- The video's «My timer» row is dropped: the presets are the segments.

f) Settings sub-view (rows 52 px)
- «مؤقت شفاف»: iOS-style switch, track 44x26, on = --tm-orange. Default off.
- «درجة الشفافية»: <input type=range> 20–90 step 5 (the opacity shown while idle; default 40), with an <output> «40%». Enabled only while the switch is on. Changes apply live to the floating widget.
- «صوت التنبيه»: switch, default on.
- Hint, 12 px --tm-muted: «المؤقت الشفاف يصبح واضحاً عند لمسه ثم يعود شفافاً بعد 3 ثوانٍ. على iPad لا يوجد اهتزاز، ولا يُسمع الصوت إذا كان الجهاز صامتاً أو الصفحة في الخلفية.»

g) History sub-view
- Summary card (bg --tm-track, radius 12, padding 12): «اليوم: N دقيقة تركيز · M جلسات».
- Scroll list, max-height 260, grouped «اليوم» / «أمس» / date. Each row reads «تركيز 25 د — 10:21 ص · الاسم» (open mode shows «وقت مفتوح 37 د»).
- «مسح السجل» in red text. It needs two taps: the first changes the label to «اضغط مرة أخرى للمسح» for 3 s.
- Opening this view marks the history as seen (state.seen = hist.length).

3) FLOATING WIDGET #st-timer-float
- Appended to body, position fixed, z-index 16. Present only while a session exists (ready, running or paused). Two forms: .is-bar and .is-badge.

Position: aligned with the page-arrow pill, just to its left, the way the video sits beside its right rail.
- Compact, >720 px wide: top: var(--reader-tools-top) + 64 px; with body.st-has-quick, var(--reader-tools-top) + 116 px (the same top as #st-edge-nav). right: max(8px, env(safe-area-inset-right)) + 48 px (#st-edge-nav is 40 px wide, plus an 8 px gap).
- Phone ≤720 px (edge nav hidden): top var(--reader-top) + 62 px; right 8 px.
- Without st-compact (fallback): top var(--st-hdr-h) + var(--st-tb-h) + 16 px; right 12 px.

BAR (.is-bar), dir=rtl
- Width min(356px, 100vw - 16px), height 56, radius 16, bg --tm-bg, shadow 0 8px 24px rgba(16,24,40,.28), padding 0 10px 0 6px, flex, centred vertically.
- Order, right to left:
  - Collapse button 44x44 «تصغير المؤقت» (↙↗ inward arrows icon, 20 px, --tm-muted).
  - 1 px x 32 px --tm-line divider.
  - Text block (margin 0 10px):
    - Caption 11 px/14 px --tm-muted: «تركيز · الجولة 2 · 25 د», or «استراحة · 5 د» (word «استراحة» in --tm-break), or «وقت مفتوح». If a name is set it comes first: «تشريح · تركيز …».
    - Time 22 px/26 px weight 600 --tm-text, tabular-nums, dir=ltr: mm:ss under one hour, h:mm:ss from one hour.
  - Flex spacer.
  - «إنهاء»: 15 px weight 500 --tm-red, min 44x44.
  - «إعادة»: 15 px; --tm-muted when there is nothing to reset, --tm-text otherwise; min 44x44.
  - Primary circle 44x44 (the video's is 40):
    - Not started or paused: filled --tm-orange, white 14 px 600 «ابدأ» (or «تابع» after a pause).
    - Running: transparent bg, 2 px --tm-orange ring, --tm-orange text «إيقاف».

BADGE (.is-badge)
- 56x56, radius 16, bg --tm-bg, same shadow, anchored at the same right/top. Tap it to expand («مؤقت الدراسة 24:59 — اضغط للتكبير»).
- Inside: an SVG ring r=21 (46 px), 2 px stroke.
  - Track stroke: rgba(237,122,67,.25).
  - Progress stroke: --tm-orange in focus, --tm-break in break. Its stroke-dashoffset shows the fraction remaining; it is full at the start, as in the video.
  - Open mode: a full static ring.
- Time in the centre in the phase colour, 12 px weight 600, tabular; 10.5 px when it has an hour part.

Animations (all off under prefers-reduced-motion):
- «جاهز»: the panel fades out 200 ms; the bar fades in with scale .96→1 over 200 ms.
- Collapse/expand: width transitions 356↔56 and border-radius 180 ms ease, anchored right; the text fades.
- «إنهاء»: fade and scale to .96 over 200 ms, then removal.
- Phase change: 3 pulses of scale 1→1.06→1 (900 ms in total), and the ring/text colour cross-fades 300 ms.
- If the widget is a badge when a phase changes, it expands to the bar for 5 s showing «انتهى التركيز — استراحة 5 د» or «انتهت الاستراحة — الجولة 3», then collapses again.

Transparent ("ghost") mode (setting on)
- #st-timer-float.is-ghost{opacity:var(--tm-op)}, where --tm-op is the slider value/100.
- Any pointerdown on the widget adds .is-awake (opacity 1); it is removed 3 s after the last touch. Opacity transition 250 ms.
- The widget keeps receiving taps; pen strokes never start on it.

Text and accessibility
- The time element has role="timer" and aria-live="off".
- A visually hidden role="status" announces phase changes in the same Arabic text as above.

4) BEHAVIOUR
Durations: p25 = 25/5 min, p50 = 50/10 min.
- «جاهز» creates a session: phase 'focus' (or 'open'), round 1, paused, full time (or 00:00). The view is 'bar'.
- «ابدأ» / «تابع»: running; phaseEnd = now + left (count-up: t0 = now - elapsed). This tap also unlocks Web Audio.
- «إيقاف» (pause): left = phaseEnd - now (count-up: elapsed = now - t0).
- «إعادة»: partial focus of 60 s or more is logged; then back to round 1 focus at full time (open: 00:00), paused.
- «إنهاء»: partial focus or open time of 60 s or more is logged; the session is cleared; the widget disappears.
- Automatic cycle (countdown modes): at phaseEnd a focus phase is logged (full minutes), phase becomes 'break', phaseEnd += break. At the end of a break, phase becomes 'focus', round++, phaseEnd += focus. No tap is needed, and it repeats until «إنهاء».
- Cue on each change:
  - Sound if the setting is on and the page is visible. Focus ends: three sine beeps 880, 880, 1175 Hz. Break ends: 660 then 990 Hz. Each 150–350 ms with gain ramp 0.25 and a 450 ms step.
  - navigator.vibrate?.([200,100,200]) (Android only; iPad has none).
  - The visual pulse described above.
- Reload or file switch (tabs use location.href, so the page reloads):
  - State is read from localStorage. The widget is restored at once in its saved form (bar or badge), with no animation. Time is computed from timestamps, so there is no drift.
  - The panel never opens by itself.
  - Web Audio is re-armed by the first pointerdown anywhere on the page.
- Catch-up after the tab was hidden or the iPad slept (visibilitychange, pageshow, or load):
  - If now - phaseEnd ≤ one full cycle: advance through the elapsed phases (logging focus phases) silently, and show the result in the caption.
  - If longer: log only the phases that ended within that first cycle; then pause at the start of the next focus round, with caption «توقّف المؤقت أثناء غيابك — اضغط ابدأ».
  - Count-up mode just keeps counting from t0.
- Two Safari tabs: listen to the 'storage' event on the key, re-read and re-render. Before writing a phase transition, re-read the stored phaseEnd; if another tab already advanced it, adopt its state and do not log again.
- Tick: one setInterval(1000), only while a session is active. It updates text nodes and the ring only. It is cleared when there is no session.

5) STORAGE
New device-wide key 'medixa.studytimer.v1' (not per file, so a study session continues across files). Shape:
{v:1, preset:'p25'|'p50'|'open', name:'', view:'bar'|'badge', ghost:false, op:0.4, sound:true, seen:0, hist:[{at:ISO, preset, min, name}] (last 100), s:null|{preset, phase:'focus'|'break'|'open', round, running, phaseEnd, left, t0, elapsed, startedAt, away:false}}
- Read and write with try/catch. If storage fails, keep the state in memory; the timer still works.
- Not synced to the account, and not added to the backup (device setting, low value).

6) EXISTING TIMER (v8.3)
study-timer-v83.js stays as it is: per-file key medixa.timer.v83:<file>, focus/short/long, a tab inside «أدوات الدراسة», and #mx-timer-float in the bottom dock. In compact mode its float is hidden permanently, because the toolbar button replaces it. Its study-panel tab and the backup and workspace hooks keep working.

### السبب

Not a bug; this is a feature. What exists today and why it does not meet the request:

(1) The only timer is site/js/study-timer-v83.js.
- Per file: key 'medixa.timer.v83:'+file at study-timer-v83.js:4.
- Modes focus/short/long, chosen by hand: select() at :19.
- finish() at :17 stops the timer and sets running=false. It never starts the next phase, so there is no automatic cycling.
- No count-up mode, and no transparency option.

(2) Its floating button #mx-timer-float (:13) is moved into the bottom dock (study-dock-v91.js:5). In the compact reader it is hidden unless «أدوات أخرى» is opened, by studio-compact.css:42: html body.st-compact #mx-dock:not(.st-dock-open)>#mx-timer-float{display:none!important}. So from the toolbar there is no timer at all.

(3) The toolbar is rebuilt from scratch on every tool change. studio-toolbar.js:101–102 calls root.replaceChildren() inside render(), and :226 runs M.on('tool', render). Any button another module appends to #studio-toolbar is therefore wiped. It must be re-mounted on the 'st-rendered' event that render() dispatches at :161, or created inside render().

### خطة التنفيذ

1. NEW site/js/studio-timer.js: a self-contained IIFE, about 300 lines.
- Return early if html.st-embed is set (the split second pane must not get a second timer) or if #studio-toolbar is missing.
- Constants: KEY='medixa.studytimer.v1'; P={p25:{f:25*60e3,b:5*60e3},p50:{f:50*60e3,b:10*60e3}}; CYCLE=f+b.
- load()/save(): JSON with try/catch and defaults as specified; hist trimmed to 100.
- Build once and keep the nodes:
  - btn: button.st-btn#st-timer-btn with aria-haspopup="true".
  - pop: div.st-pop.st-timerpop#st-timer-pop, hidden, role=dialog, aria-label «مؤقت الدراسة», dir=rtl.
  - float: div#st-timer-float, role=group, appended to body.
- mount(): const set=root.querySelector('.st-settings'); if(set && btn.parentNode!==set) set.prepend(btn,pop).
  - Call it now and on root.addEventListener('st-rendered',mount). The pop must stay the button's next sibling: the toolbar's outside-click handler (studio-toolbar.js:197–201) and closePops (:88) rely on that.
- btn.onclick: const open=pop.hidden; window.MedixaStudio?.closePops?.(); pop.hidden=!open; btn.setAttribute('aria-expanded',String(open)); if(open) renderPanel('main').
- renderPanel(view) for 'main', 'settings' and 'history', with the exact markup and labels in reference_details. Build it with createElement/textContent; the name and history entries are user text, so never use innerHTML for them.
- Widget renderers: renderFloat(force) switches .is-bar/.is-badge and sets --tm-op and .is-ghost. paint() updates the time, the caption and the ring dashoffset (circumference 2π·21).
- Actions: ready(), start(), pause(), reset(), end(), collapse(), expand(), exactly as in reference_details §4.
  - log(min) pushes {at,preset,min,name}.
  - Ghost wake: a pointerdown on float adds .is-awake, removed by a 3 s timeout.
- Engine:
  - advance(now): countdown catch-up with the one-cycle limit; returns whether anything changed.
  - cue(kind): sound, vibration, pulse, and auto-expanding the badge for 5 s.
  - tick(): setInterval 1000 while state.s exists; clear it otherwise.
  - visibilitychange/pageshow call advance()+paint().
  - The 'storage' event re-loads and re-renders.
  - Before writing a transition, re-read storage to avoid double-logging across tabs.
- Audio:
  - unlock() creates or resumes AudioContext (webkitAudioContext fallback) and plays a 1-sample silent buffer. Call it on start/continue, and once via document.addEventListener('pointerdown',unlock,{capture:true,once:true}) after a reload when a session is running.
  - chime(kind) uses OscillatorNode+GainNode with the frequencies given in the spec. Only when state.sound is on and !document.hidden.

2. NEW site/css/studio-timer.css
- Tokens --tm-* on #st-timer-pop and #st-timer-float.
- Panel: .st-timerpop{inset-inline-start:auto;right:0;width:320px;padding:0;background:var(--tm-bg);color:var(--tm-text);border:0;border-radius:18px} plus header, segmented, preview, ready button, rows, switch and range styles. .st-pop already sets display:flex/column, so set gap:0.
- body.st-compact .st-timerpop overrides the light compact .st-pop colours, which are set by studio-compact.css (`body.st-compact .st-pop{background:var(--reader-surface)…}`). Use the same or higher specificity: html body.st-compact #st-timer-pop.
- Widget: fixed positions for compact >720, compact with st-has-quick, ≤720 and the non-compact fallback; the bar and badge forms; ghost/awake; and the keyframes tm-pulse, tm-in, tm-out.
- #st-timer-btn[aria-expanded=true]{background:var(--reader-hover)}
- @media(prefers-reduced-motion:reduce){animation:none;transition:none}
- html.st-embed #st-timer-float{display:none!important}

3. site/pdf-notes.html
- After `<script defer src="./js/studio-compact.js?v=nw64"></script>` add `<link rel="stylesheet" href="./css/studio-timer.css?v=tm65"><script defer src="./js/studio-timer.js?v=tm65"></script>`.
- It must load after studio-toolbar.js, which is a classic script and so has already rendered. Loading after compact also places the stylesheet after studio-compact.css, so its overrides win.

4. site/css/studio-compact.css:42
- Change it to hide the old v8.3 float permanently in compact mode: html body.st-compact #mx-dock>#mx-timer-float{display:none!important}.
- Leave study-timer-v83.js untouched (backup v87 and the «فتح المؤقت» action in workspace v86 still click it).
- Note: tests/step41_dock_browser.py checks that this id is not covered, but Mohammed asked for no test runs.

5. site/sw.js: bump V (e.g. "medixa-studio20-sync63-nw65"), per the project rule. Reader files are not in SHELL, so nothing to add there.

6. CLAUDE.md (in the final step): one short line under the reader section covering:
- studio-timer.js/css;
- key medixa.studytimer.v1 (device-only, not synced, not in backup);
- modes 25/5, 50/10 and open, with automatic cycling;
- the one-cycle catch-up limit;
- transparency setting; v8.3 float hidden in compact mode;
- not tried on a real iPad.

### مخاطر

- The toolbar is re-rendered on every tool change. If the button is not re-mounted on 'st-rendered' it disappears after the first tool switch. Keep the same nodes so the panel state and listeners survive.
- The pop must stay the button's next sibling; otherwise the toolbar's global click handler closes it at once (studio-toolbar.js:200).
- The compact .st-pop rules (light background, max-height, overflow, the phone bottom-sheet rule `.st-pop:not(#st-docmenu)`) will override the dark panel unless the selectors are at least as specific. Check light/dark, portrait and phone.
- Toolbar width: compact landscape max-width is calc(100vw - 500px) = 680 px at 1180, and the pill is about 535 px today, so +44 px fits. At 980–1199 the limit is calc(100vw - 340px). Check a 1024-wide landscape.
- iOS Safari:
  - No vibration on iPad.
  - Web Audio needs a gesture-unlocked AudioContext and is muted by the silent switch / Silent mode.
  - JS timers freeze when the tab is hidden or the iPad locks, so no sound is possible in the background. The timestamp model plus catch-up keeps the time correct, but the cue only happens once he returns. Notification without an installed PWA is not reliable.
- Overlap:
  - The widget sits over the top-right of the page; ghost mode is the mitigation.
  - When the notes panel (#st-notes, z-index 18) or split view is open on the right, the panel covers the widget (z-index 16). Acceptable; it could shift by var(--st-pad-e) later.
  - In focus mode (medixa-focus) the widget stays visible, which is intended.
- Double logging across two Safari tabs: guard by re-reading phaseEnd before writing.
- The one-cycle catch-up limit pauses a long-absent session. This is intentional, but if Mohammed expects it to keep cycling it is a one-constant change.
- Two timers coexist: the new toolbar one and the v8.3 one in «أدوات الدراسة». The v8.3 float is hidden in compact mode, but its study-panel tab still exists and could confuse.

### غير مؤكد

- "Study feature" is read as the Notewise Timer, because that is the only feature the video shows.
- Custom h/m/s wheels are not built: Mohammed defined three fixed modes. If he wants the video's wheel picker exactly, a 4th segment «مخصص» with a wheel can be added later. The v8.3 study-tools timer already allows custom minutes.
- The video does not show what Notewise's sliders/settings icon contains. Putting transparency and sound there is our choice; it matches where Notewise keeps its timer options.
- The video's bar is LTR with English labels. For Arabic, the bar is mirrored (dir=rtl, collapse at the right next to the anchor). The time digits stay LTR.
- Kept the video's dark palette and orange accent, even though our compact reader chrome is white. If Mohammed prefers it to match the white pills, only the --tm-* tokens change.
- No long break after N rounds and no screen wake-lock: neither was asked for. Wake-lock (navigator.wakeLock, Safari 16.4+) would stop the iPad from sleeping mid-session; suggest it to him rather than add it.
- Whether to change navigator.audioSession.type so the chime plays in silent mode is left alone: it could interrupt his music.
- None of this can be checked on a real iPad or Apple Pencil here; Mohammed will test it himself.

الملفات: /home/user/international-students-materials/site/pdf-notes.html, /home/user/international-students-materials/site/js/studio-toolbar.js, /home/user/international-students-materials/site/js/study-timer-v83.js, /home/user/international-students-materials/site/js/study-dock-v91.js, /home/user/international-students-materials/site/js/studio-compact.js, /home/user/international-students-materials/site/css/studio-compact.css, /home/user/international-students-materials/site/css/studio.css, /home/user/international-students-materials/site/js/studio-shell.js, /home/user/international-students-materials/site/js/study-workspace-v86.js, /home/user/international-students-materials/site/sw.js, /home/user/international-students-materials/CLAUDE.md, /root/.claude/uploads/7526f635-5416-5215-8299-b5af2d64b57b/628b373e-Screenrecorder-2026-10-21-10-21-05-136.mp4, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-panel020.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-bar024.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-bar038.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-bar044.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-anim2.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-open.png, /tmp/claude-0/-home-user-international-students-materials/7526f635-5416-5215-8299-b5af2d64b57b/scratchpad/req/v5c-icons.png

## R7 — ميزة الفيديو 7

### ما يظهر

Source: native 90 fps video, 3048x2032 (about 2.6 video px per CSS px). I checked frame-by-frame at 10 fps, 30 fps and native 90 fps around the fades, and measured the red-pixel intensity of the strokes over time.
- 0.0–1.7 s: Notewise with its dark floating toolbar over the PDF "The Urinary System: Functional Anatomy and Urine Formation By the Kidneys". The LASER POINTER tool is already active. Its icon sits in a filled dark-blue circle (#134C77, about 35 px diameter). The icon is the last tool before the settings gear (…, ruler, mic, LASER, gear | chevron). Undo and redo are grey (disabled).
- 1.7–1.9 s: the user taps the already-active laser button. The "Laser pointer" popover fades in over about 200 ms (opacity only, no slide or scale). It is horizontally centred under the laser button (popover centre x = button centre x), about 7 px below the toolbar.
- 1.9–4.2 s: popover contents, top to bottom:
  - Centred title "Laser pointer", with a round close (X) button in the corner.
  - Preview panel: dark background with a faint dot grid and a red neon sine wave.
  - Three mode cards: "Dot" (tiny dot glyph), "Line" (short line glyph), "Delay" (short thick bar glyph, SELECTED: blue border, blue tint, blue text).
  - "Fade out delay" label with a value pill showing "2".
  - Stepped slider with 5 stops; the thumb (a vertical bar) is at stop 2, the filled part is light blue, and the rest of the track is dark blue with white stop dots.
  - "Color" label with "+" and "≡" icons on the opposite end.
  - Swatch row: black (ringed), red #D20001, cyan #00CDFF, green #01D101, yellow #FDC800, orange #FF7D2D, purple #9801FE, a navy swatch half cut off (the row scrolls), a thin vertical divider, then a rainbow conic "custom colour" circle.
  - No swatch shows a selection ring. Nothing is changed in this popover.
- 4.2–4.4 s: the popover fades out (about 200 ms, opacity only), probably from a tap outside. That tap leaves no laser mark.
- 5.10–6.00 s: an Apple Pencil draws a zigzag above "various hormones". The stroke appears in real time. It starts as a dot and grows with the pen, with no lag and no tail fading while drawing. Look: neon line made of a white core (about 1.5 px) between pure red edges (#FF0000, about 1.5 px each), so about 4.6 px wide in total. A soft red/pink halo extends about 8 px on each side. Constant width, round caps, no pressure. The line is drawn ON TOP of the page text.
- 6.00 s: pen lifts. The whole stroke stays at full opacity for about 0.25 s, then fades out evenly (all of it at once, not from the tail). It is gone by about 6.50 s.
- 6.90–7.70 s: second zigzag. Fully visible from 7.70 to about 7.96 (about 0.27 s), then a near-linear fade. By 8.37 s it is down to about 20 % (the fade would take about 0.45–0.5 s in total).
- 8.43 s: the pencil touches down again while the previous stroke is still faintly visible. Within one frame (8.467 s) the old stroke snaps back to FULL opacity, and the new stroke grows from there (8.47–9.07 s). The two form one long scribble.
- 9.07 s: lift. Both strokes hold for about 0.23 s, then fade TOGETHER (9.30 → 9.57 s) and disappear.
- 10.2–10.8 s: a short stroke across the heading word "Functional" (drawn over the text). It holds about 0.25 s, fades about 0.4 s, and is gone around 11.3 s.
- Throughout and at the end, undo and redo stay disabled. Laser strokes are not document content and not in history.

The same hold time (about 0.23–0.27 s after the last movement) was measured on all four strokes, so it is a fixed system delay, not the user holding the pencil still. In short, with Delay mode and value 2: hold ≈ 0.25–0.3 s, then a linear opacity fade ≈ 0.45 s.

Dot and Line modes were NOT demonstrated.

### الهدف

Mohammed wants our PDF reader (pdf-notes.html, compact iPad UI) to have the same laser pointer as Notewise, with its own button directly on the toolbar.
- What it is: a temporary pointer for showing or explaining a spot on the page while studying or presenting. It draws a glowing neon line with the Apple Pencil (or finger, following the existing input rules). The line disappears by itself shortly after lifting. If you draw again before it has faded, everything visible comes back to full brightness and fades together later.
- What it is not: it must never be saved, synced, exported or added to undo/redo.
- How the settings open: tapping the active laser button again (or holding it) opens a "مؤشر الليزر" settings sheet with the same contents as Notewise:
  - preview
  - three modes: نقطة / خط / تأخير
  - "تأخير الاختفاء" stepped slider (1–5, default 2)
  - colour swatches with a custom-colour picker
- Settings persistence: per device, in the existing styles store.

### تفاصيل المرجع

TOOLBAR BUTTON
- Icon (24 viewBox, our svg() helper with stroke 1.8): a laser-pointer "wand". A diagonal stick from bottom-left to a small circle at upper-right, with 7 short rays around the circle (none toward the stick). Suggested path:
  <path d="M4 20l9.4-9.4"/><circle cx="15" cy="9" r="2.2"/><path d="M15 3.2v1.6M19.1 4.9l-1.1 1.1M20.8 9h-1.6M19.1 13.1l-1.1-1.1M15 14.8v-1.6M9.2 9h1.6M10.9 4.9l1.1 1.1"/>
- Label: aria-label/title 'مؤشر الليزر'.
- Position: in Notewise it is the last drawing tool before settings. In our compact bar it goes right after the image button, just before «•••». Our bar order would become: undo · redo | hand · pen · highlight · eraser · lasso · select · text · image · LASER | •••.
- Active state: our existing light active pill (.st-btn.active, var(--reader-accent)). Like pen and highlight, a 7 px colour dot in the corner shows the laser colour.
- Tapping the active laser button again, or long-pressing it for 500 ms, opens the sheet. No quick bar (#st-quickbar) appears under the toolbar for the laser; in the video no sub-bar appears.

SETTINGS SHEET (#st-toolset, group 'laser'): Notewise sizes in CSS px, top to bottom; our compact sheet is 356 px wide.
1. Header (about 40 px):
   - Centred title 'مؤشر الليزر' (15 px, medium).
   - Round close button in the corner, 23 px circle (hit area 44 px), aria-label 'إغلاق'.
2. Preview panel (about 104 px tall, full width, radius 12):
   - Dark background #1D1E22 with a dot grid (dots #3D3E42, 1 px, every 38 px).
   - Content: one sine wave spanning about 185 px horizontally, centred, amplitude about 13 px, drawn with the real laser renderer in the current colour.
   - Per mode: Delay = full wave. Line = the same wave with opacity rising from 0 at the start to 1 at the end (a comet). Dot = one glowing dot.
3. Mode cards, 3 equal (about 92×57 px, gap about 10 px, radius 11):
   - Unselected: transparent background, 1 px border #4A4B4F.
   - Content: a tiny glyph on top, then a 13 px label below.
     - 'نقطة' (Dot): 3 px dot.
     - 'خط' (Line): 16×2.5 px rounded bar.
     - 'تأخير' (Delay): 16×4 px rounded bar.
   - Selected: background #1E365A, 1.5 px border #5D9BFE, glyph and label #5F9EFF. In our light theme, reuse the .ts-seg pressed style (teal), with role=group and aria-pressed.
4. Row 'تأخير الاختفاء' (only in Delay mode; hide it for Dot and Line):
   - Label on the start side.
   - Value pill on the end side: about 61×29 px, radius 15, background #26292E in Notewise (var(--ts-soft) for us), number centred, 13 px, tabular numerals.
5. Stepped slider (input type=range, min 1, max 5, step 1, default 2, full width minus about 16 px each side):
   - Track 7 px tall.
   - Filled part (start to thumb): #619BFE (our teal).
   - Rest of the track: #134A73 (light theme: var(--ts-line)).
   - White stop dots at 0/25/50/75/100 %.
   - Thumb: a vertical bar about 3×19 px.
6. Colour section, header row 'اللون':
   - Notewise also shows "+" (add to palette) and "≡" (manage palette). We have no palette management, so omit these two.
   - Swatch row: 8 circles, 18.5 px drawn, 35 px pitch, 44 px hit targets, in this order:
     - #000000 'أسود' (with a 1 px ring)
     - #FF0000 'أحمر' (the video swatch reads #D20001, but the drawn laser is pure #FF0000; use #FF0000 so the default is visibly selected)
     - #00CDFF 'سماوي'
     - #01D101 'أخضر'
     - #FDC800 'أصفر'
     - #FF7D2D 'برتقالي'
     - #9801FE 'بنفسجي'
     - #141950 'كحلي'
   - Then a 1 px × 19 px divider, then the rainbow conic circle = our existing .ts-custom colour input (label 'لون آخر').
   - Selected swatch: our existing ring (.ts-sw[aria-pressed=true]).
- Open/close animation: opacity 0→1 over 200 ms ease-out on open, and 1→0 over 200 ms on close (no translate). Sheet is centred under the laser button (the existing place()). On phones it is a bottom sheet (existing CSS).

DRAWING BEHAVIOUR
- Rendering (all sizes in screen CSS px, independent of zoom; canvas px = css × k where k = pg.ink.width / pg.totW):
  - path through the points with midpoint quadratic smoothing, lineCap and lineJoin round
  - pass 1: strokeStyle = colour, lineWidth 4.6, shadowColor = colour, shadowBlur 9 (gives the pink halo, about 8 px)
  - pass 2: strokeStyle #FFFFFF, lineWidth 1.6, no shadow
  - opacity through globalAlpha
  - a single tap = a dot (the round cap)
  - drawn on the page's overlay canvas (canvas.over, above the PDF, the ink and the sharp ink-hd layer)
  - points stored as page fractions (u,v), so strokes move with the page when scrolling or zooming
- Delay mode (default, the one in the video):
  - Pen down: create a stroke; if any earlier laser strokes are still visible (holding or fading), set them all back to opacity 1 instantly. Fully faded strokes are discarded first.
  - While down: the whole stroke is at opacity 1 and grows live.
  - Pen up: start the timer. Hold for HOLD(delay), then fade all session strokes together linearly from 1 to 0 over 450 ms, then remove them.
  - HOLD table (ms): 1→150, 2→300 (matches the video), 3→800, 4→1500, 5→3000.
- Line mode (inferred, not shown): only a comet tail is visible. Each point has a timestamp; segments fade by age (alpha = 1 − age/380 ms), so the tail follows the pen. After lift the remaining tail fades within 380 ms.
- Dot mode (inferred, not shown): only a glowing dot (radius 2.6 px colour with shadowBlur 9, plus a 1 px white core) at the current pen position while down. It fades out over 150 ms after lift.
- Never saved: no S.items, no S.hist, no markDirty, no save-status change, not synced, not exported; undo stays as it was.
- Input: the same rules as every other tool.
  - Apple Pencil always draws.
  - A finger draws only when finger drawing is allowed. In stylus mode one finger scrolls.
  - Two fingers pan and zoom.
  - Palm rejection discards the laser stroke immediately (cancelled).
- Labels (Arabic):
  - tool: 'مؤشر الليزر'
  - sheet title: 'مؤشر الليزر'
  - modes: 'نقطة' / 'خط' / 'تأخير', group aria-label 'نوع المؤشر'
  - slider: 'تأخير الاختفاء'
  - colour: 'اللون', custom 'لون آخر'
  - close: 'إغلاق'

Notewise dark tokens, in case Batch B makes the sheets dark like Notewise:
- sheet background #1D1E22; title #E1E2E6; labels #BEBFC3
- card border #4A4B4F; selected card #1E365A with border #5D9BFE and text #5F9EFF
- value pill #26292E; slider fill #619BFE, track #134A73, stop dots #C9E7FF
- close button background #2B2C30, icon #8E8D92
- divider #4B4C51; toolbar active circle #134C77

Layouts:
- iPad landscape: the button is on the top bar and the sheet floats under it.
- iPad portrait (721–899 px): same compact bar (about 12 buttons fit in 820 px).
- Phone (≤720 px): primary is the first 3 tools, so the laser lives in «المزيد ← أدوات أخرى». When it is active it shows on the bar as .st-extra. The sheet is the existing bottom sheet. In the phone colour popover the stroke-size controls are hidden for the laser.

### خطة التنفيذ

1. Engine settings and hooks, site/js/studio-ink.js:
   a) DEF_STYLES (line 34): add `laser: { color: '#ff0000', mode: 'delay', delay: 2 }`.
   b) cleanStyle (line 43): add
      `if (g === 'laser') { o.mode = ['dot','line','delay'].includes(v.mode) ? v.mode : 'delay'; o.delay = Math.round(num(v.delay, 1, 5, 2)); }`
      (the colour is already handled by the generic `'color' in d` branch).
   c) GROUPS (line 114): add `laser: 'laser'`. S.color and M.style('laser') then resolve to the laser style; setStyle('laser', …) saves to medixa.studio.styles.v1.
   d) beginTool (line 612), custom-tool branch: do not mark the document as editing for passive tools, i.e. `if (!TOOLS[tool].passive) setState('editing');`. Otherwise every laser stroke flashes «يجري التحرير…» and makes pdf-sync editorBusy() (pdf-sync.js:91) return true.
   e) stateFor (line 520): return 'drawing' for 'laser'.
2. New module site/js/studio-laser.js, loaded in pdf-notes.html as a normal script right after studio-tools.js and before studio-toolbar.js, e.g. `<script src="./js/studio-laser.js?v=laser1"></script>`.
   a) It calls `M.registerTool('laser', { passive: true, down(pg,e,p), move(pg,e,p), up(pg,e,cancelled,p) })`. The engine already routes stylus, finger, palm and two-finger handling to custom tools (beginTool, moveTool with coalesced events, endTool with cancelled).
   b) State:
      - `strokes = [{ pg, pts: [[u,v,t]], color, mode }]`
      - `cur` (the stroke being drawn)
      - `liftAt`
      - one rAF handle
   c) down:
      - prune strokes whose alpha is 0
      - in delay mode, revive the remaining ones (clear liftAt, so alpha = 1)
      - push a new stroke with the current M.style('laser') colour and mode
      - M.paint(pg) and start the loop
   d) move: append the point when it is 0.8 CSS px or more from the last one (use pg.cssW/cssH); M.paint(pg).
   e) up:
      - if cancelled, drop `cur` immediately
      - otherwise set liftAt = now()
      - start the loop
   f) alpha(t), delay mode: 1 while drawing; after liftAt, 1 until HOLD[delay] = [_,150,300,800,1500,3000][delay], then 1 − (t − liftAt − HOLD)/450, clamped at 0.
   g) Line mode: per-segment alpha = 1 − age/380. Dot mode: draw the last point only; 150 ms fade after lift.
   h) `M.on('overlay', ({pg, ctx}) => …)`: draw every stroke with s.pg === pg in canvas coordinates via pg.px(u,v), with k = pg.ink.width / pg.totW:
      - colour pass: lineWidth 4.6k, shadowBlur 9k, shadowColor = colour
      - white core pass: 1.6k, no shadow
      - ctx.save/restore around each stroke
   i) rAF loop: each frame, M.paint() every page that has laser strokes. Remove strokes that have fully faded and paint their page one last time to clear. Stop when nothing is visible and no pen is down. The loop runs while the pen is down only in line and dot modes; in delay mode move() already paints.
   j) Export `M.laser = { preview(ctx, cw, ch, d, style) }` so the settings preview uses the same renderer. Do not touch S.items, S.hist, markDirty or setState.
3. Toolbar, site/js/studio-toolbar.js:
   a) TOOLS (line 11): append `{ id: 'laser', name: 'مؤشر الليزر', icon: <path above> }`. Saved orders get it appended automatically via load() at line 32.
   b) SETG (line 50): `laser: 'laser'`. TITLES (line 51): `laser: 'مؤشر الليزر'`.
   c) Add `LASER_COLORS = [['#000000','أسود'],['#ff0000','أحمر'],['#00cdff','سماوي'],['#01d101','أخضر'],['#fdc800','أصفر'],['#ff7d2d','برتقالي'],['#9801fe','بنفسجي'],['#141950','كحلي']]`.
   d) render() line 105: add 'laser' to the compact primary filter list. After the compact `tools.append(img)` (line 153), move the laser button to the end: `const lb = tools.querySelector('[data-tool="laser"]'); if (lb) tools.append(lb);`.
   e) quickOn() (line 100): exclude the laser (`&& S.tool !== 'laser'`) so no quick bar appears.
   f) Line 121: hide sizes and the width slider for the laser as well as for text.
   g) sync() (line 214): include 'laser' for the --tool-c dot.
   h) build(g) (line 333), new branch `g === 'laser'`:
      - give the preview canvas the class 'ts-laserprev'
      - `sec('').append(seg('نوع المؤشر','lmode',[['dot','نقطة'],['line','خط'],['delay','تأخير']], () => sty().mode || 'delay', v => put({ mode: v })))`, with a small glyph span per button (.ts-lglyph[data-g])
      - a delay section: label 'تأخير الاختفاء' plus a value pill (output) plus a range 1..5 step 1 writing put({ delay: v }); register in upd a function that hides the section unless the mode is 'delay' and re-reads the value
      - `sec('اللون').append(colors(LASER_COLORS))`
   i) paintPreview (line 488): when g === 'laser', call `M.laser && M.laser.preview(ctx, cw, ch, d, s)` instead of M.drawStroke.
4. CSS, site/css/studio-settings.css (or studio-compact.css for compact-only rules):
   - add `[data-tool=laser]` to the ::before dot selector at line 116
   - `.ts-preview.ts-laserprev{height:104px;border-color:#1d1e22;background:#1d1e22 radial-gradient(circle,#3d3e42 1px,transparent 1.5px) 0 0/38px 38px}`
   - .ts-lglyph styles (dot 3 px; line 16×2.5; bar 16×4; currentColor)
   - the delay row: value pill 61×29 radius 15; range with stop dots via a background linear-gradient fill plus radial dots at 0/25/50/75/100 %
   - `#studio-toolbar .st-toolset:not([hidden]){animation:ts-fade .2s ease-out}` with @keyframes ts-fade from opacity 0. Skip if Batch B already adds a sheet animation; it must not run with reduced motion.
5. Versions:
   - studio-ink.js, studio-toolbar.js and studio-settings.css (and studio-compact.css if touched): ?v=laser1 in pdf-notes.html
   - the new studio-laser.js tag: ?v=laser1
   - sw.js: bump V (for example append '-laser1')
   - No sw SHELL change; studio files are not in SHELL.
6. Docs: add a short CLAUDE.md line under the reader section, in the final step:
   - laser = studio-laser.js, a passive custom tool
   - never saved or in history
   - style key styles.laser {color, mode, delay}
   - HOLD table
7. No new automated tests (owner's explicit instruction: «لا اريد منك فحوصات»). Mohammed will try it on his iPad.

### مخاطر

- Performance on iPad. Each laser frame clears and repaints the page's whole overlay canvas (up to 4 MP on touch devices, MAX_PX) and uses shadowBlur. With a few strokes this is fine. If it stutters, draw the glow as two extra wide translucent passes (width 12 px at alpha .18, then 8 px at alpha .3) instead of shadowBlur, and only run rAF while something is fading.
- Overlay sharpness at high zoom. The overlay canvas does not get the sharp ink-hd treatment, so at high zoom the laser is drawn at the overlay's capped resolution and may look slightly soft (acceptable for a glow).
- Save-status flicker. Without the `passive` change in beginTool (studio-ink.js:612), every laser stroke flips the save status to «يجري التحرير…» and marks pdf-sync as busy. Easy to miss.
- Quick bar. If SETG gets 'laser' but quickOn() is not changed, a pen-style quick bar (sizes/colours) would appear under the toolbar for the laser.
- Page bounds. Laser points are clamped to the page plus its margins (posOf), so the laser cannot cross the grey gap between pages. A stroke stays on the page where it started (pointer capture). This matches how other tools behave.
- Palm rejection is heuristic. A rejected palm touch cancels the stroke, which is right; the laser just vanishes.
- Saved toolbar orders. Users with a saved custom toolbar order get the laser appended at the end. The compact bar puts it after the image button, so it is visible there. On phones it sits in «المزيد».
- Colour mismatch. The red swatch value (#FF0000) differs slightly from the swatch sampled in Notewise (#D20001). I chose this on purpose so the default looks selected and matches the drawn colour.

### غير مؤكد

- Dot and Line modes were not demonstrated; only Delay was used. Their behaviour (a glowing dot that follows the pen; a fading comet tail) is inferred from the labels and glyphs. Whether the «Fade out delay» row hides in those modes is also inferred.
- The meaning of the delay number is unknown. Value 2 measured as hold ≈ 0.25–0.3 s plus a linear fade ≈ 0.45 s. The 1–5 mapping (150/300/800/1500/3000 ms hold) is a design choice that reproduces the measured value 2.
- How the popover was closed (tap outside vs tapping the button again) is not visible. I assume our existing outside-click close.
- Notewise's "+" (add colour) and "≡" (manage palette) have no equivalent in our app and are omitted. The rainbow circle maps to our custom-colour input.
- Whether Notewise laser width scales with zoom is unknown (the page was never zoomed). I specified a constant screen width.
- Whether laser strokes stick to the page or the screen when scrolling is unknown (no scroll in the video). I specified page-anchored.
- The exact CSS px scale of the recording (3048×2032, aspect 1.5) is estimated at about 2.6 video px per CSS px, so the sizes are ±10 %.
- The navy swatch (#141950) was half hidden behind the scroll edge, so its value is approximate.

الملفات: /home/user/international-students-materials/site/js/studio-ink.js, /home/user/international-students-materials/site/js/studio-toolbar.js, /home/user/international-students-materials/site/js/studio-tools.js, /home/user/international-students-materials/site/js/studio-smart.js, /home/user/international-students-materials/site/css/studio-settings.css, /home/user/international-students-materials/site/css/studio-compact.css, /home/user/international-students-materials/site/css/studio.css, /home/user/international-students-materials/site/pdf-notes.html, /home/user/international-students-materials/site/sw.js, /home/user/international-students-materials/site/js/pdf-sync.js, /home/user/international-students-materials/CLAUDE.md
