#!/usr/bin/env python3
"""
Guitar Tab to PDF Generator
Creates well-formatted PDF guitar tabs from simple text input
"""

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch
from typing import List, Dict, Tuple


# Chord definitions: fret positions for each string (0 = open, -1 = muted/not played)
# Format: [E, A, D, G, B, e] (from low to high)
CHORD_LIBRARY = {
    'Am': {'frets': [0, 0, 2, 2, 1, 0], 'name': 'A minor'},
    'C': {'frets': [-1, 3, 2, 0, 1, 0], 'name': 'C major'},
    'Dm': {'frets': [-1, -1, 0, 2, 3, 1], 'name': 'D minor'},
    'Em': {'frets': [0, 2, 2, 0, 0, 0], 'name': 'E minor'},
    'G': {'frets': [3, 2, 0, 0, 0, 3], 'name': 'G major'},
    'A': {'frets': [0, 0, 2, 2, 2, 0], 'name': 'A major'},
    'D': {'frets': [-1, -1, 0, 2, 3, 2], 'name': 'D major'},
    'E': {'frets': [0, 2, 2, 1, 0, 0], 'name': 'E major'},
    'F': {'frets': [1, 3, 3, 2, 1, 1], 'name': 'F major'},
}

# Scale definitions: semitone intervals from root
SCALE_INTERVALS = {
    'minor': [0, 2, 3, 5, 7, 8, 10, 12],  # Natural minor scale
    'major': [0, 2, 4, 5, 7, 9, 11, 12],   # Major scale
    'pentatonic_minor': [0, 3, 5, 7, 10, 12],
    'pentatonic_major': [0, 2, 4, 7, 9, 12],
}

# Note names
NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']

# Guitar standard tuning (fret 0 for each string)
STANDARD_TUNING = ['E', 'A', 'D', 'G', 'B', 'E']  # Low to high


