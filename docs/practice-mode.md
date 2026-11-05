# Practice mode: repository review and integration plan

Reviewed 5 November 2026 against the supplied Practice Mode Spec. This document
records the review, proposed architecture and implementation status below.
Updated after the user's follow-up authorising improvements to the data model,
including adoption of alphaTab formats. That supersedes the original spec's
requirement to retain the old model unchanged.

## Current application

- Browser: a single `index.html` containing HTML, CSS and vanilla JavaScript. No
  framework, package manifest, build step, backend or audio engine.
- PDF tools: Python with ReportLab (`requirements.txt`). `markdown_tab_parser.py`
  converts lesson markdown to ASCII tab and feeds `GuitarTabPDF` in `tab_to_pdf.py`.
  Chord/scale generation and printable fretboards live in the Python tools.
- Browser model: `parseMarkdown()` returns `{metadata, chords, sections}`.
  Metadata recognises key, tuning, title and artist. Chords are compact strings
  such as `x32010`, ordered low E to high e. Sections contain a name, optional
  chord label and raw content lines. Notes are parsed temporarily as
  `{fret, string}`; string 1 means high e. The Python parser uses the same broad
  structure and `(fret, string)` tuples, but is an independent implementation.
- Source format: handwritten markdown, including `3f1s`, `0s3`, chord shorthand,
  `+` groups, lyrics and annotations. There is no timed score model: no explicit
  note duration, rests, meter, tempo, ties, voices or capo. Tuning is currently a
  text label rather than a validated list of pitches.
- Persistence/export: the browser encodes source in a `?tab=` URL and offers a
  share-link button. There is no local draft storage or source-download button.
  Python reads markdown and writes PDFs; direct ASCII-to-PDF is also available.
  The browser has print styles. Neither implementation exports Guitar Pro,
  MIDI or alphaTex today.

Preserve access to existing documents and the Python PDF workflow, while moving
the browser's musical representation to alphaTab's timed score model. Treat the
current markdown as a legacy import format rather than adding another notation
language for new timed documents.

## Findings to address before editor-to-player conversion

| Priority | Location | Finding and consequence |
| --- | --- | --- |
| P1 | `index.html:415`, `:430` | `notesToTab()` uses `6 - i` while labels run high-to-low. `3f1s` prints on low E. Chord shorthand uses the correct reversal for its different low-to-high input array, so the two paths disagree. |
| P1 | `index.html:405`; `markdown_tab_parser.py:172` | Splitting on whitespace before parsing `+` makes the documented `2f5s + 2f4s` two sequential notes. The unspaced version is simultaneous. Playback would inherit incorrect chords without a proper tokenizer. |
| P1 | `index.html:555-556` | Key and tuning are interpolated without HTML escaping into `output.innerHTML`. User-controlled metadata from a shared URL can insert active markup. Escape these fields as title and artist already are. |
| P2 | `markdown_tab_parser.py:114` | A blank line ends section collection; following notes and annotations before the next section header are silently discarded. Browser parsing retains them. |
| P2 | `index.html:467-474` | `chordToTab()` ignores parsed custom definitions. A custom chord can have a diagram but cannot supply the corresponding browser tab or playback notes. Resolve custom definitions before the built-in library. |
| P2 | `index.html:725` | `URLSearchParams.get()` already decodes the value. The additional `decodeURIComponent()` breaks a shared source containing a literal `%` and can change percent-like text. |
| P2 | `index.html:401-449` | Browser tab columns do not pad all strings to the width of multi-digit frets. A `12` shifts subsequent notes out of alignment with other strings. Never derive playback rhythm from this rendered output. |

Verification: executed the existing browser functions in Node's VM with minimal
DOM stubs. Reproduced reversed strings, spaced chord splitting, unescaped metadata
in generated HTML, missing custom-chord lookup and percent decoding failure.
Executed the Python parser class in isolation to reproduce spaced chord splitting
and dropped content after a blank line. For that isolation, bypassed chord-library
detection on numeric inputs only. Full Python/PDF checks were unavailable because
ReportLab is not installed. No browser audio or phase acceptance checks were run;
there is no player yet. No existing automated test suite was found in tab_forge.

