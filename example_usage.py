#!/usr/bin/env python3
"""
Example usage of the Guitar Tab PDF Generator
This shows how easy it is to create your own guitar tab PDFs
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


if __name__ == "__main__":
    create_custom_tab()
    print("\n✓ Your custom tab has been created as 'my_custom_tab.pdf'")
