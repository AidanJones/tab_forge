# tab_forge

Write guitar tabs, practise them slowly, and keep the chord shapes, lyrics and playing instructions together.

## Overview

**tab_forge** is a browser tab editor and practice player. It renders one standard
score, plays Guitar Pro files at adjustable speed, loops passages and provides
chord diagrams and a fretting-hand guide. The original Python PDF tools remain
available for existing lesson files.

## Browser practice

Requires Node.js 22.12+ and pnpm (or npm).

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite and choose **Open Practice**, or visit
`http://127.0.0.1:5173/practice.html` when the server uses its default port.
With npm, use `npm install` and `npm run dev` instead.

1. Put your downloaded `.gp4` files directly in **`public/scores/`**.
2. Open Practice and click **Refresh library**.
3. Choose a file and click **Load selected**, then **Play**.

The folder is scanned each time you refresh the library. Score files are ignored
by Git. You can also use **Open a score** or drag a file onto the practice panel.
Supported inputs include `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp`, MusicXML and
alphaTex. **Try the demo** loads an original exercise with guitar and bass tracks.

Controls include 25–150% playback speed, play/pause/stop, loop, count-in,
metronome, volume, track display and per-track mute/solo. Drag across the score
to select a passage with beat/bar snapping, or use the bar selectors. Repeated
bars are listed in playback order. Stop returns to the beginning of the selected
passage; **Clear** restores the whole score. Space toggles playback, `L` toggles
looping, and `[` / `]` adjust speed by 5% while focus is outside input controls.

The **Fretting-hand guide** shows numbered fingers on a live fretboard: solid
markers for this beat and outlined markers for the next. File-supplied finger
hints take priority. Missing hints receive sequence-based suggestions labelled
as suggestions; open strings need no fretting finger. Options include a
left-handed mirror, note names, fret range and turning suggestions off. Click a
beat while paused to preview its positions. Suggestions do not change your file.
Unusual stretches or conflicting hints are flagged for checking; the guide
shows beat positions rather than exact release times for every sustained note.

The editor shares Practice's visual design, with responsive writing/preview
panels and a **Print / PDF** action. Its examples, custom chord definitions,
string numbering, multi-digit fret alignment and spaced `+` groups are supported.

In **Fretting-hand guide → Video view**, the neck faces you like a video lesson:
high E is at the bottom, fret 12 is on the left and open strings are on the right.
The neck is rendered in shallow 3D. Enable **Show hand** for a translucent
skeleton hand with rounded cartoon bones and visible joints. A shared palm
and thumb grip the neck; joint limits and clearance checks guide the fingers.
Common chord families reuse cached grips, and the whole hand moves along the
neck during playback. Pressing pads meet the strings, while unused fingers hover.
Adjust **Hand opacity** to see more of the neck. Poses blend during playback (respecting
reduced motion). Open strings/rests release the fingers. **Left-handed**
mirrors the neck and hand together. On small screens, the view pans to the active
notes; you can also scroll along the neck. The normal **Diagram** tab remains
available. The camera crops out most of the palm and wrist; the supporting thumb
sits behind the neck. Thumb-over notes remain marked, but their specialised grips
are not animated yet. This is a simplified anatomical rig with fixed proportions,
rather than a model measured for your own hand. Browsers without WebGL use the
blocky illustrated fallback.

Playback is synthesised from the score, with local alphaTab assets and SoundFont.
The editor now includes the same player and finger guide as Practice. Click
**Update preview** to hear the current lesson. Since legacy lesson notes have no
written rhythm, choose a base tempo and a uniform note length; the preview labels
this as draft rhythm and pads the last 4/4 bar with rests. Editing stops playback
until you update again. Legacy playback currently supports standard six-string
tuning; other tunings produce an explicit message instead of wrong pitches.
The proposed score-model migration and remaining phases are documented in
[docs/practice-mode.md](docs/practice-mode.md).

### Save your created score

After **Update preview**, use **Save Guitar Pro (.gp)** or **Save alphaTex** in
the score header. Guitar Pro export is the GP7+ `.gp` format; `.gp4` files can be
imported but are not an export format. The score includes its notes, simultaneous
chords, tuning and base tempo/durations. A draft-rhythm subtitle records the
assumed uniform timing. Playback slowdown is a practice setting and does not
rewrite the exported score's base tempo.

Use **Save notes (.md)** beside the editor controls to retain the complete lesson
source. Chord shapes, section markers, playing instructions and lyrics are also
included in Guitar Pro and alphaTex exports.
GP and alphaTex downloads can be opened in Practice via the file picker or by
placing them in `public/scores/` and refreshing the library. The same export
buttons also work on scores opened directly in Practice.

### Chords, playing instructions and lyrics

