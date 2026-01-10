"""
Guitar Chord Shape Generator

Generates all possible guitar chord shapes based on music theory.
Handles different tunings, capo positions, and filters for playability.

Author: Claude
"""

from typing import List, Tuple, Optional, Dict, Set
from itertools import product
from dataclasses import dataclass


# Music Theory Constants
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
ENHARMONIC_MAP = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'C♯': 'C#', 'D♯': 'D#', 'F♯': 'F#', 'G♯': 'G#', 'A♯': 'A#',
    'D♭': 'C#', 'E♭': 'D#', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#'
}

# Chord formulas (semitones from root)
CHORD_FORMULAS = {
    # Major chords
    '': [0, 4, 7],           # Major triad
    'maj': [0, 4, 7],
    'M': [0, 4, 7],
    'maj7': [0, 4, 7, 11],
    'M7': [0, 4, 7, 11],
    '7': [0, 4, 7, 10],      # Dominant 7th
    '6': [0, 4, 7, 9],
    'add9': [0, 4, 7, 14],
    '9': [0, 4, 7, 10, 14],
    'maj9': [0, 4, 7, 11, 14],

    # Minor chords
    'm': [0, 3, 7],          # Minor triad
    'min': [0, 3, 7],
    'm7': [0, 3, 7, 10],
    'min7': [0, 3, 7, 10],
    'm6': [0, 3, 7, 9],
    'm9': [0, 3, 7, 10, 14],
    'madd9': [0, 3, 7, 14],
    'mmaj7': [0, 3, 7, 11],  # Minor major 7th

    # Diminished and augmented
    'dim': [0, 3, 6],
    'dim7': [0, 3, 6, 9],
    'aug': [0, 4, 8],
    'aug7': [0, 4, 8, 10],

    # Sus chords
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
    '7sus4': [0, 5, 7, 10],

    # Power chord
    '5': [0, 7],
}

# Guitar tunings (from low E to high e)
TUNINGS = {
    'standard': ['E', 'A', 'D', 'G', 'B', 'E'],
    'drop d': ['D', 'A', 'D', 'G', 'B', 'E'],
    'drop c': ['C', 'G', 'C', 'F', 'A', 'D'],
    'drop c#': ['C#', 'G#', 'C#', 'F#', 'A#', 'D#'],
    'dadgad': ['D', 'A', 'D', 'G', 'A', 'D'],
    'open d': ['D', 'A', 'D', 'F#', 'A', 'D'],
    'open g': ['D', 'G', 'D', 'G', 'B', 'D'],
    'half step down': ['D#', 'G#', 'C#', 'F#', 'A#', 'D#'],
    'whole step down': ['D', 'G', 'C', 'F', 'A', 'D'],
}


@dataclass
class ChordShape:
    """Represents a playable guitar chord shape"""
    frets: List[int]  # -1 means muted, 0 means open, >0 is fret number
    chord_notes: List[str]  # The actual notes being played
    span: int  # Fret span (difference between highest and lowest fretted notes)
    min_fret: int  # Minimum fret position (excluding open strings)
    max_fret: int  # Maximum fret position

    def __repr__(self):
        fret_str = ''.join('x' if f == -1 else str(f) for f in self.frets)
        return f"ChordShape({fret_str}, span={self.span}, notes={self.chord_notes})"

    def to_tab_notation(self) -> str:
        """Convert to standard tab notation (e.g., 'x32010')"""
        return ''.join('x' if f == -1 else str(f) for f in self.frets)


def normalize_note(note: str) -> str:
    """Normalize note name to sharp notation"""
    note = note.strip()
    # Handle enharmonic equivalents
    if note in ENHARMONIC_MAP:
        return ENHARMONIC_MAP[note]
    # Uppercase the note
    return note.upper()


def transpose_note(note: str, semitones: int) -> str:
    """Transpose a note by a given number of semitones"""
    note = normalize_note(note)
    if note not in NOTES:
        raise ValueError(f"Invalid note: {note}")

    idx = NOTES.index(note)
    new_idx = (idx + semitones) % 12
    return NOTES[new_idx]


def parse_chord_name(chord: str) -> Tuple[str, str]:
    """
    Parse chord name into root note and chord type.

    Examples:
        'Em' -> ('E', 'm')
        'C' -> ('C', '')
        'F#m7' -> ('F#', 'm7')
        'Bbmaj7' -> ('Bb', 'maj7')

    Returns:
        (root_note, chord_type)
    """
    chord = chord.strip()

    # Check for sharp/flat in root note
    if len(chord) >= 2 and chord[1] in ['#', 'b', '♯', '♭']:
        root = chord[:2]
        chord_type = chord[2:]
    else:
        root = chord[0]
        chord_type = chord[1:]

    root = normalize_note(root)

    # Default to major if no type specified
    if not chord_type:
        chord_type = ''

    return root, chord_type