class GuitarTabPDF:
    def __init__(self, filename="guitar_tab.pdf"):
        """Initialize the PDF canvas"""
        self.filename = filename
        self.c = canvas.Canvas(filename, pagesize=letter)
        self.width, self.height = letter
        self.y_position = self.height - 1 * inch

    def add_title(self, title):
        """Add a title to the PDF"""
        self.c.setFont("Helvetica-Bold", 18)
        self.c.drawString(1 * inch, self.y_position, title)
        self.y_position -= 0.5 * inch

    def add_subtitle(self, subtitle):
        """Add a subtitle or description"""
        self.c.setFont("Helvetica", 12)
        self.c.drawString(1 * inch, self.y_position, subtitle)
        self.y_position -= 0.4 * inch

    def add_tab(self, tab_text):
        """
        Add guitar tab notation to the PDF
        tab_text should be a multi-line string with standard tab notation
        """
        self.c.setFont("Courier", 10)

        lines = tab_text.strip().split('\n')
        for line in lines:
            self.c.drawString(1 * inch, self.y_position, line)
            self.y_position -= 0.15 * inch

        # Add some spacing after the tab
        self.y_position -= 0.3 * inch

    def add_text(self, text):
        """Add regular text content"""
        self.c.setFont("Helvetica", 10)
        self.c.drawString(1 * inch, self.y_position, text)
        self.y_position -= 0.3 * inch

    def draw_chord_diagram(self, x, y, chord_name, frets, width=60, height=80):
        """
        Draw a chord diagram at position (x, y)
        frets: list of 6 integers representing fret positions for each string
               -1 = muted/not played, 0 = open string, 1+ = fret number
        """
        c = self.c
        string_spacing = width / 5
        fret_height = height / 5

        # Draw chord name
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + width/2, y + height + 10, chord_name)

        # Find the fret range to display
        played_frets = [f for f in frets if f > 0]
        if played_frets:
            min_fret = min(played_frets)
            max_fret = max(played_frets)

            # If all frets are low (0-4), show frets 1-4
            if max_fret <= 4:
                start_fret = 1
            else:
                start_fret = max(1, min_fret - 1)
        else:
            start_fret = 1

        # Draw fret position indicator if not starting at fret 1
        if start_fret > 1:
            c.setFont("Helvetica", 8)
            c.drawString(x - 15, y + height - fret_height/2, f"{start_fret}fr")

        # Draw vertical lines (strings)
        for i in range(6):
            string_x = x + i * string_spacing
            c.line(string_x, y, string_x, y + height)

        # Draw horizontal lines (frets)
        for i in range(6):
            fret_y = y + i * fret_height
            c.line(x, fret_y, x + width, fret_y)

        # Draw thicker line for the nut (if showing from fret 1)
        if start_fret == 1:
            c.setLineWidth(3)
            c.line(x, y + height, x + width, y + height)
            c.setLineWidth(1)

        # Draw finger positions and open/muted indicators
        for string_idx, fret in enumerate(frets):
            string_x = x + string_idx * string_spacing

            if fret == -1:
                # Muted string - draw X above
                c.setFont("Helvetica-Bold", 12)
                c.drawCentredString(string_x, y + height + 5, "×")
            elif fret == 0:
                # Open string - draw O above
                c.setFont("Helvetica-Bold", 10)
                c.drawCentredString(string_x, y + height + 5, "○")
            elif fret >= start_fret:
                # Fretted note - draw filled circle
                fret_offset = fret - start_fret
                dot_y = y + height - (fret_offset * fret_height + fret_height/2)
                c.circle(string_x, dot_y, 4, fill=1)

    def add_chord_progression(self, chords: List[str]):
        """
        Add a row of chord diagrams at the current position
        chords: list of chord names (e.g., ['Am', 'C', 'Dm', 'Em'])
        """
        if not chords:
            return

        self.c.setFont("Helvetica-Bold", 14)
        self.c.drawString(1 * inch, self.y_position, "Chord Progression:")
        self.y_position -= 0.3 * inch

        # Draw chords in a row
        x_start = 1 * inch
        chord_spacing = 80

        for i, chord_name in enumerate(chords):
            if chord_name in CHORD_LIBRARY:
                chord_data = CHORD_LIBRARY[chord_name]
                x_pos = x_start + i * chord_spacing
                y_pos = self.y_position - 80

                self.draw_chord_diagram(x_pos, y_pos, chord_name, chord_data['frets'])

        # Move y_position down past the chord diagrams
        self.y_position -= 120

    def add_scale_tab(self, root_note: str, scale_type: str = 'minor', start_string: int = 5, start_fret: int = 0):
        """
        Generate and add a scale tab (one note after another)
        root_note: the root note of the scale (e.g., 'A', 'C', 'D#')
        scale_type: type of scale ('minor', 'major', 'pentatonic_minor', 'pentatonic_major')
        start_string: which string to start on (0=low E, 5=high e)
        start_fret: which fret to start on
        """
        if scale_type not in SCALE_INTERVALS:
            return

        intervals = SCALE_INTERVALS[scale_type]

        # Calculate root note index
        root_idx = NOTES.index(root_note)

        # Generate fret positions for the scale
        scale_frets = []
        current_fret = start_fret

        for interval in intervals:
            target_note = NOTES[(root_idx + interval) % 12]
            # Find this note on the guitar starting from current position
            # For simplicity, just move up the same string
            scale_frets.append(current_fret + interval)

        # Create tab notation
        tab_lines = [''] * 6
        string_names = ['e', 'B', 'G', 'D', 'A', 'E']

        # Place the scale on the specified string
        for fret in scale_frets:
            for i in range(6):
                if i == (5 - start_string):  # Convert to top-to-bottom index
                    tab_lines[i] += f'--{fret}'
                else:
                    tab_lines[i] += '--' + '-' * len(str(fret))

        # Close each line
        for i in range(6):
            tab_lines[i] += '--|'

        # Add string labels
        for i in range(6):
            tab_lines[i] = string_names[i] + '|' + tab_lines[i]

        tab_text = '\n'.join(tab_lines)

        self.add_text(f"{root_note} {scale_type.replace('_', ' ').title()} Scale - Sequential Notes")
        self.add_tab(tab_text)

    def add_fretboard_diagram(self, root_note: str, scale_type: str = 'minor', num_frets: int = 12):
        """
        Add a fretboard diagram showing where all notes in the scale appear
        root_note: the root note of the scale
        scale_type: type of scale
        num_frets: number of frets to display
        """
        if scale_type not in SCALE_INTERVALS:
            return

        intervals = SCALE_INTERVALS[scale_type]
        root_idx = NOTES.index(root_note)

        # Calculate which notes are in the scale
        scale_notes = set()
        for interval in intervals:
            scale_notes.add(NOTES[(root_idx + interval) % 12])

        self.c.setFont("Helvetica-Bold", 12)
        self.c.drawString(1 * inch, self.y_position, f"{root_note} {scale_type.replace('_', ' ').title()} - Fretboard Diagram")
        self.y_position -= 0.3 * inch

        # Draw fretboard
        fret_width = 30
        string_height = 15
        x_start = 1 * inch
        y_start = self.y_position

        # Draw strings (horizontal lines)
        for string_idx in range(6):
            y = y_start - string_idx * string_height
            self.c.line(x_start, y, x_start + num_frets * fret_width, y)

        # Draw frets (vertical lines)
        for fret in range(num_frets + 1):
            x = x_start + fret * fret_width
            if fret == 0:
                self.c.setLineWidth(3)
            else:
                self.c.setLineWidth(1)
            self.c.line(x, y_start, x, y_start - 5 * string_height)

        self.c.setLineWidth(1)

        # Mark scale notes
        self.c.setFont("Helvetica-Bold", 8)
        for string_idx, string_note in enumerate(STANDARD_TUNING):
            string_note_idx = NOTES.index(string_note)
            y = y_start - string_idx * string_height

            for fret in range(num_frets + 1):
                note_idx = (string_note_idx + fret) % 12
                note = NOTES[note_idx]

                if note in scale_notes:
                    x = x_start + fret * fret_width

                    # Adjust position for fret 0
                    if fret == 0:
                        x += fret_width / 2
                    else:
                        x -= fret_width / 2

                    # Draw circle for scale note
                    if note == root_note:
                        # Root notes - filled circle with R
                        self.c.circle(x, y, 6, fill=1)
                        self.c.setFillColorRGB(1, 1, 1)  # White text
                        self.c.drawCentredString(x, y - 2.5, 'R')
                        self.c.setFillColorRGB(0, 0, 0)  # Back to black
                    else:
                        # Other scale notes - open circle
                        self.c.circle(x, y, 5, fill=0)
                        self.c.drawCentredString(x, y - 2.5, '•')

        # Add fret numbers
        self.c.setFont("Helvetica", 8)
        for fret in range(1, num_frets + 1):
            x = x_start + fret * fret_width - fret_width / 2
            self.c.drawCentredString(x, y_start - 6 * string_height, str(fret))

        # Move position down
        self.y_position -= (7 * string_height + 0.3 * inch)

    def save(self):
        """Save the PDF file"""
        self.c.save()
        print(f"PDF saved as: {self.filename}")


