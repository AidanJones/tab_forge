import practiceMarkup from './practice.html?raw';
import { mountPractice } from './practice/main.js';
import { lessonToAlphaTex } from './practice/lesson-converter.js';
import { download, scoreFilename } from './practice/download.js';
import { CHORD_LIBRARY } from './practice/chord-library.js';

const root = document.getElementById('editor-player');
const template = new DOMParser().parseFromString(practiceMarkup, 'text/html');
root.append(template.querySelector('#drop-zone'));
root.querySelector('#empty-state h3').textContent = 'Hear the notes you write.';
root.querySelector('#empty-state p').textContent = 'Write a few notes or load an example, then update the preview.';
root.querySelector('#empty-state .muted').textContent = 'The score and finger guide will appear here.';
const player = mountPractice(root, { embedded: true });
document.addEventListener('tab-forge:exercise', event => {
  const input=document.getElementById('input');
  document.dispatchEvent(new CustomEvent('tab-forge:before-replace',{detail:input.value}));
  input.value=event.detail.lesson;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  document.getElementById('editor-tempo').value=80;
  window.updateOutput();
});
const notice = document.getElementById('editor-playback-status');
const tempo = document.getElementById('editor-tempo');
const duration = document.getElementById('editor-duration');
document.addEventListener('tab-forge:riff-loaded',()=>{root.inert=false;root.classList.remove('out-of-date');notice.textContent='Practising a riff. Your lesson notes are kept; update the preview to play them again.';});
let revision = 0;
root.inert = true;

document.getElementById('save-notes').addEventListener('click', () => {
  const source = document.getElementById('input').value;
  const title = window.parseMarkdown(source).metadata.title;
  download(source, scoreFilename(title || 'my-lesson', 'md'), 'text/markdown;charset=utf-8');
});

function invalidate() {
  ++revision;
  player.invalidate();
  root.inert = true;
  root.classList.add('out-of-date');
  notice.textContent = 'Notes changed. Update the preview to play your latest version.';
}

document.getElementById('input').addEventListener('input', invalidate);
document.addEventListener('tab-forge:editor-update', async event => {
  const current = ++revision;
  player.invalidate();
  root.inert = true;
  root.classList.add('out-of-date');
  try {
    const converted = lessonToAlphaTex(event.detail.data, CHORD_LIBRARY, {
      tempo: Number(tempo.value), duration: Number(duration.value),
    });
    notice.textContent = 'Preparing your playable score…';
    const loaded = await player.loadTex(converted.tex, 'Lesson notes · assumed rhythm');
    if (current !== revision) return;
    root.inert = !loaded;
    root.classList.toggle('out-of-date', !loaded);
    notice.textContent = loaded
      ? `${converted.beatCount} notes/chords · ${tempo.value} BPM · ${duration.selectedOptions[0].textContent.toLowerCase()} each.${converted.paddedRests ? ' Incomplete bars padded with rests.' : ''}${converted.annotations ? ' Playing instructions included in the score.' : ''}${converted.lyricLines ? ' Lyrics included below the notes.' : ''}`
      : 'The score could not load. Check your notes and update the preview to retry.';
  } catch (error) {
    notice.textContent = error.message;
  }
});

for (const control of [tempo, duration]) {
  control.addEventListener('input', invalidate);
  control.addEventListener('change', () => window.updateOutput());
}

// The source editor owns shorthand parsing; the shared player is the only score.
// Reuse the same update path for existing share URLs and the first page render.
if (document.getElementById('input').value.trim()) window.updateOutput();