def get_chord_intervals(chord_type: str) -> List[int]:
    """Get the intervals (in semitones) for a chord type"""
    chord_type = chord_type.strip()

    if chord_type in CHORD_FORMULAS:
        return CHORD_FORMULAS[chord_type]

    # Try without spaces
    chord_type_no_space = chord_type.replace(' ', '')
    if chord_type_no_space in CHORD_FORMULAS:
        return CHORD_FORMULAS[chord_type_no_space]

    raise ValueError(f"Unknown chord type: {chord_type}. Available types: {list(CHORD_FORMULAS.keys())}")


def get_chord_notes(root: str, chord_type: str) -> List[str]:
    """
    Get all notes in a chord.

    Args:
        root: Root note (e.g., 'C', 'F#')
        chord_type: Chord type (e.g., 'm', 'maj7', '7')

    Returns:
        List of note names in the chord
    """
    intervals = get_chord_intervals(chord_type)
    return [transpose_note(root, interval) for interval in intervals]


def get_note_positions(note: str, string_tuning: str, max_fret: int = 15, capo: int = 0) -> List[int]:
    """
    Get all fret positions where a note appears on a string.

    Args:
        note: The note to find (e.g., 'E', 'G#')
        string_tuning: The open string note (e.g., 'E')
        max_fret: Maximum fret to search
        capo: Capo position (0 = no capo)

    Returns:
        List of fret positions where the note appears
    """
    positions = []

    # Account for capo - the effective open string is at the capo position
    effective_open = transpose_note(string_tuning, capo)

    for fret in range(capo, max_fret + 1):
        fret_note = transpose_note(string_tuning, fret)
        if fret_note == note:
            positions.append(fret)

    return positions


def is_shape_playable(frets: List[int], max_span: int = 4) -> bool:
    """
    Check if a chord shape is physically playable.

    Args:
        frets: List of fret positions (-1 for muted, 0 for open, >0 for fretted)
        max_span: Maximum fret span (typically 4 for most players)

    Returns:
        True if the shape is playable, False otherwise
    """
    # Check for multiple presses on the same string
    # This shouldn't happen with our generation logic, but let's be safe
    # (Actually, each string only has one value, so this is always true)

    # Get non-open, non-muted frets
    fretted = [f for f in frets if f > 0]

    if not fretted:
        # All open or muted - always playable
        return True

    min_fret = min(fretted)
    max_fret = max(fretted)
    span = max_fret - min_fret

    # Check if span is within reach
    if span > max_span:
        return False

    return True


def filter_duplicate_voicings(shapes: List[ChordShape]) -> List[ChordShape]:
    """
    Remove duplicate chord voicings.

    Two shapes are considered duplicates if they have the same fret pattern.
    """
    seen = set()
    unique_shapes = []

    for shape in shapes:
        tab_notation = shape.to_tab_notation()
        if tab_notation not in seen:
            seen.add(tab_notation)
            unique_shapes.append(shape)

    return unique_shapes


def generate_chord_shapes(
    chord: str,
    tuning: str = 'standard',
    capo: int = 0,
    max_fret: int = 12,
    max_span: int = 4,
    require_root: bool = False,
    min_notes: int = 3
) -> List[ChordShape]:
    """
    Generate all possible playable shapes for a chord.

    Args:
        chord: Chord name (e.g., 'Em', 'C', 'F#m7', 'Gmaj7')
        tuning: Guitar tuning name or custom tuning as list of notes
        capo: Capo position (0 = no capo)
        max_fret: Maximum fret to consider
        max_span: Maximum fret span for playability (typically 3-4)
        require_root: If True, only return shapes that include the root note
        min_notes: Minimum number of notes to play (default 3)

    Returns:
        List of ChordShape objects representing all playable voicings
    """
    # Parse chord
    root, chord_type = parse_chord_name(chord)

    # If capo is used, transpose the chord
    if capo > 0:
        root = transpose_note(root, capo)

    # Get chord notes
    chord_notes = get_chord_notes(root, chord_type)
    chord_notes_set = set(chord_notes)

    # Get tuning
    if isinstance(tuning, str):
        tuning_name = tuning.lower()
        if tuning_name not in TUNINGS:
            raise ValueError(f"Unknown tuning: {tuning}. Available: {list(TUNINGS.keys())}")
        string_tunings = TUNINGS[tuning_name]
    else:
        string_tunings = [normalize_note(n) for n in tuning]

    if len(string_tunings) != 6:
        raise ValueError("Tuning must have exactly 6 strings")

    # For each string, find all positions where chord notes appear
    string_options = []
    for string_note in string_tunings:
        options = [-1]  # Always can mute a string

        for chord_note in chord_notes:
            positions = get_note_positions(chord_note, string_note, max_fret, capo)
            options.extend(positions)

        # Remove duplicates and sort
        options = sorted(set(options))
        string_options.append(options)

    # Generate all combinations
    all_combinations = product(*string_options)

    # Filter and validate shapes
    valid_shapes = []

    for combo in all_combinations:
        frets = list(combo)

        # Check basic playability
        if not is_shape_playable(frets, max_span):
            continue

        # Get the actual notes being played
        played_notes = []
        for i, fret in enumerate(frets):
            if fret >= 0:  # Not muted
                note = transpose_note(string_tunings[i], fret)
                played_notes.append(note)

        # Check if we have at least min_notes different notes from the chord
        unique_played = set(played_notes)
        chord_notes_played = unique_played.intersection(chord_notes_set)

        if len(chord_notes_played) < min_notes:
            continue

        # Check if all played notes are part of the chord
        if not unique_played.issubset(chord_notes_set):
            continue

        # If require_root, check that root is played
        if require_root and root not in unique_played:
            continue

        # Check that we're actually playing at least some notes
        if len(played_notes) == 0:
            continue

        # Calculate span
        fretted = [f for f in frets if f > 0]
        if fretted:
            min_fret = min(fretted)
            max_fret_val = max(fretted)
            span = max_fret_val - min_fret
        else:
            min_fret = 0
            max_fret_val = 0
            span = 0

        # Create chord shape
        shape = ChordShape(
            frets=frets,
            chord_notes=played_notes,
            span=span,
            min_fret=min_fret,
            max_fret=max_fret_val
        )

        valid_shapes.append(shape)

    # Remove duplicates
    valid_shapes = filter_duplicate_voicings(valid_shapes)

    # Sort by position (lower frets first) and then by span (smaller spans first)
    valid_shapes.sort(key=lambda s: (s.min_fret, s.span))

    return valid_shapes


