# tab_forge

The aim of this repository is to take a basic guitar tab and use it to create a well formatted pdf of the guitar tab.

## Overview

**tab_forge** is a simple Python tool that converts ASCII guitar tabs (the kind you'd write in a text file) into beautifully formatted PDFs. Perfect for creating clean, printable guitar tabs for practice or sharing.

## Features

- 🎸 Convert text-based guitar tabs to professional-looking PDFs
- 📄 Simple, intuitive API
- 🎨 Clean, monospaced formatting for tab notation
- 📝 Support for titles, subtitles, and annotations
- 🚀 Easy to use - just define your tab and generate!

## Installation

```bash
pip install -r requirements.txt
```

## Quick Start

### Run the example scripts

```bash
# Generate example tabs (C major scale examples)
python tab_to_pdf.py

# Create a custom tab
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
- `tab_to_pdf.py` - Main library with C major scale examples
- `example_usage.py` - Shows how to create custom tabs

## Requirements

- Python 3.6+
- reportlab

## License

See LICENSE file for details.
