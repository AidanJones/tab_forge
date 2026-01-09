#!/usr/bin/env python3
"""
Example usage of the Guitar Tab PDF Generator
This shows how easy it is to create your own guitar tab PDFs with chords and scales
"""

from tab_to_pdf import GuitarTabPDF


def create_custom_tab():
    """Create your own custom guitar tab PDF"""

    # Initialize a new PDF
    pdf = GuitarTabPDF("my_custom_tab.pdf")

    # Add title and metadata
    pdf.add_title("My Awesome Guitar Riff")
    pdf.add_subtitle("By: Your Name")

    # Define your tab as a multi-line string
    # Use standard ASCII tab notation
    my_riff = """
e|-------------------------------------|
B|-------------------------------------|
G|-------------------------------------|
D|--5--5--7--7--8--8--7--5-------------|
A|--3--3--5--5--6--6--5--3-------------|
E|-------------------------------------|
"""

    pdf.add_text("Main Riff (Play 4x)")
    pdf.add_tab(my_riff)

    # Add another section
    solo = """
e|--12--12--15--15--17--15--12---------|
B|-------------------------------------|
G|-------------------------------------|
D|-------------------------------------|
A|-------------------------------------|
E|-------------------------------------|
"""

    pdf.add_text("Solo Section")
    pdf.add_tab(solo)

    # Add notes or instructions
    pdf.add_text("Notes:")
    pdf.add_text("- Play with a steady rhythm")
    pdf.add_text("- Use palm muting on the power chords")
    pdf.add_text("- Tempo: 120 BPM")

    # Save the PDF
    pdf.save()


def create_scale_practice_with_chords():
    """Create a practice sheet with chords and scale patterns"""

    pdf = GuitarTabPDF("scale_practice.pdf")

    # Add title
    pdf.add_title("G Major Scale Practice")
    pdf.add_subtitle("With Common Chord Progressions")

    # Add chord progression
    pdf.add_chord_progression(['G', 'Em', 'C', 'D'])

    # Add scale patterns
    pdf.add_scale_tab('G', 'major', start_string=6, start_fret=3)
    pdf.add_scale_tab('G', 'major', start_string=5, start_fret=10)

    # Add fretboard diagram
    pdf.add_fretboard_diagram('G', 'major', num_frets=12)

    # Add practice tips
    pdf.add_text("Practice Tips:")
    pdf.add_text("- Learn the chord shapes first")
    pdf.add_text("- Practice scales slowly with a metronome")
    pdf.add_text("- Memorize root note positions (marked with R)")
    pdf.add_text("- Try improvising over the chord progression using the scale")

    pdf.save()


def create_pentatonic_practice():
    """Create a pentatonic scale practice sheet"""

    pdf = GuitarTabPDF("pentatonic_practice.pdf")

    pdf.add_title("E Minor Pentatonic Scale")
    pdf.add_subtitle("Blues and Rock Practice Sheet")

    # Add related chords
    pdf.add_chord_progression(['Em', 'G', 'A'])

    # Add pentatonic scale patterns
    pdf.add_scale_tab('E', 'pentatonic_minor', start_string=6, start_fret=0)

    # Add fretboard diagram
    pdf.add_fretboard_diagram('E', 'pentatonic_minor', num_frets=12)

    pdf.add_text("The pentatonic scale is perfect for blues and rock solos!")

    pdf.save()


if __name__ == "__main__":
    # Create different types of practice sheets
    create_custom_tab()
    create_scale_practice_with_chords()
    create_pentatonic_practice()

    print("\n✓ Custom guitar tabs have been created:")
    print("  - my_custom_tab.pdf")
    print("  - scale_practice.pdf")
    print("  - pentatonic_practice.pdf")
