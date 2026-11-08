# Song catalogue

`songs.json` is the single catalogue, consolidated from the former original list
and `songs2.json` update: 350 songs, 82 suggestions and one retired entry. The
redundant update file has been removed. Edit this file going forward; the app
serves it at `/song-library/catalog.json` and includes it in production builds.

Keep `catalogue_id` stable independently of the displayed source `id`. The Chain,
for example, has source ID 306 but keeps internal identity `suggestions:s1` after
moving into My songs. This preserves attached scores, notes and progress without
rewriting browser data. Retired records remain resolvable from saved projects but
are hidden from normal browsing.

`guitar_pro_files` lists verified GP4 source/download URLs, filenames, SHA-256
hashes, check dates and imported track/bar counts. Actual score binaries are kept
in `public/scores` and ignored by Git. The availability endpoint checks which
registered files are physically present and have a GP4 header. A source found on
the web is distinct from a locally playable file. Use the library's Guitar Pro
files filter, Open GP4 action, or the Kindle reader's Read GP4 action.

The initial search found 22 downloads across Fleetwood Mac, Nirvana, Radiohead
and Green Day; the existing Landslide file is also registered. The remaining songs
are not claimed to have had an exhaustive search. `node scripts/download-gp4.mjs`
restores known downloads after cloning; source metadata is tracked, binaries are
not. Import validation checks format/readability, not transcription accuracy.

Personal progress, saved score files and checkpoints remain in browser IndexedDB.
Use Backup & refresh to export backups or refresh source/file availability.
