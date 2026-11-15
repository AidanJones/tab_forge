# GitHub Pages and private local projects

The public site is a static build, deployed by GitHub Actions from `main`.
GitHub Pages serves the generated HTML/JS/JSON/font/SoundFont assets; no Node
server is needed after deployment. Source-only branch publishing is unsuitable
because it does not run Vite or generate the static Kindle resources.

URLs:

- Home: https://aidanjones.github.io/tab_forge/
- Creator: https://aidanjones.github.io/tab_forge/create.html
- My files: https://aidanjones.github.io/tab_forge/my-files.html
- Kindle: https://aidanjones.github.io/tab_forge/kindle.html

The approved public content is the app, catalogue and original exercises.
Downloaded GP4 files remain local. `build:pages` uses an asset allowlist and an
empty score discovery list, excluding both raw private scores and SVG/JSON pages
derived from them. Guards validate the artifact, and `test:pages` checks the
repository URL prefix. Root/index is Practice home; editor links resolve to
create.html in public builds while localhost editor links stay unchanged.

My files has no login or cloud account. It shares IndexedDB with the practice
player on the same browser origin. Upload/import operations read and parse local
files, store blobs locally and issue no upload request. Another device/browser,
a different address or clearing site data gives a separate library. Library
backups transfer projects, source notes and checkpoints. Existing localhost data
must be exported at the old origin and imported at the new hosted origin.

Optional local folders require explicit user selection and write permission.
The app creates a tab_forge subdirectory and a new timestamped/random snapshot
for each backup. Score files and original creator notes are included alongside
library JSON. Previously created snapshots remain intact. Direct folder access
is feature-detected; downloads work without it. The remembered directory handle
is stored locally in a separate IndexedDB database, never in the exported/public
catalogue. It does not grant the website arbitrary filesystem access or automatic
cross-device sync.

The quick riff builder extends the existing creator: selected fret positions
become shorthand lesson notes, inserted as a new section. Existing text is kept.
Standard Guitar Pro GP7, alphaTex and MIDI exports remain supported. GP4 is an
import format; UI wording must not claim that `.gp` output is a GP4 file.

References:

- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Vite project-site base paths](https://vite.dev/guide/static-deploy#github-pages)
- [Directory picker permission and compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)