## alphaTab capability check

The linked official docs support the proposed dependency. These are documentation
checks, not proof of playback accuracy in this app. Pin an exact npm version and
check its packaged API before implementation: search results include both current
and `next` documentation, and interaction settings differ between releases.

| Spec claim | Checked result |
| --- | --- |
| Guitar Pro, MusicXML and alphaTex input | Supported, including `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp`. Not arbitrary ASCII tabs. See the [official project](https://github.com/CoderLine/alphaTab) and [introduction](https://alphatab.net/docs/introduction). |
| Notation/tab rendering and synth | Supported. A compact Sonivox General MIDI SoundFont is bundled; it is not a promise of realistic recorded guitar tone. See [custom SoundFonts](https://alphatab.net/docs/features/play-sync/custom-soundfonts). |
| Slowdown | `playbackSpeed` is a multiplier: `0.5` means 50%, not `50`. Bind UI 25-150% to `0.25-1.5`. See [playbackSpeed](https://alphatab.net/docs/reference/api/playbackspeed). |
| Loop range | `playbackRange` uses MIDI ticks and `isLooping` enables repetition. Current docs expose drag range selection. Bar snapping needs explicit mapping and tests; do not assume pixel selection is already a whole-bar loop. See [playbackRange](https://alphatab.net/docs/reference/api/playbackrange) and [range selection](https://demos.alphatab.net/docs/features/interact/range-selection). |
| Interaction settings | Docs for 1.9 introduce `enableSeekToClick`, `enablePlaybackRangeSelection`, `resetPlaybackRangeOnClick`; `enableUserInteraction` is deprecated there. Use settings available in the pinned release. See [interaction](https://www.alphatab.net/docs/features/interact/enabling-and-disabling-interaction). |
| Count-in, metronome, track controls | API exposes `countInVolume`, `metronomeVolume`, `renderTracks`, `changeTrackMute` and `changeTrackSolo`. Rendered tracks and audible tracks are separate concerns. See [API reference](https://alphatab.net/docs/reference/api/playbackspeed). |
| Beat events | `playedBeatChanged` reports a played beat; `activeBeatsChanged` includes beats across tracks/voices. Filter to the selected guitar staff. A beat event alone is not a complete sounding-note ledger for ties, note-off timing or effects. See [activeBeatsChanged](https://alphatab.net/docs/reference/api/activebeatschanged). |
| Guitar Pro export | Confirmed: `Gp7Exporter.export(score, settings)` returns bytes for GP7+ `.gp`, not `.gp5`. See [Gp7Exporter](https://www.alphatab.net/docs/reference/types/exporter/gp7exporter/). |
| Reverse alphaTex path | `AlphaTexExporter.exportToString()` exists. This exports alphaTab's score, not tab_forge markdown; a separate supported-subset reverse converter is still needed. See [AlphaTexExporter](https://www.alphatab.net/docs/reference/types/exporter/alphatexexporter). |

No claim of drift-free looping is established by these docs. Verify it with real
playback, including tempo changes, count-in, rests and repeat boundaries.

## Reuse from awen

Inspected `C:/Users/aidan/repos/awen/index.html`, especially `AudioAdapter`
(lines 331-406), its UI handlers and browser tests.

Useful patterns to adapt:

- User-gesture audio startup, suspended-context feedback and bounded startup
  failure handling (`unlock`, line 360).
- Request/generation guards to prevent an asynchronous Start from winning after
  Stop (`start`/`stop`, lines 361-362).
- Explicit cleanup and page lifecycle handling (`dispose`, line 406;
  `pagehide`, line 697), plus a visible volume/mute control.
- Browser tests that distinguish initialized audio, running transport and actual
  nonzero output (`tests/audio.browser.cjs`). Sample activity does not establish
  musical quality or synchronisation by itself.

Do not copy its synthesizer, composition engine or `update()` scheduler. Awen
generates adaptive background music and skips missed beats after backgrounding
(line 403). That policy is unsuitable for preserving a practice score's position.
alphaTab should own the score timeline, synth, soundfont and audio context. Adapt
the lifecycle ideas through its public API. Awen's custom limiter assumes ownership
of its Web Audio graph; it is not a drop-in alphaTab output component.

The supplied spec concerns synthesised tab playback. Slowing an actual MP3 or
recording while preserving pitch and aligning it to the score is a separate
feature; neither this plan nor the reviewed Awen renderer supplies that workflow.

## Integration architecture

Suggested small modules, without a framework rewrite:

```text
legacy markdown -> migration importer ----+
future ASCII importer -------------------+--> score service (alphaTab Score)
Guitar Pro / MusicXML / alphaTex ----------+          |           |
                                                    v           v
                                           score editing     practice player
                                                    |           |
                                                    v           v
                                           alphaTex / .gp    fretboard

versioned tab_forge project = score document + learning notes + practice settings
existing markdown -------------------------> existing Python PDF workflow
```

Keep alphaTab dependencies inside a small score service and player adapter. The
score service owns its `Score` object, loading, editing, validation and exports.
The player adapter wraps file
loading, alphaTex loading, readiness/errors, play/pause/stop, speed, loop range,
count-in, metronome, track selection/mute/solo, export and disposal. Emit plain
app events for status, range, position and active note data. UI components issue
score commands and receive view data rather than mutate alphaTab objects directly.
Use one authoritative runtime score, with its own tracks/staves/bars/voices/beats/
notes, durations, rests, tempo changes, tuning and capo. Do not maintain competing
musical models or use a separate timer to advance notes. Finalise and reload
edited scores through the supported APIs of the pinned alphaTab release.

Load the practice modules on demand. Serve the app over localhost/HTTPS rather
than relying on `file://`. Self-host pinned alphaTab runtime assets, workers,
fonts and SoundFont together; preserve bundled licence notices. A small package
manifest/build or asset-copy step is reasonable, but React and a server API are
unnecessary. Keep imported scores local and retain original files; never funnel
an imported multi-track score through the lossy existing text model merely to
play it. Surface file/asset errors and disable Play until score and synth are ready.

### Native formats and persistence decision

Use alphaTab's `Score` as the runtime musical model and alphaTex as the normal
text notation for new scores. It already describes rhythm and instrumental
structure; a new `3f1s:8` dialect would add a second language and converter to
maintain. Keep lesson notes and practice settings outside the score when they
are not musical notation.

| Purpose | Format / representation |
| --- | --- |
| Runtime musical state | alphaTab `Score`, owned by the score service. |
| Text authoring and score interchange | alphaTex, parsed/exported by alphaTab. |
| Guitar Pro interoperability | Import supported Guitar Pro formats; export GP7+ `.gp`. |
| Complete saved lesson | A versioned tab_forge project containing score payload, lesson notes, explicit rhythm provenance and practice settings. |
| Old files and share URLs | Explicit legacy-markdown importer; retain the source and show migration diagnostics. |
| Python PDF workflow | Continue accepting original markdown. Do not imply it accepts alphaTex or new projects; a new browser score-print path can serve those documents. |

Do not make alphaTab's internal JSON the durable file format. Its
[low-level API documentation](https://docs.alphatab.net/docs/guides/lowlevel-apis)
explicitly warns that serialized model JSON is not guaranteed compatible across
versions and should not be used for long-term persistence. It can be a disposable
cache tagged with the exact dependency version.

The project envelope should have its own `schemaVersion`, plus the alphaTab
version used to write it. Use a discriminated score payload (`alphaTex` text for
new authored scores; `.gp` bytes when needed for an imported arrangement), with
one authoritative saved payload per project. Retain original import bytes as
source material. Before converting imported scores to alphaTex, verify semantic
round trips for their features; neither alphaTex nor `.gp` should be advertised
as a universally lossless conversion. Make unsupported constructs visible and
preserve the unmodified source for recovery.

App-owned fields should include lesson notes, import diagnostics, whether rhythm
was supplied or inferred, loop/speed preferences and finger overrides. Define
score-location references and an invalidation/remapping policy when structural
edits move or delete their target beats; do not persist alphaTab-generated object
IDs as if they were durable IDs. Version and test project migrations.

### Legacy migration and alphaTex mapping

The existing shorthand remains useful for quick entry and old files, but becomes
an importer or editor input mode feeding the runtime score. It is no longer the
source of truth for newly saved timed scores.

| Existing/source concept | Converter contract |
| --- | --- |
| `3f1s` | alphaTex fret/string `3.1`; preserve source string 1 as the highest string. In alphaTab 1.9, in-memory `Note.string` instead numbers from the lowest string: map with `stringCount + 1 - sourceString` when accessing the model directly. |
| `2f5s + 2f4s` | One simultaneous beat, e.g. alphaTex `(2.5 2.4).4` for quarter duration; whitespace around `+` must be accepted. |
| Chord name | Resolve source custom definitions, then built-in shapes; expand into one beat. A muted/unplayed string is not an open-string note. |
| Duration/rest | Use native alphaTex duration/rest constructs for new text scores. For legacy input, record the chosen assumptions and validate resulting bar totals rather than silently losing notes. |
| Tuning | Resolve `standard` to actual pitches; custom tunings need octave-qualified pitches and explicit string order at the wrapper boundary. Reject unknown labels instead of playing standard tuning silently. |
| Capo | Map explicit staff capo once; keep displayed frets relative to capo and test sounding pitch to avoid double transposition. |
| Lyrics/annotations | Retain source; map supported annotations without treating them as notes. Escape alphaTex strings independently of HTML escaping. |
| Legacy untimed lines | Require or show an assumed tempo and default duration, with a visible draft-rhythm warning. Existing markdown, like ASCII tabs, lacks reliable rhythm. |

Do not require a reverse converter into the legacy markdown. Round-trip assertions
for the new formats compare tracks, voices, strings, frets, simultaneous groups,
durations, rests, tempo/meter, tuning and capo semantically, not text formatting.
Add fixtures for supported effects, repeats and annotations as they enter scope.
An alphaTex exporter does not make arbitrary Guitar Pro scores losslessly
representable, so gate conversions on tested compatibility.

## Phased delivery and acceptance

1. **Player view:** add the Practice panel beside the existing editor. Load local
   Guitar Pro by picker/drop; include the full specified transport, 25-150% speed,
   drag loop selection, track selector and mute/solo. Add an original demo score
   so it works without downloading a copyrighted song. Shortcuts must ignore
   editor inputs and editable controls; prevent Space scrolling only when handled.
   Test unsupported/corrupt files, missing assets, repeated imports and audio
   startup/cleanup. Manually play a user-provided `.gp5` at 50% over many loops;
   test beat/bar boundaries, repeats and tempo changes before calling phase 1 done.
2. **Score-model migration:** fix parser findings with small regression tests,
   implement legacy import and native alphaTex authoring, and add “Practise this”.
   Use alphaTab's score as the runtime model and introduce the versioned project
   save/open path with legacy source retention and clear conversion diagnostics.
   Test high/low strings, multi-digit frets, spaced chords, custom chords, rests,
   bar totals, tuning and capo through alphaTab's actual parser. Add `.gp` export
   and supported-subset round trips, including save/reopen and schema migrations.
   Clearly label assumed rhythm on old sources. Keep original markdown files and
   share links readable; keep the old Python PDF commands working independently.
3. **ASCII import:** tokenize aligned string blocks without destroying column
   offsets; handle multi-digit frets as one token, bass/four strings, bar lines and
   technique marks. Mark inferred rhythm, retain annotations and source, and
   explicitly flag techniques not yet represented. Provide an editable imported
   score through the same score service before playback. Use at least ten small original fixtures, including
   uneven spacing and malformed input; do not commit copyrighted tabs.
4. **Fretboard:** filter playback events to the chosen staff, show current and
   upcoming notes, and support handedness/fret range/note names. Derive upcoming
   beats from playback order including repeats and loop wrap, not just the next
   array element. Clear state on stop/seek/import, handle ties/sustains and rests,
   and verify sync manually at 25%, 50%, 100% and 150% across loop boundaries.
5. **Fingering then hand:** store explicit finger overrides before attempting
   automatic assignment. Deliver numbered fingertips first; only then evaluate
   sequence optimisation and an optional 3D hand. Neither blocks useful practice.

Ship and verify each phase before starting the next. Phase 1 can proceed without
the editor migration; phase 2 cannot claim correct rhythm without explicit timing
or clearly identified timing assumptions for legacy sources.
Record what works, remaining limitations and observed alphaTab differences at
each phase boundary. The status below supersedes the initial review-only state.

## Implementation status: browser player and local score library

The first player slice lives in `practice.html`, linked from the existing editor.
`practice/alpha-tab-player.js` wraps alphaTab 1.9.0 and owns the runtime Score;
`practice/main.js` handles UI state, inputs and keyboard/file actions. The original
editor and Python tools remain intact. Vite's official alphaTab plugin serves
and copies the local worker/worklet, font and SoundFont assets. Dependencies are
pinned in `package.json` and `pnpm-lock.yaml`.

Implemented: picker/drop imports, original two-track alphaTex demo, transport,
25–150% speed, selected-range looping, beat/bar snapping, explicit bar range
selection, track display, mute/solo, count-in, metronome, volume and shortcuts.
Bar snapping uses alphaTab's playback-order tick cache, including repeats.
Audio is started by a user gesture and stopped on page exit. The score rendering
uses alphaTab's lazy rendering; scroll the score viewport into view to render it.

Place local scores directly in `public/scores/`. The Practice page loads the
catalog automatically and **Refresh library** discovers newly added files without
restarting Vite. The dev-only catalog endpoint lists supported regular files;
production builds emit a static catalog alongside Vite's copied score files.
Downloaded scores are ignored by Git; only the folder README is tracked.
The dev middleware serves score bytes directly so files added after startup and
filenames containing spaces, `#` or `%` work without relying on Vite's public-file
cache. Dependency licence notices are included under `public/licenses/`, with
font and SoundFont notices retained by the asset-copy plugin.

Original GP4 and GP5 test fixtures are generated from the included four-note
exercise with PyGuitarPro 0.11. The writer is an optional fixture-generation tool,
not an app dependency. No downloaded or copyrighted tab fixtures are included.

Observed alphaTab details: `Score.Note.string` numbers from low to high, unlike
alphaTex and the legacy input; position notifications may include a loop's end
tick and an approximately one-tick boundary offset. Loop tests account for these
notifications and check repeated wrap timing rather than expecting pixel-perfect
or floating-point-exact boundary values.

Remaining: full editor/model migration and project saving (phase 2), ASCII import,
user fingering overrides and an animated hand. A long listening check with a user's own downloaded
Ultimate Guitar file, tempo changes and repeat/count-in combinations is still
needed before claiming the full phase-1 musical acceptance criterion. Automated
browser checks of output and loop timing do not establish audible artistic quality
or prove zero drift over an extended session.

Validation of this slice: 8 Node tests and 9 headless Edge browser tests passed,
including GP4 library discovery/load, GP5 picker input, alphaTex drop input,
corrupt-file recovery, track controls, shortcuts, repeated one-bar loops at 50%,
actual synth output, zero-volume silence, score drag selection and mobile layout.
The production build also passed. The full musical acceptance check remains as
described above.

## Follow-up: live finger guide and editor design

`practice/fingering.js` generates suggestions with a small Viterbi pass across
score-order note groups. It penalises position changes and stretched assignments,
allows an index barre when intervening strings permit it, carries viable positions
through rests/open strings and preserves written thumb/finger hints. Implausible
or conflicting assignments retain the source hints and flag uncertainty rather
than inventing a finger. Suggestions are view data; the imported score is unchanged.

The player adapter builds suggestions after MIDI loading, translates low-to-high
model string numbers to conventional tab string numbers and supplies plain view
data to `practice/fretboard.js`. Current beats come from alphaTab's playback
events; upcoming beats use its tick-cache playback order, with loop wrap handling.
Track changes, seek and stop refresh the preview. Written hints and tied-note
finger hints are retained. The diagram supports bass, capo-relative fret numbers,
note names, fret window selection and left-handed mirroring.

This is a first fingering aid, not a complete hand biomechanics solver: repeat
transitions are not separately optimised, sustained multi-voice constraints are
not fully solved, and beat-level highlighting is not a precise note-off ledger.
There is no user override persistence or 3D hand yet.

`editor.css` and the editor markup now match the Practice visual design, with
responsive writing/preview panels, notation help and print-only sheet output.
The browser's reviewed string inversion, spaced-plus parsing, multi-digit
alignment, custom/case-insensitive chord lookup, metadata HTML escaping and
double URL decoding issues were also fixed. The separate Python parser findings
remain for the model migration phase.

## Follow-up: editor playback and USB MIDI

The editor now mounts the same workspace markup and `mountPractice()` controller
as Practice. `practice/entry.js` mounts the standalone page; `editor-player.js`
mounts an embedded workspace with scoped controls, so playback/fingering/MIDI
behaviour stays shared rather than duplicated. The original printable lesson
sheet remains available below the player. No iframe or audio clock is added.

`lesson-converter.js` imports the existing parsed lesson into alphaTex. It preserves
string/fret positions and simultaneous groups, resolves custom chord shapes before
case-insensitive library lookup, and escapes metadata for alphaTex. It explicitly
assumes uniform quarter/eighth/sixteenth duration at a chosen base tempo in 4/4,
pads the final bar, and labels this draft rhythm. Unsupported tuning, duplicate
strings in a chord and malformed notes produce actionable errors. Text annotations
stay in the printable source. Editing invalidates and stops the old playable
preview until a successful update. This is a first forward-conversion slice;
per-note rhythm authoring, reverse conversion and project save/open remain pending.

`midi-output.js` wraps Web MIDI output. Permission is requested from an explicit
Connect MIDI click with SysEx disabled. The user selects an output and enables it;
an FM1-like port name is preferred in the list but never armed automatically.
Only the displayed, audible track is routed to the selected channel. The player
normalises alphaTab's typed NoteOn/NoteOff events (its enum values must not be
interpreted as raw MIDI status bytes), sorts each played-event batch by tick,
then emits actual MIDI 1.0 note messages. Velocity follows the Volume slider.

The synth continues to own tempo, looping and the playback timeline, even with
browser monitoring muted. Stop/pause, seek/loop reset, file/track/range changes,
mute/solo, page exit and port failure release held MIDI notes. A note ledger
handles overlapping pitches mapped to one output channel. No patch changes,
SysEx, MIDI clock, sustain effects or bends are forwarded; explicit cleanup sends
sustain-off, note-offs and channel all-notes/all-sound-off. Physical MIDI timing
and FM1 audio quality require device testing. The browser tests use a simulated
port while the real alphaTab synth runs, not a simulated transport.

References checked: [alphaTab MIDI event stream](https://demos.alphatab.net/docs/features/play-sync/midi-event-stream),
[Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API),
and [official FM-1 product information](https://www.cuvave.com/product?id=fm-1).

## Follow-up: standard score export and video-style hand view

Both workspaces offer **Save Guitar Pro (.gp)** and **Save alphaTex**, implemented
through alphaTab's native exporters on the current runtime Score. A creator's
original source can also be saved as markdown. Export preserves the chosen base
tempo and uniform durations, not the temporary slowdown setting. Draft rhythm is
recorded in the score subtitle. GP4 is an input format; GP7+ `.gp` is the supported
Guitar Pro output. Download tests re-import actual browser downloads and compare
notes/chords and timing through the real alphaTab parser.

The fretboard now has keyboard-accessible **Diagram** and **Video view** tabs.
`fretboard-layout.js` defines one coordinate system for strings, frets, mirroring
and hand targets. Video view reverses both axes: high E at the bottom, higher frets
to the left and open strings on the right. Left-handed mode mirrors neck and hand
together. Small screens pan to the active note when the pose changes, without
repeatedly overriding manual scrolling while the same notes remain displayed.

`hand-rig.js` solves three-joint fingers with fixed bone lengths in projected 3D
coordinates. Pressed pads have zero clearance above the strings; unused fingers
hover and anticipate reachable upcoming notes. A shared palm shift accommodates
low-string reaches. `fretboard-scene.js` uses Three.js to render a shallow 3D neck,
metal fret wires, strings, and tapered finger surfaces with nails. The camera
shows fingers and the knuckle edge, cropping out the palm and wrist. The thumb
only appears for written thumb-over hints. The opacity is adjustable and pad
surfaces lower onto the string plane. Barres flatten one continuous finger along
the strings. Active fingertips share
the note markers' coordinates just behind the fret wires; index barres span the
matching strings. Unknown, contradictory or uncertain suggestions do not invent
contacts. Poses blend between playback beats unless reduced motion is enabled.
Rendering runs only on pose changes, resizing and short transitions; geometries
are disposed when replaced, and the WebGL renderer is disposed on page hide.
`hand-guide.js` retains an SVG fallback for browsers without WebGL. This remains
a simplified procedural rig, without full collision modelling or a captured
performer's anatomy. Finger hints and suggestions retain their limits.

Visual direction was informed by CDPR's discussion of video reference and hand
detail in [Every Frame Tells a Story](https://www.cdprojektred.com/en/blog/176/every-frame-tells-a-story-game-animation-transcript-included).
That article does not establish how the specific Cyberpunk guitar scenes were made.

The 3D follow-up was checked with 31 Node tests, 23 Edge browser tests, production
builds and screenshots of single notes, barre chords and mirrored mobile views.

Validation of these follow-ups: 29 Node tests and 21 headless Edge browser tests
passed, plus the production build. Browser coverage includes actual GP/alphaTex
downloads and re-import, editor invalidation, USB MIDI note routing/50% loop timing
against a simulated port, silent browser monitoring, video orientation and hand
contact alignment on desktop/mobile. Physical FM1 sound and standalone sequencer
compatibility are separate from the simulated-port checks.

## Stock FM1 song export investigation

The user confirmed stock M-VAVE firmware. The official MIDI control document
lists performance messages, MIDI transport/clock and DX7 single-parameter SysEx;
the published V16 release notes describe a 64-step/16-Pattern sequencer and
8×8 arrangement. V16's bank SysEx export explicitly excludes Patterns and
arrangements. Neither source documents Standard MIDI File import or a whole-song
sequencer upload protocol. The control document also contains older FX mappings
that V16's newer release notes supersede; do not treat the stock versions as
interchangeable. No proprietary sequence-memory writes are implemented.

Added **Save MIDI (.mid)** using alphaTab's MIDI generator/export handler and SMF
type 0 output. It is a standard song file for compatible tools, explicitly not a
stock FM1 project. Live USB MIDI remains the supported stock-device path, with
the browser acting as the sequencer. The downloaded file is checked for a valid
SMF header/track and the chosen base tempo. Source references are linked in README.
