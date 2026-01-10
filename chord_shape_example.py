"""
Example usage of the chord shape generator.

This demonstrates how to generate chord shapes with different parameters.
"""

from chord_shape_generator import (
    generate_chord_shapes,
    print_chord_shape,
    TUNINGS,
    ChordShape
)


def get_common_shapes(shapes, max_results=10):
    """
    Filter to more common/practical chord shapes.

    Prioritizes:
    - Lower positions (easier to play)
    - More notes being played
    - Smaller spans
    """
    # Filter to shapes with at least 3 strings played
    practical = [s for s in shapes if len([f for f in s.frets if f >= 0]) >= 3]

    # Sort by: position, then number of notes (more is better), then span
    practical.sort(key=lambda s: (
        s.min_fret,
        -len([f for f in s.frets if f >= 0]),
        s.span
    ))

    return practical[:max_results]


def demo_basic_chords():
    """Demonstrate generating shapes for basic chords"""
    print("="*70)
    print("BASIC CHORD SHAPES - Standard Tuning")
    print("="*70)

    chords = ['E', 'Em', 'A', 'Am', 'D', 'Dm', 'C', 'G']

    for chord_name in chords:
        shapes = generate_chord_shapes(
            chord=chord_name,
            tuning='standard',
            max_fret=12,
            max_span=4
        )

        print(f"\n{chord_name} - Found {len(shapes)} total shapes")

        # Get most common shapes
        common = get_common_shapes(shapes, max_results=3)

        for i, shape in enumerate(common, 1):
            print(f"\n  Common shape {i}: {shape.to_tab_notation()}")


def demo_with_capo():
    """Demonstrate chord shapes with a capo"""
    print("\n" + "="*70)
    print("CHORDS WITH CAPO - Capo on 2nd Fret")
    print("="*70)

    # When you have a capo on the 2nd fret and play a D shape,
    # you're actually playing an E chord

    print("\nPlaying 'D' shape with capo on 2nd fret (sounds like E):")
    shapes = generate_chord_shapes(
        chord='D',
        tuning='standard',
        capo=2,
        max_fret=12,
        max_span=4
    )

    if shapes:
        # Get a simple D shape
        d_shapes = [s for s in shapes if s.to_tab_notation() == 'xx0232']
        if d_shapes:
            print_chord_shape(d_shapes[0])
        else:
            print_chord_shape(shapes[0])


def demo_alternate_tunings():
    """Demonstrate shapes in alternate tunings"""
    print("\n" + "="*70)
    print("ALTERNATE TUNINGS")
    print("="*70)

    # Drop D tuning - great for power chords and rock
    print("\n--- Drop D Tuning ---")
    print("D power chord in Drop D:")

    d5_shapes = generate_chord_shapes(
        chord='D5',
        tuning='drop d',
        max_fret=12,
        max_span=4
    )

    if d5_shapes:
        # Find the classic drop D power chord (000xxx)
        classic = [s for s in d5_shapes if s.to_tab_notation() == '000xxx']
        if classic:
            print_chord_shape(classic[0], tuning=TUNINGS['drop d'])
        else:
            print_chord_shape(d5_shapes[0], tuning=TUNINGS['drop d'])

    # DADGAD tuning - popular for folk and fingerstyle
    print("\n--- DADGAD Tuning ---")
    print("G major in DADGAD:")

    g_shapes = generate_chord_shapes(
        chord='G',
        tuning='dadgad',
        max_fret=5,
        max_span=4
    )

    if g_shapes:
        common = get_common_shapes(g_shapes, max_results=2)
        for shape in common:
            print_chord_shape(shape, tuning=TUNINGS['dadgad'])


def demo_seventh_chords():
    """Demonstrate 7th chord shapes"""
    print("\n" + "="*70)
    print("SEVENTH CHORDS")
    print("="*70)

    seventh_chords = ['Cmaj7', 'Dm7', 'Em7', 'G7', 'Am7']

    for chord_name in seventh_chords:
        shapes = generate_chord_shapes(
            chord=chord_name,
            tuning='standard',
            max_fret=12,
            max_span=4
        )

        print(f"\n{chord_name}:")

        # Show 2 most common shapes
        common = get_common_shapes(shapes, max_results=2)
        for shape in common:
            print(f"  {shape.to_tab_notation()} - Notes: {', '.join(set(shape.chord_notes))}")


def demo_specific_chord():
    """Detailed example for a specific chord"""
    print("\n" + "="*70)
    print("DETAILED EXAMPLE: E minor")
    print("="*70)

    em_shapes = generate_chord_shapes(
        chord='Em',
        tuning='standard',
        max_fret=12,
        max_span=4,
        min_notes=3
    )

    print(f"\nGenerated {len(em_shapes)} possible shapes for E minor")
    print("\nMost common/practical shapes:\n")

    common = get_common_shapes(em_shapes, max_results=5)

    for i, shape in enumerate(common, 1):
        print(f"\nShape {i}:")
        print_chord_shape(shape)


if __name__ == '__main__':
    # Run all demonstrations
    demo_basic_chords()
    demo_with_capo()
    demo_alternate_tunings()
    demo_seventh_chords()
    demo_specific_chord()

    print("\n" + "="*70)
    print("END OF EXAMPLES")
    print("="*70)

    # Show how to use the function programmatically
    print("\n" + "="*70)
    print("USING THE FUNCTION IN YOUR CODE")
    print("="*70)
    print("""
# Basic usage:
from chord_shape_generator import generate_chord_shapes

# Generate shapes for a C major chord
shapes = generate_chord_shapes(
    chord='C',              # Chord name (e.g., 'C', 'Em', 'F#m7', 'Gmaj7')
    tuning='standard',      # Tuning (see TUNINGS dict for options)
    capo=0,                 # Capo position (0 = no capo)
    max_fret=12,            # Maximum fret to consider
    max_span=4,             # Maximum finger span
    require_root=False,     # Set to True to require root note
    min_notes=3             # Minimum notes to play
)

# Each shape has:
# - shape.frets: List of fret positions [E, A, D, G, B, e]
# - shape.chord_notes: Notes being played
# - shape.to_tab_notation(): String like 'x32010'
# - shape.span: Fret span
# - shape.min_fret, shape.max_fret: Position on neck

# Example: Get tab notation for all shapes
for shape in shapes:
    print(shape.to_tab_notation())

# Example: Filter to shapes in first position (open chords)
open_shapes = [s for s in shapes if s.max_fret <= 3]
    """)
