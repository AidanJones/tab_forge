# Song catalogue

`songs.json` is the original catalogue (305 songs and 128 suggestions).
`songs2.json` is the updated list (350 songs and 82 suggestions). Both source
files are kept intact. The app merges them when serving
`/song-library/catalog.json` in development and when building the production asset.
If the update file is absent, it falls back to the original list.

The update supplies current titles, metadata, resource links and membership in
My songs / Suggestions. Existing IDs within a group are retained, including
corrected titles. Entries moved from Suggestions to My songs are matched by
title and artist and keep their original internal `catalogue_id` (for example,
The Chain keeps `suggestions:s1` even though its new source ID is 306). This
preserves existing browser score attachments, promotions, notes and progress
without rewriting or migrating personal data.

Entries absent from the update are retained under `retired` in the generated
catalogue, hidden from browsing but still resolvable from saved projects. The
current update retires Holly by Nirvana. IDs should remain stable in future edits;
keep the original catalogue as the identity baseline. The merge is deliberately
conservative: it does not guess artist/title spelling matches beyond case and
surrounding whitespace. Duplicate internal identities fail validation.

Metadata and links are supplied data, not newly verified by this merge. Links
reference external pages, not score files the player can import. Download a
compatible score yourself, then attach it to its catalogue entry.

Personal progress, saved score files and playback checkpoints stay in browser
IndexedDB. Use **Backup & refresh → Export library backup** to retain or transfer
that work. **Refresh catalogue** reloads the merged data after repository edits.
The catalogue is included in the client build; publishing the app does not upload
browser projects or practice notes.
