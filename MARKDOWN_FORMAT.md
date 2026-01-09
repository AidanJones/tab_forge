# Markdown Guitar Tab Format

A simple, easy-to-type format for taking guitar tab notes while watching video lessons. Write in plain text, convert to beautiful PDFs.

## Quick Start

1. Create a `.md` file with your notes
2. Run: `python markdown_tab_parser.py your_notes.md output.pdf`
3. Open the generated PDF!

## Format Overview

```markdown
key: C
tuning: standard
title: Song Name
artist: Artist Name

chords:
C: x32010
Am: x02210

[Section Name - ChordName]
3f1s 2f5s 0s3
note: Your note here
"Lyrics go here"
```

## Metadata Section

Add song information at the top of your file:

```markdown
key: C
tuning: standard
title: My Awesome Song
artist: Cool Band
```

**Supported fields:**
- `key:` - The key of the song (e.g., C, Am, G)
- `tuning:` - Guitar tuning (currently assumes standard)
- `title:` - Song title
- `artist:` - Artist or band name

## Chords Section

Define chords used in the song:

```markdown
chords:
C: x32010
Am: x02210
Em: 022000
G: 320003
```

**Format:** `ChordName: fret_positions`
- `x` = muted/don't play
- `0` = open string
- `1-9` = fret number
- Order: Low E to high e (6th string to 1st string)

## Tab Notation

### String Numbering

**IMPORTANT:** Strings are numbered from thinnest (high E) to thickest (low E):
- 1st string = high E (thinnest)
- 2nd string = B
- 3rd string = G
- 4th string = D
- 5th string = A
- 6th string = low E (thickest)

### Single Notes

Format: `<fret>f<string>s` or `0s<string>`

Examples:
- `3f1s` - 3rd fret, 1st string (high E)
- `2f5s` - 2nd fret, 5th string (A string)
- `0s3` - Open 3rd string (G string)

Write multiple notes in sequence separated by spaces:
```markdown
3f1s 2f2s 0s3 1f4s
```

### Multiple Notes at Once (Chords/Intervals)

Use `+` to play notes simultaneously:

```markdown
2f5s + 2f4s
```

This means: 2nd fret on 5th string AND 2nd fret on 4th string played together.

More examples:
```markdown
3f6s + 2f5s + 0s4 + 1f3s + 0s2 + 0s1
```

### Chord Shorthand

Instead of writing out every note, use chord names:

```markdown
em
C
Am
```

This will show the full chord strummed together.

## Sections

Group your tab into logical sections:

```markdown
[Intro]
3f1s 2f2s 0s3

[Verse 1]
0s5 1f5s 2f5s

[Chorus - C]
em

[Bridge]
3f1s
```

**With chord labels:**
```markdown
[Chorus - C]
```
Shows that this section is based on the C chord.

## Lyrics

Add lyrics with quotation marks:

```markdown
[Verse 1]
"We are the champions my friend"
[Am]
0s5 1f5s 2f5s
"And we'll keep on fighting till the end"
```

Lyrics appear with a ♪ symbol in the PDF.

## Notes and Annotations

Add teaching notes or reminders:

```markdown
[Intro]
3f1s 2f2s 0s3
note: Play this slowly at first

[Chorus]
em
note: Strum all strings together, emphasize downstrokes
```

## Complete Example

```markdown
key: G
tuning: standard
title: Practice Session 1
artist: Video Lesson Series

chords:
G: 320003
C: x32010
Em: 022000
D: xx0232

[Intro - G]
3f1s 3f2s 0s3
note: Start with a simple melody

[Verse 1]
"The sun is shining bright today"
[C]
0s5 1f5s 3f5s 3f4s
note: Keep fingers curved, play cleanly

[Pre-Chorus]
2f5s + 2f4s
note: These two notes create a nice harmony

[Chorus - Em]
em
"We are singing together"
note: Full strum, all strings

[Bridge - D]
2f1s 3f2s 2f3s 0s4
note: Ascending pattern, builds tension

[Outro]
[G]
G
note: End on the full G chord, let it ring
```

## Tips for Taking Notes

1. **While watching videos:**
   - Pause and write the fret/string notation immediately
   - Use chord shorthand when instructor plays full chords
   - Add notes about technique, tempo, or difficulty

2. **Keep it simple:**
   - Don't worry about perfect formatting while taking notes
   - Focus on capturing the information
   - Clean it up later if needed

3. **Common shortcuts:**
   - `em` instead of `022000` when you know the chord
   - Section names like `[Intro]`, `[Verse 1]`, `[Chorus]`
   - Quick notes: `note: slow` or `note: repeat 2x`

4. **Review and edit:**
   - After the video, review your notes
   - Add any missing lyrics or chord labels
   - Generate the PDF to see how it looks
   - Edit the markdown if you want to adjust formatting

## Converting to PDF

### Command Line
```bash
python markdown_tab_parser.py your_notes.md output.pdf
```

If you don't specify an output filename:
```bash
python markdown_tab_parser.py your_notes.md
```
It will create `your_notes.pdf` automatically.

### From Python
```python
from markdown_tab_parser import MarkdownTabParser

parser = MarkdownTabParser()
parser.parse_file('your_notes.md')
parser.to_pdf('output.pdf')
```

## What Gets Generated in the PDF

1. **Title and artist** (if provided)
2. **Key and tuning information**
3. **Chord diagrams** for all defined chords
4. **Section-by-section tabs** with:
   - Section headers
   - Traditional 6-line tab notation
   - Lyrics with ♪ symbols
   - Notes and annotations
   - Chord labels

## Examples by Use Case

### Quick Lesson Notes
```markdown
[Intro]
3f1s 2f2s 0s3
note: tempo 120

[Main Riff]
0s5 2f5s 3f5s 2f5s 0s5
note: repeat 4x
```

### Song with Lyrics
```markdown
key: C
title: My Song

[Verse 1]
"First line of lyrics"
[C]
3f6s 2f5s 0s4 0s3
"Second line of lyrics"
[Am]
0s5 1f5s 2f5s
```

### Chord Practice
```markdown
chords:
C: x32010
G: 320003
Am: x02210

[Exercise 1]
C
note: Strum 4x

[Exercise 2]
G
note: Strum 4x

[Exercise 3]
Am
note: Strum 4x
```

### Fingerpicking Pattern
```markdown
[Pattern - C Chord]
3f6s 2f5s 0s4 0s3 0s2 0s1
note: This is a basic fingerpicking pattern
note: Use: thumb, index, middle, ring, middle, index
```

## Troubleshooting

**Issue:** Chord doesn't show up in PDF
- Make sure the chord is in the built-in library or defined in your `chords:` section

**Issue:** Notes look weird in tab
- Check your notation: should be `3f1s` not `3s1f`
- Make sure string numbers are 1-6

**Issue:** PDF formatting is off
- Keep lines relatively short (under 10-12 notes)
- Break long sequences into multiple lines
- Use sections to organize content

**Issue:** Can't find generated PDF
- Check the same directory as your .md file
- Look for filename matching your input (e.g., `song.md` → `song.pdf`)
