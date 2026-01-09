"""
Markdown Tab Parser for Guitar Tabs

Parses a simple markdown format for guitar tabs and converts it to PDF.
Designed for easy note-taking while watching video lessons.

Format Specification:
---------------------

# Header Section (optional)
key: C
tuning: standard
title: Song Name
artist: Artist Name

# Chords Section
chords:
C: x32010
Am: x02210

# Tab Sections
[Section Name - ChordName]
3f1s 2f5s 0s3
note: This is a note about this section

# Lyrics
"This is a lyric line"

# Chord shorthand
em  (plays entire E minor chord)

# Multiple notes at once
2f5s + 2f4s  (both notes played together)

Notation:
- 3f1s = 3rd fret, 1st string (high E)
- 0s2 = open 2nd string
- [C] = chord label above the tab
- "text" = lyrics
- note: = annotation/note
- em, C, etc = chord shorthand (plays all notes)
"""

import re
from typing import Dict, List, Tuple, Optional
from tab_to_pdf import GuitarTabPDF


class MarkdownTabParser:
    def __init__(self):
        self.metadata = {}
        self.chords = {}
        self.sections = []

    def parse_file(self, filepath: str) -> None:
        """Parse a markdown tab file"""
        with open(filepath, 'r') as f:
            content = f.read()
        self.parse(content)

    def parse(self, content: str) -> None:
        """Parse markdown tab content"""
        lines = content.split('\n')

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # Skip empty lines
            if not line:
                i += 1
                continue

            # Parse metadata (key, tuning, title, artist)
            if ':' in line and not line.startswith('[') and not line.startswith('chords:'):
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                if key in ['key', 'tuning', 'title', 'artist']:
                    self.metadata[key] = value
                i += 1
                continue

            # Parse chords section
            if line.lower() == 'chords:':
                i += 1
                while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('['):
                    chord_line = lines[i].strip()
                    if ':' in chord_line:
                        chord_name, chord_frets = chord_line.split(':', 1)
                        self.chords[chord_name.strip()] = chord_frets.strip()
                    i += 1
                continue

            # Parse section headers [Section Name] or [Section Name - Chord]
            if line.startswith('[') and line.endswith(']'):
                section_text = line[1:-1]
                section_name = section_text
                section_chord = None

                if ' - ' in section_text:
                    section_name, section_chord = section_text.split(' - ', 1)
                    section_name = section_name.strip()
                    section_chord = section_chord.strip()

                section = {
                    'name': section_name,
                    'chord': section_chord,
                    'content': []
                }

                # Parse section content
                i += 1
                while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('['):
                    content_line = lines[i].strip()
                    section['content'].append(content_line)
                    i += 1

                self.sections.append(section)
                continue

            i += 1

    def parse_note_notation(self, notation: str) -> List[Tuple[int, int]]:
        """
        Parse note notation like '3f1s' or '2f5s + 2f4s'
        Returns list of (fret, string) tuples
        """
        notes = []

        # Split by '+' for multiple notes
        parts = [p.strip() for p in notation.split('+')]

        for part in parts:
            # Match pattern like 3f1s or 0s1
            match = re.match(r'(\d+)f(\d+)s', part)
            if match:
                fret = int(match.group(1))
                string = int(match.group(2))
                notes.append((fret, string))
                continue

            # Match pattern like 0s1 (open string)
            match = re.match(r'0s(\d+)', part)
            if match:
                string = int(match.group(1))
                notes.append((0, string))
                continue

        return notes

    def convert_to_tab_string(self, notes_line: str, section_chord: Optional[str] = None) -> str:
        """
        Convert a line of note notation to traditional tab format

        Args:
            notes_line: Line like "3f1s 2f5s 0s3" or "em"
            section_chord: Optional chord name from section header

        Returns:
            Traditional tab string with 6 lines
        """
        # Check if it's a chord shorthand (single word that's a chord name)
        if notes_line.strip() in self.chords or notes_line.strip().lower() in ['em', 'am', 'dm', 'c', 'g', 'a', 'd', 'e', 'f']:
            return self._chord_to_tab(notes_line.strip())

        # Initialize 6 strings
        strings = [[] for _ in range(6)]

        # Split line by spaces to get individual notes/chords
        elements = notes_line.split()

        for element in elements:
            # Check if it's a simultaneous note group (contains +)
            if '+' in element:
                notes = self.parse_note_notation(element)
                # Find max width needed
                max_width = max(len(str(n[0])) for n in notes) if notes else 1

                # Add notes to their respective strings
                for fret, string in notes:
                    string_idx = string - 1  # Convert 1-indexed to 0-indexed
                    if 0 <= string_idx < 6:
                        strings[string_idx].append(str(fret).ljust(max_width))

                # Fill other strings with dashes
                for i in range(6):
                    if i not in [n[1] - 1 for n in notes]:
                        strings[i].append('-' * max_width)
            else:
                # Single note
                notes = self.parse_note_notation(element)
                if notes:
                    fret, string = notes[0]
                    string_idx = string - 1
                    fret_str = str(fret)

                    # Add note to the correct string
                    if 0 <= string_idx < 6:
                        strings[string_idx].append(fret_str)

                    # Fill other strings with dashes
                    for i in range(6):
                        if i != string_idx:
                            strings[i].append('-' * len(fret_str))

        # Convert to traditional tab format (high e to low E)
        # String order: 1=e(high), 2=B, 3=G, 4=D, 5=A, 6=E(low)
        # Display order: e, B, G, D, A, E
        string_names = ['e', 'B', 'G', 'D', 'A', 'E']
        tab_lines = []

        for i, name in enumerate(string_names):
            line = f"{name}|"
            if strings[i]:
                line += '-'.join(strings[i])
            else:
                line += '-'
            line += '|'
            tab_lines.append(line)

        return '\n'.join(tab_lines)

    def _chord_to_tab(self, chord_name: str) -> str:
        """Convert a chord name to a tab showing all strings played together"""
        from tab_to_pdf import CHORD_LIBRARY

        # Check our parsed chords first
        if chord_name in self.chords:
            fret_string = self.chords[chord_name]
            frets = self._parse_chord_frets(fret_string)
        # Then check the built-in library
        elif chord_name in CHORD_LIBRARY:
            frets = CHORD_LIBRARY[chord_name]['frets']
        else:
            return f"# Unknown chord: {chord_name}"

        # Convert frets array to tab
        # frets[0] = low E (6th string), frets[5] = high e (1st string)
        string_names = ['e', 'B', 'G', 'D', 'A', 'E']
        tab_lines = []

        for i, name in enumerate(string_names):
            # Reverse index to match frets array
            fret_idx = 5 - i
            fret = frets[fret_idx]

            if fret == -1:
                line = f"{name}|x|"
            else:
                line = f"{name}|{fret}|"

            tab_lines.append(line)

        return '\n'.join(tab_lines)

    def _parse_chord_frets(self, fret_string: str) -> List[int]:
        """
        Parse chord fret notation like 'x32010' or '022000'
        Returns list of 6 fret positions [E, A, D, G, B, e] (low to high)
        """
        frets = []
        for char in fret_string:
            if char.lower() == 'x':
                frets.append(-1)
            elif char.isdigit():
                frets.append(int(char))

        # Pad to 6 strings if needed
        while len(frets) < 6:
            frets.append(-1)

        return frets[:6]

    def to_pdf(self, output_path: str) -> None:
        """Generate PDF from parsed markdown"""
        pdf = GuitarTabPDF(output_path)

        # Add title and metadata
        if 'title' in self.metadata:
            pdf.add_title(self.metadata['title'])
            if 'artist' in self.metadata:
                pdf.add_subtitle(f"Artist: {self.metadata['artist']}")

        # Add key and tuning info
        info_parts = []
        if 'key' in self.metadata:
            info_parts.append(f"Key: {self.metadata['key']}")
        if 'tuning' in self.metadata:
            info_parts.append(f"Tuning: {self.metadata['tuning']}")

        if info_parts:
            pdf.add_text(' | '.join(info_parts))

        # Add chord diagrams if any
        if self.chords:
            chord_names = list(self.chords.keys())
            # Only add chords that are in the chord library or parse them
            valid_chords = []
            for chord in chord_names:
                from tab_to_pdf import CHORD_LIBRARY
                if chord in CHORD_LIBRARY:
                    valid_chords.append(chord)

            if valid_chords:
                pdf.add_chord_progression(valid_chords)

        # Add sections
        for section in self.sections:
            # Add section header
            section_header = f"[{section['name']}]"
            if section['chord']:
                section_header += f" - {section['chord']}"

            pdf.add_subtitle(section_header)

            # Process section content
            for line in section['content']:
                # Check for lyrics (quoted text)
                if line.startswith('"') and line.endswith('"'):
                    lyrics = line[1:-1]
                    pdf.add_text(f"♪ {lyrics}")
                # Check for notes
                elif line.lower().startswith('note:'):
                    note_text = line[5:].strip()
                    pdf.add_text(f"Note: {note_text}")
                # Otherwise, it's tab notation
                else:
                    tab_string = self.convert_to_tab_string(line, section['chord'])
                    pdf.add_tab(tab_string)

        pdf.save()


def main():
    """Example usage"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python markdown_tab_parser.py <input.md> [output.pdf]")
        print("\nExample markdown format:")
        print("""
key: C
tuning: standard
title: My Song
artist: Artist Name

chords:
C: x32010
Am: x02210

[Intro - C]
3f6s 2f5s 0s4 0s3 0s2 0s1
note: Play slowly

[Verse 1]
"We are the champions"
[Am]
0s5 1f5s 2f5s
note: Strum gently

[Chorus]
em
        """)
        return

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.md', '.pdf')

    parser = MarkdownTabParser()
    parser.parse_file(input_file)
    parser.to_pdf(output_file)

    print(f"Generated PDF: {output_file}")


if __name__ == '__main__':
    main()
