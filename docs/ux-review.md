# User journeys and layout review

Reviewed 7 November 2026 on both pages, at 1440px desktop and 390px phone widths.
This is an inspection of the app and its working flows, not a study with recruited users.

## What the app is for

The central behaviour is **choose something to work on → prepare → practise →
get feedback → repeat or move on**. Writing and saving support that loop.
Microphone input and USB MIDI are capabilities within a task, rather than tasks
that need to dominate every screen.

| User story | Starting point | Main action | Next step / return |
|---|---|---|---|
| I want to tune before playing. | Tune | Start microphone; pluck one string | Chords, Scales or back to the same song |
| I want to learn a downloaded song slowly. | Songs | Open file / library / demo; Play | Lower speed; choose Score or Play-along |
| I want to repeat a difficult passage. | Loaded song | Passage & tracks; select bars; Loop | Clear selection to return to the whole song |
| I want to follow notes at my own pace. | Play-along | Wait for notes; enable mic; Start listening | Correct pitch advances; Pause, repeat or return |
| I want a chord to ring cleanly. | Chords | Choose shape; Check this chord | Check each sounding string, reset or choose another |
| I want to learn a scale. | Scales | Choose key, pattern and direction | Load its tab, or Practise scale with microphone; Back to scales |
| I want to capture a riff or lesson. | Write | Write notes/chords/lyrics; Update preview | Practise this tab; Back to writing; save/share |
| I want playback on my FM1. | Loaded song | USB MIDI settings | Connect output, enable sending; return to the same score |
| I want a portable copy. | Loaded score | Save / export | Guitar Pro, alphaTex, MIDI or Print / PDF |

## Main problems found

1. **The app exposed implementation areas instead of clear tasks.** Tuning,
   chords and scales were buried in one disclosure inside a song player, even
   when no song was needed. “Editor” and “Practice” did not describe the toolkit.
2. **The score came after configuration.** On an empty phone session its top was
   about 1,919px down Songs and 2,535px down Write. Passage settings, hand
   controls and inactive exports all appeared before the main result.
3. **The next step was unclear.** Writing, previewing and practising were all
   visible at once. Scale practice loaded a new screen without a clear return.
4. **Playback controls were duplicated.** Global and scrolling Play/Stop buttons
   could give the impression of two players.
5. **Moving around risked losing context.** Navigation was mainly cross-page
   links. Drafts had no browser recovery and generated exercises could overwrite
   the current lesson. Shortcuts could target a hidden player after moving to a tool.
6. **Secondary details competed with the task.** Folder paths, file formats,
   input sensitivity and device details distracted from opening a song or
   selecting a scale. Empty states showed many unusable controls.

## Changes implemented

- A consistent **Write / Songs / Tune / Chords / Scales** navigation bar on both
  pages. Active state and descriptive headings explain where you are.
- Tune, Chords and Scales are separate destinations with the same mounted
  underlying controls. A song is not required to use them.
- Hash navigation supports real browser Back/Forward. Same-page navigation
  retains the imported score, cursor and trainer selections. Leaving a task
  pauses playback and releases microphone capture; returning never autoplays.
  The explicit scale-to-microphone-practice action keeps capture available for
  that handoff. Task navigation remains visible while scrolling.
- The score or scrolling view comes immediately after the transport and view
  switch. Hand guidance, notation/shape options, passages/tracks, USB MIDI and
  exports are optional disclosures. There is one Play/Stop control set.
- The library folds away after a score is chosen and the ready player is brought
  into view. “Change song” and “Open a score” remain available.
- Write has an explicit **Practise this tab → Back to writing** flow. Focused
  practice hides the source editor without throwing it away.
- Drafts are saved in this browser. Replacing a lesson with a scale, demo or
  shared lesson preserves a session copy behind **Restore previous lesson**.
  Local browser storage is optional; file downloads remain the durable save.
- Scale practice opens the appropriate player mode and provides **Back to
  scales**, preserving the chosen key and pattern. Chords have a direct **Check
  this chord** action. Quick checks and microphone sensitivity are secondary.
- Empty states show the action needed to begin rather than a wall of disabled
  configuration. Technical library instructions are behind a disclosure.
- Player shortcuts ignore hidden workspaces. Switching tasks pauses rather than
  rewinding the current song. Editor updates retain the current task in the URL.

The top of the empty score/preview area moved as follows (rounded pixels):

| Page / width | Before | After |
|---|---:|---:|
| Songs / 1440px | 1,236 | 459 |
| Write / 1440px | 1,440 | 477 |
| Songs / 390px | 1,919 | 626 |
| Write / 390px | 2,535 | 1,179 |

Write keeps the writing area first on phones, with a separate focused practice
step after previewing. The library collapses after loading a song. These figures
measure layout discovery in the empty state, not learning outcomes.

## What still needs real-user validation

- Can a first-time player find a scale, enable the correct microphone and play
  three correct notes without coaching? Watch especially permission and wrong-note feedback.
- Do guitarists prefer the hand guide alongside the score on a wide screen?
  It is now optional rather than always occupying space above the score.
- Is “Score appearance” clearer than separate controls for notation and chord hints?
- Does a short countdown provide enough time to return both hands to the guitar?

## Sensible next iterations

Keep these separate from this navigation pass: a recent-song/project library that
survives closing the browser, beginner scale positions/levels, editable rhythm
and a richer creator, and microphone chord/technique assessment. Current chord
checking is string by string; pitch matching cannot prove which string or finger
was used. Same-page session retention is not permanent storage for imported files.

Validation covers task entry, direct links, Back/Forward, draft recovery, restore
after scale replacement, paused song retention, hidden-player shortcut guards,
mobile overflow and existing playback/import/export/hand-guide flows.