def print_chord_shape(shape: ChordShape, tuning: List[str] = None):
    """
    Pretty print a chord shape.

    Args:
        shape: ChordShape object
        tuning: Optional tuning to show string names
    """
    if tuning is None:
        tuning = TUNINGS['standard']

    string_names = ['E', 'A', 'D', 'G', 'B', 'e']  # Standard names

    print("\n" + "=" * 40)
    print(f"Shape: {shape.to_tab_notation()}")
    print(f"Span: {shape.span} frets")
    print(f"Position: frets {shape.min_fret}-{shape.max_fret}")
    print(f"Notes: {', '.join(shape.chord_notes)}")
    print("-" * 40)

    # Print in tab format
    for i in range(6):
        fret = shape.frets[i]
        if fret == -1:
            fret_str = 'x'
        else:
            fret_str = str(fret)

        # Get the note being played
        if fret >= 0:
            note = transpose_note(tuning[i], fret)
            note_str = f"({note})"
        else:
            note_str = "(muted)"

        print(f"{string_names[i]:2} |{fret_str:>3}|  {note_str}")
    print("=" * 40)


# Example usage and testing
if __name__ == '__main__':
    # Example 1: Generate Em chord shapes
    print("\n" + "="*60)
    print("Example 1: E minor chord shapes (standard tuning)")
    print("="*60)

    em_shapes = generate_chord_shapes('Em', tuning='standard', max_fret=12, max_span=4)
    print(f"\nFound {len(em_shapes)} possible shapes for Em")

    # Show first 5 shapes
    for i, shape in enumerate(em_shapes[:5]):
        print(f"\nShape {i+1}:")
        print_chord_shape(shape)

    # Example 2: C major with capo
    print("\n" + "="*60)
    print("Example 2: C major with capo on 2nd fret")
    print("="*60)

    c_shapes_capo = generate_chord_shapes('C', tuning='standard', capo=2, max_fret=12)
    print(f"\nFound {len(c_shapes_capo)} possible shapes for C with capo on 2")

    if c_shapes_capo:
        print("\nFirst shape:")
        print_chord_shape(c_shapes_capo[0])

    # Example 3: Drop D tuning
    print("\n" + "="*60)
    print("Example 3: D major in Drop D tuning")
    print("="*60)

    d_shapes_dropd = generate_chord_shapes('D', tuning='drop d', max_fret=12)
    print(f"\nFound {len(d_shapes_dropd)} possible shapes for D in Drop D")

    if d_shapes_dropd:
        print("\nFirst shape:")
        print_chord_shape(d_shapes_dropd[0], tuning=TUNINGS['drop d'])

    # Example 4: F#m7 chord
    print("\n" + "="*60)
    print("Example 4: F#m7 chord shapes")
    print("="*60)

    fsharp_m7 = generate_chord_shapes('F#m7', tuning='standard', max_fret=12)
    print(f"\nFound {len(fsharp_m7)} possible shapes for F#m7")

    # Show first 3
    for i, shape in enumerate(fsharp_m7[:3]):
        print(f"\nShape {i+1}:")
        print_chord_shape(shape)

    # Example 5: Custom tuning
    print("\n" + "="*60)
    print("Example 5: G major in DADGAD tuning")
    print("="*60)

    g_dadgad = generate_chord_shapes('G', tuning='dadgad', max_fret=12)
    print(f"\nFound {len(g_dadgad)} possible shapes for G in DADGAD")

    if g_dadgad:
        print("\nFirst shape:")
        print_chord_shape(g_dadgad[0], tuning=TUNINGS['dadgad'])
