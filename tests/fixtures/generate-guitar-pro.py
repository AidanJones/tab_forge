"""Regenerate original test fixtures with PyGuitarPro==0.11 (test tool only).

The four-note exercise is original tab_forge test content, not a downloaded tab.
"""
from pathlib import Path
import guitarpro
from guitarpro import models as m

song = m.Song(title="Original four notes", artist="tab_forge", tempo=120)
track = song.tracks[0]
track.name = "Guitar"
track.channel.instrument = 25
voice = track.measures[0].voices[0]
for fret in [0, 2, 3, 0]:
    beat = m.Beat(voice, duration=m.Duration(value=4), status=m.BeatStatus.normal)
    beat.notes.append(m.Note(beat, value=fret, string=6, type=m.NoteType.normal))
    voice.beats.append(beat)

for extension in ["gp4", "gp5"]:
    guitarpro.write(song, str(Path(__file__).with_name(f"original-four-notes.{extension}")))
