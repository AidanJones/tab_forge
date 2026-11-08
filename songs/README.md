# Song catalogue

`songs.json` is the source catalogue: 305 songs and 128 suggestions at initial
integration. Keep its existing song IDs stable when editing it. The app reads it
through `/song-library/catalog.json` in development, and Vite copies the same
bytes into the production build. No runtime write endpoint edits this file.

Metadata, resource links, suggestions and `needs_check` flags are retained.
Links are references to external pages, not score files the player can import.
Download a compatible score yourself, then attach it to its catalogue entry.

Personal progress, promotion of suggestions, saved score files and playback
checkpoints are kept in browser IndexedDB. They overlay the catalogue rather
than rewriting it. Use **Backup & refresh → Export library backup** to retain
or transfer that work. Importing a backup merges records, keeping newer local
practice entries. Refresh catalogue reloads this JSON after repository edits.

The catalogue is included in the client build. Browser projects stay local;
publishing the app does not upload its IndexedDB contents.
