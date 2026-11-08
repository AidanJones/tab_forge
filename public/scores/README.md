# Your practice scores

Place your downloaded `.gp4` files in this folder. Practice also accepts `.gp3`,
`.gp5`, `.gpx`, `.gp`, MusicXML and alphaTex files.

Start the app from the repository root with `pnpm dev` (or `npm run dev` after
installing dependencies). Open Practice, click **Refresh library**, choose a
score and click **Load selected**. Keep the files directly in this folder;
subfolders are not scanned.

Your score files are ignored by Git. Only this README is tracked. A production
build includes the files currently in this folder, so build again after changing
the library. The normal file picker and drag-and-drop also remain available.


Verified catalogue downloads are referenced by `guitar_pro_files` in
`songs/songs.json`. Use My songs → More filters → Guitar Pro files → GP4 ready to
play, then View song → Open GP4. Source found also includes known downloads that
are missing from this server. After cloning, run `node scripts/download-gp4.mjs`
to restore known public downloads. Existing files are never overwritten.