The editor uses the same score view as Practice, including printing via
**Print / PDF**. The **Notation** selector shows **Tab**, **Sheet music**, or
**Both** (the default). This choice is remembered across pages and applies to
printing and saved Guitar Pro/alphaTex display settings. Tracks without string
and fret data remain in sheet music view. Chord diagrams appear at the top by default. Enable **Shape hints
above bars** to see full diagrams beside the passage, including when you pick
individual strings instead of strumming. Both display preferences are remembered
across the editor and Practice pages.

With **Shape hints above bars** enabled, turn on **Finger examples** to add a
cartoon skeleton-hand diagram beside each plain chord diagram. Ivory, knobby
bone ends, slim shafts, warm shading and dark outlines keep the examples readable.
These use the
same fixed-bone hand solver as Video view, rotated into a normal chord chart.
Numbers label the fretting fingers; the caption says **One possible fingering**
or **Written fingering** when the score supplies finger hints. Unsafe or
contradictory grips show **Check fingering** instead of an invented hand pose.
Examples are included in Print / PDF and the preference is remembered on both
pages. They are a visual aid and do not change the notes or exported fingerings.
Finger assignments are modelled separately from chord frets, ready for future
per-chord variant selection; imported written variants are already respected.

```text
chords:
C: x32010
Am: x02210

[Verse - C]
note: Play softly and let each string ring
"Take your time now"
3f5s 2f4s 0s3 1f2s

shape: Am
0s5 2f4s 2f3s 1f2s
```

`[Verse - C]`, `[C]` and `shape: C` set a hand-shape hint without adding a played
chord. `shape: off` clears that context. A chord name on a music line still plays
the whole chord. Instructions (`note:` or plain text) and lyrics (quoted text or
`lyrics:`) attach to the preceding picking line in that section, or the following
line when written before any music or after a `shape:` change. Lyrics use one word per beat, grouping any
remaining words on the final beat. Timing and lyric alignment remain a draft;
each named section starts a fresh bar and short bars are padded with rests.

The shape-hint option can also suggest an unambiguous fixed grip in an imported
score. It checks at least three strings, including two fretted strings, and
leaves ambiguous or changing-fret passages alone. Suggestions are labelled
**suggested**, never replace written chords and are excluded from saved scores.
Written shapes, lyrics and instructions are retained in exports.

**Save MIDI (.mid)** exports a Standard MIDI File (type 0) containing the song's
notes and timing, for compatible DAWs or sequencers. This file is not a stock
FM1 project. Live USB MIDI playback does not store the song in the FM1.

### Stock FM1 standalone sequencer status

No supported whole-song/Pattern upload interface was found in the official
stock MIDI control document and V16 release notes checked on 5 November 2026.
V16 supports 64 steps per Pattern, 16 Patterns and an eight-track/eight-column
arrangement; the older V15 sequencer differs. V16's documented SysEx bank export
explicitly excludes Patterns and arrangements. This does not prove an undocumented
protocol cannot exist, but tab_forge does not claim a sequencer upload feature.
Use live USB MIDI playback or the standard `.mid` download for compatible tools.
No firmware changes or device-memory writes are performed.

