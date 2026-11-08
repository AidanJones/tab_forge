# Kindle Scribe compatibility review

Reviewed 8 November 2026.

Amazon's Scribe guide confirms JavaScript, SSL and cookies, but does not provide
an API compatibility table for Web Audio, microphones, Web MIDI, workers, WebGL
or IndexedDB. It does not establish that the full practice player works. ReKindle
separates modern Chromium Kindles (its stated firmware boundary is 5.16.4) from
older ES5/WebKit builds and provides a capability probe. Firmware-specific API
claims need device testing rather than assumptions based on the Kindle name.

Sources:

- [Amazon Scribe guide, Web Browser](https://d1ergij2b6wmg5.cloudfront.net/kug/kindle_scribe_2024/v1/en-US/html/kug.html)
- [ReKindle compatibility/build targets](https://github.com/ReKindleOS/ReKindle/blob/main/README.md#building--deployment)
- [ReKindle website](https://rekindle.ink/)
- [alphaTab headless SVG rendering](https://docs.alphatab.net/docs/guides/nodejs)

The original app depends on modern modules and syntax, CSS grid/custom properties,
Web Audio and worker-based score playback; it also imports Three.js for the hand.
Its scrolling play-along and continuously updated microphone meter cause frequent
repaints. A monochrome stylesheet alone would leave these execution and e-ink
refresh problems unresolved.

The implemented Kindle reader is a separate static entry, copied from `public`
without Vite injection or module loading. It uses ES5, XHR, normal DOM methods,
block/table CSS, high contrast and 50px controls. It does not copy ReKindle code.
ReKindle informed the compatibility strategy, not the implementation.

The initial catalogue is roughly 132 KB rather than the full metadata bundle;
resource details are requested per song. Only six catalogue rows are shown per
page. Filters apply explicitly, and navigation does not use animation, hover,
colour-only meanings or a continuously running timer. The natural-note map is
split into fret ranges. Scale roots carry an R and a black background; thick
borders identify selected-pattern notes. The fifths reference uses a static table.

Score layout runs on the laptop through alphaTab's headless SVG renderer. Guitar/bass parts are preferred over vocals and percussion; the full app still
offers all tracks. Each
track/notation combination has a small manifest and separately requested systems.
SVG viewBoxes allow scaling; the music font uses WOFF, with a plain text fallback
for font/rendering trouble. Production builds emit the same data/pages and need
no runtime rendering server. The development reader validates score IDs against
the fixed local folder and has no write endpoint. Personal score files remain
ignored by Git.

Focus score removes setup and navigation chrome, keeping explicit system turns.
It makes no claim to force the Kindle's panel refresh. The plain tab fallback is
intentionally labelled as first voice without full rhythmic/technique semantics.

Laptop IndexedDB projects are not available on another device. Users download
scores to the shared score folder. Kindle notes/bookmarks use guarded localStorage
and remain separate. Storage denial must not prevent browsing or reading.

Validation covers catalogue filtering/detail navigation, local notes, scale and
riff page turns, note/fifths references, score rendering/track selection/focus/plain
fallback, feature diagnostics, no heavy player requests, denied browser APIs,
production assets and regressions in the full editor/practice navigation.
These are browser simulations, not a physical Scribe or old-WebKit certification.
The remaining device check is to load the Network URL, verify text/music glyphs,
page-turn responsiveness, local note persistence and touch targets. Audio/mic/
MIDI/3D support on the Scribe remains unverified and is not required by the reader.


After adding a larger GP4 collection, preparation moved into isolated Node workers
with per-track time limits. Failed legacy parts produce a readable error asset
rather than blocking the build. This is server-side work; the Kindle still uses
no worker API. Very dense bars can still need the plain-tab fallback.
