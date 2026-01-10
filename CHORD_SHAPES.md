# Guitar Chord Shape Generator

Python module that uses music theory to generate all possible guitar chord shapes.

## Features

- **Music Theory Based**: Automatically calculates chord shapes from chord formulas (root, intervals)
- **Multiple Tunings**: Supports standard, drop D, DADGAD, and custom tunings
- **Capo Support**: Handles capo positions with automatic transposition
- **Playability Filtering**: Removes physically impossible shapes (finger span > 4 frets, etc.)
- **Comprehensive Chord Types**: Major, minor, 7th, 9th, sus, dim, aug, and more

## Installation

No external dependencies required - uses only Python standard library.

```python
from chord_shape_generator import generate_chord_shapes, print_chord_shape
```

## Basic Usage

```python
from chord_shape_generator import generate_chord_shapes

# Generate all possible shapes for E minor
shapes = generate_chord_shapes(
    chord='Em',
    tuning='standard',
    capo=0,
    max_fret=12,
    max_span=4
)

# Print results
for shape in shapes[:5]:  # Show first 5 shapes
    print(shape.to_tab_notation())  # e.g., '022000'
```

## Function Parameters

### `generate_chord_shapes()`

```python
generate_chord_shapes(
    chord: str,              # Required: Chord name (e.g., 'C', 'Em', 'F#m7', 'Gmaj7')
    tuning: str = 'standard', # Tuning name or list of notes
    capo: int = 0,           # Capo position (0 = no capo)
    max_fret: int = 12,      # Maximum fret to search
    max_span: int = 4,       # Maximum finger span
    require_root: bool = False, # Only return shapes with root note
    min_notes: int = 3       # Minimum notes to play
) -> List[ChordShape]
```

## Supported Chord Types

- **Major**: `C`, `maj`, `M`
- **Minor**: `m`, `min`
- **Seventh**: `7`, `maj7`, `m7`, `mmaj7`
- **Extended**: `6`, `9`, `add9`
- **Suspended**: `sus2`, `sus4`, `7sus4`
- **Altered**: `dim`, `dim7`, `aug`
- **Power**: `5`

## Supported Tunings

- `'standard'`: E-A-D-G-B-E
- `'drop d'`: D-A-D-G-B-E
- `'drop c'`: C-G-C-F-A-D
- `'dadgad'`: D-A-D-G-A-D
- `'open d'`: D-A-D-F#-A-D
- `'open g'`: D-G-D-G-B-D
- `'half step down'`: Eb-Ab-Db-Gb-Bb-Eb
- `'whole step down'`: D-G-C-F-A-D

Or provide a custom tuning as a list: `['D', 'A', 'D', 'G', 'B', 'E']`

## ChordShape Object

Each generated shape has the following attributes:

```python
shape.frets            # List of fret positions: -1=muted, 0=open, >0=fret
shape.chord_notes      # Notes being played
shape.span             # Fret span (max_fret - min_fret)
shape.min_fret         # Lowest fret pressed
shape.max_fret         # Highest fret pressed
shape.to_tab_notation() # Returns string like 'x32010'
```

## Examples

### Basic Chord

```python
# Generate C major shapes
c_shapes = generate_chord_shapes('C', tuning='standard')

# Common C chord
print(c_shapes[0].to_tab_notation())  # 'x32010'
```

### With Capo

```python
# Play an A shape with capo on 2nd fret (sounds like B)
shapes = generate_chord_shapes(
    chord='A',
    capo=2,
    tuning='standard'
)
```

### Alternate Tuning

```python
# D chord in Drop D tuning
d_shapes = generate_chord_shapes(
    chord='D',
    tuning='drop d'
)
```

### Seventh Chords

```python
# F# minor 7
fsharp_m7 = generate_chord_shapes('F#m7')

# Common F#m7 shape
print(fsharp_m7[0].to_tab_notation())  # 'xxx222'
```

### Custom Tuning

```python
# Custom tuning
shapes = generate_chord_shapes(
    chord='G',
    tuning=['D', 'A', 'D', 'G', 'A', 'D']  # DADGAD
)
```

### Filter Results

```python
# Only shapes in first position (open chords)
shapes = generate_chord_shapes('E', max_fret=3)

# Require root note
shapes = generate_chord_shapes('Am', require_root=True)

# At least 4 notes
shapes = generate_chord_shapes('Cmaj7', min_notes=4)
```

## Playability Rules

The generator filters out unplayable shapes based on:

1. **Multiple presses on same string**: Not possible
2. **Finger span > max_span** (default 4 frets): Too wide to reach
3. **Missing chord tones**: Shape must contain chord notes
4. **Minimum notes**: Must play at least `min_notes` (default 3)

## Complete Example

```python
from chord_shape_generator import generate_chord_shapes, print_chord_shape

# Generate Em shapes
em_shapes = generate_chord_shapes(
    chord='Em',
    tuning='standard',
    max_fret=12,
    max_span=4,
    min_notes=3
)

print(f"Found {len(em_shapes)} possible shapes")

# Show first shape in detail
print_chord_shape(em_shapes[0])

# Get tab notation for all shapes
for shape in em_shapes[:10]:
    tab = shape.to_tab_notation()
    notes = ', '.join(set(shape.chord_notes))
    print(f"{tab} - Notes: {notes}")
```

Output:
```
Found 995 possible shapes

========================================
Shape: 022000
Span: 2 frets
Position: frets 0-2
Notes: E, B, E, G, B, E
----------------------------------------
E  |  0|  (E)
A  |  2|  (B)
D  |  2|  (E)
G  |  0|  (G)
B  |  0|  (B)
e  |  0|  (E)
========================================
```

## Running Examples

See example usage:

```bash
# Run built-in examples
python chord_shape_generator.py

# Run comprehensive demonstrations
python chord_shape_example.py
```

## How It Works

1. **Parse Chord Name**: Extracts root note (e.g., 'F#') and type (e.g., 'm7')
2. **Calculate Chord Tones**: Uses chord formulas to find all notes in the chord
3. **Apply Capo**: Transposes chord if capo is used
4. **Find Note Positions**: For each string, finds all frets where chord notes appear
5. **Generate Combinations**: Creates all possible fingering combinations
6. **Filter for Playability**: Removes shapes that are physically impossible
7. **Remove Duplicates**: Eliminates duplicate fingerings
8. **Sort**: Orders by position and span for easier browsing

## Music Theory Details

### Chord Formulas (in semitones from root)

- **Major triad**: 0, 4, 7 (root, major 3rd, perfect 5th)
- **Minor triad**: 0, 3, 7 (root, minor 3rd, perfect 5th)
- **Dominant 7th**: 0, 4, 7, 10
- **Major 7th**: 0, 4, 7, 11
- **Minor 7th**: 0, 3, 7, 10

See `CHORD_FORMULAS` in the source code for the complete list.

## Limitations

- Maximum 6 strings (standard guitar)
- Single note per string (no two-hand tapping, etc.)
- Physical playability based on simple rules (some shapes marked "playable" may still be difficult)
- Large result sets for complex chords (use filtering to narrow down)

## Contributing

To add more chord types, update the `CHORD_FORMULAS` dictionary:

```python
CHORD_FORMULAS['m7b5'] = [0, 3, 6, 10]  # Half-diminished
CHORD_FORMULAS['13'] = [0, 4, 7, 10, 14, 17, 21]  # 13th chord
```

To add more tunings, update the `TUNINGS` dictionary:

```python
TUNINGS['nashville'] = ['E', 'A', 'D', 'G', 'B', 'E']  # Same as standard
```
