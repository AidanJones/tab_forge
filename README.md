# tab_forge

The aim of this repository is to take a basic guitar tab and use it to create a well formatted pdf of the guitar tab.

## Overview

**tab_forge** is a simple Python tool that converts ASCII guitar tabs (the kind you'd write in a text file) into beautifully formatted PDFs. Perfect for creating clean, printable guitar tabs for practice or sharing.

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
