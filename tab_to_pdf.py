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


if __name__ == "__main__":
    # Create the C major scale example
    create_c_major_scale_example()

    # Create a simple example
    create_simple_example()

    print("\n✓ Guitar tab PDFs created successfully!")
    print("  - c_major_scale.pdf")
    print("  - simple_scale.pdf")