Sources: [official stock MIDI control document](https://yms-file-store.oss-cn-hongkong.aliyuncs.com/software/releaseNote/firmware/FM-1%20MIDI%20EN.docx)
and [official firmware release notes](https://yms-file-store.oss-cn-hongkong.aliyuncs.com/software/releaseNote/firmware/FM-1.txt).

### USB MIDI output (including M-VAVE FM1)

In either player, open **USB MIDI · play on your FM1**:

1. Connect the FM1 to the computer with a USB data cable and choose a sound on it.
2. Use Chrome or Edge over the local app URL. Click **Connect MIDI** and allow
   the browser's MIDI permission request.
3. Select the FM1 output, choose its receiving MIDI channel (1 by default), and
   enable **Send notes**. **Test note** sends a short middle C.
4. Press **Play**. Only the displayed track is sent, respecting mute/solo. Browser
   sound is off while MIDI output is enabled unless **Also play browser sound**
   is checked. The Volume slider scales outgoing note velocity.

Stop, pause, seek, loop changes, track changes, unplug and page exit release held
notes. **All notes off** is also available. Output uses alphaTab's played-note
event stream at its current playback speed; it does not introduce another score
clock. Hardware latency still depends on the browser, USB connection and device.
The adapter sends note-on/off plus sustain-off/all-notes-off cleanup on one chosen
channel. It does not send program changes, MIDI clock, SysEx or pitch-bend effects.
Set the FM1's patch and receiving channel on the device. Automated tests use a
simulated output port; an actual FM1 listening check is still needed.

```powershell
pnpm test
pnpm test:browser
pnpm build
pnpm preview
```

Browser tests use Edge on Windows, or Playwright Chromium elsewhere. Set
`TAB_FORGE_BROWSER_CHANNEL=chrome` to use installed Chrome. For Playwright's
bundled Chromium on other platforms, first run `pnpm exec playwright install chromium`.
The build produces `dist/`, including the scores currently in `public/scores/`;
rebuild after changing that folder. The library is local and does not fetch tabs
from Ultimate Guitar.

## Features

- 🎸 Convert text-based guitar tabs to professional-looking PDFs
- 📝 **NEW: Markdown note-taking format** - Write tabs in simple markdown while watching video lessons!
- 🎵 **Chord diagrams** - Visual chord charts showing finger positions
- 🎼 **Scale generation** - Automatically generate scale tabs from music theory
- 🎹 **Fretboard visualization** - See the entire scale layout on the guitar neck
- 📊 Root note markers - Easily identify root notes in scale diagrams
- 📄 Simple, intuitive API
- 🎨 Clean, monospaced formatting for tab notation
- 🎶 Support for lyrics, notes, and annotations
- 🚀 Easy to use - just define your tab and generate!

## Installation

```bash
pip install -r requirements.txt
```

## Quick Start

### Easy Markdown Format (Recommended for Video Lessons!)

The fastest way to take notes while watching guitar lessons:

```bash
# Create a simple markdown file (see example_song.md)
python markdown_tab_parser.py example_song.md

# Or specify output filename
python markdown_tab_parser.py my_notes.md my_song.pdf
```

**Example markdown format:**
```markdown
key: C
tuning: standard

chords:
C: x32010
Am: x02210

[Intro - C]
3f1s 2f2s 0s3
note: Play slowly

[Verse 1]
"We are the champions"
[Am]
0s5 1f5s 2f5s
```

See **[MARKDOWN_FORMAT.md](MARKDOWN_FORMAT.md)** for complete documentation!

### Run the example scripts

```bash
# Generate example tabs including A minor practice sheet with chords and scales
python tab_to_pdf.py

# Create custom tabs with chord progressions and scales
python example_usage.py
```

This will create PDF files in your current directory.

### Create your own tabs

```python
from tab_to_pdf import GuitarTabPDF

# Initialize PDF
pdf = GuitarTabPDF("my_song.pdf")

# Add title
pdf.add_title("My Awesome Song")
pdf.add_subtitle("By: Your Name")

# Define your tab
tab = """
e|--0--1--3--5--3--1--0------------|
B|----------------------------------|
G|----------------------------------|
D|----------------------------------|
A|----------------------------------|
E|----------------------------------|
"""

# Add it to the PDF
pdf.add_text("Intro Riff")
pdf.add_tab(tab)

# Save
pdf.save()
```

### Create practice sheets with chords and scales

```python
from tab_to_pdf import GuitarTabPDF

# Initialize PDF
pdf = GuitarTabPDF("a_minor_practice.pdf")

# Add title
pdf.add_title("A Minor Scale Practice")
pdf.add_subtitle("With Chord Progressions")

# Add chord diagrams at the top
pdf.add_chord_progression(['Am', 'C', 'Dm', 'Em'])

# Add scale tabs (sequential notes)
pdf.add_scale_tab('A', 'minor', start_string=5, start_fret=0)

# Add fretboard diagram showing the scale across the entire neck
# Root notes are marked with 'R'
pdf.add_fretboard_diagram('A', 'minor', num_frets=12)

# Save
pdf.save()
```

### Available chords

The following chords are available in the chord library:
- **Am** - A minor
- **C** - C major
- **Dm** - D minor
- **Em** - E minor
- **G** - G major
- **A** - A major
- **D** - D major
- **E** - E major
- **F** - F major

### Available scale types

- `'minor'` - Natural minor scale
- `'major'` - Major scale
- `'pentatonic_minor'` - Minor pentatonic scale
- `'pentatonic_major'` - Major pentatonic scale

## Tab Format

Use standard ASCII tab notation:

```
e|--12--10--8---------------------|  (high E string)
B|------------------------------|
G|------------------------------|
D|------------------------------|
A|------------------------------|
E|------------------------------|  (low E string)
```

- Numbers represent fret positions
- `0` means open string (no fret)
- `|` represents the nut or section boundaries
- `-` connects the fret numbers

## Examples

The repository includes example scripts:
- `tab_to_pdf.py` - Main library with examples including:
  - A minor practice sheet with chords, scales, and fretboard diagrams
  - C major scale patterns
  - Simple chromatic scale
- `example_usage.py` - Shows how to create custom tabs with:
  - Custom guitar riffs and solos
  - Scale practice sheets with chord progressions (G major example)
  - Pentatonic scale practice (E minor pentatonic example)

## Requirements

- Python 3.6+
- reportlab

## License

See LICENSE file for details.
Browser dependency notices are included in `public/licenses`.