def create_c_major_scale_example():
    """Create an example PDF with a C major scale"""

    # Initialize PDF
    pdf = GuitarTabPDF("c_major_scale.pdf")

    # Add title and description
    pdf.add_title("C Major Scale - Guitar Tab")
    pdf.add_subtitle("Basic C Major Scale (One Octave)")

    # C Major scale on the A string (5th string)
    tab1 = """
e|--------------------------------|
B|--------------------------------|
G|--------------------------------|
D|--------------------------------|
A|--3--5--7--8--10--12--13--15----|
E|--------------------------------|
"""

    pdf.add_text("Pattern 1: C Major Scale on A String")
    pdf.add_tab(tab1)

    # C Major scale - position 1 (open position)
    tab2 = """
e|--0--1--3-----------------------|
B|--------0--1--3-----------------|
G|--------------0--2--------------|
D|--------------------0--2--3-----|
A|--------------------------3-----|
E|--------------------------------|
"""

    pdf.add_text("Pattern 2: C Major Scale - Open Position")
    pdf.add_tab(tab2)

    # C Major scale box pattern
    tab3 = """
e|-----8--10--12------------------|
B|--8--10--12---------------------|
G|--9--10--12---------------------|
D|--10-12-------------------------|
A|--10-12-------------------------|
E|--8--10--12---------------------|
"""

    pdf.add_text("Pattern 3: C Major Scale - 8th Position Box")
    pdf.add_tab(tab3)

    # Add legend/notes
    pdf.add_text("Legend:")
    pdf.add_text("Numbers represent fret positions")
    pdf.add_text("0 = Open string, play without fretting")
    pdf.add_text("Read from left to right, top to bottom")

    # Save the PDF
    pdf.save()


def create_simple_example():
    """Create a very simple example with just one scale pattern"""

    pdf = GuitarTabPDF("simple_scale.pdf")

    pdf.add_title("Simple Guitar Scale Example")
    pdf.add_subtitle("Chromatic scale exercise")

    tab = """
e|--0--1--2--3--4--5--6--7--8--9--10--11--12--|
B|--------------------------------------------|
G|--------------------------------------------|
D|--------------------------------------------|
A|--------------------------------------------|
E|--------------------------------------------|
"""

    pdf.add_tab(tab)
    pdf.add_text("Practice this chromatic scale slowly, one note at a time.")

    pdf.save()


def create_a_minor_practice_sheet():
    """Create a practice sheet for A minor scale with chord progression"""

    pdf = GuitarTabPDF("a_minor_practice.pdf")

    # Add title
    pdf.add_title("A Minor Scale Practice Sheet")
    pdf.add_subtitle("Scale Practice with Chord Progressions")

    # Add chord progression at the top
    pdf.add_chord_progression(['Am', 'C', 'Dm', 'Em'])

    # Add the scale in tab format (sequential notes)
    pdf.add_scale_tab('A', 'minor', start_string=5, start_fret=0)

    # Add another scale pattern starting from a different position
    pdf.add_scale_tab('A', 'minor', start_string=4, start_fret=2)

    # Add fretboard diagram showing the scale across the neck
    pdf.add_fretboard_diagram('A', 'minor', num_frets=12)

    # Add practice instructions
    pdf.add_text("Practice Instructions:")
    pdf.add_text("1. Start by practicing each chord until you can play them cleanly")
    pdf.add_text("2. Practice the scale patterns slowly, focusing on accuracy")
    pdf.add_text("3. Use the fretboard diagram to visualize scale positions")
    pdf.add_text("4. Root notes (R) are marked on the fretboard diagram")

    pdf.save()


if __name__ == "__main__":
    # Create the A minor practice sheet
    create_a_minor_practice_sheet()

    # Create the C major scale example
    create_c_major_scale_example()

    # Create a simple example
    create_simple_example()

    print("\n✓ Guitar tab PDFs created successfully!")
    print("  - a_minor_practice.pdf")
    print("  - c_major_scale.pdf")
    print("  - simple_scale.pdf")
