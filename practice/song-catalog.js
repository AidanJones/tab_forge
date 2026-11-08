export const LEARNING_STATUSES=['not started','learning','comfortable','learned'];
export function catalogueEntries(data) {
  return ['songs','suggestions'].flatMap(group=>(data[group]||[]).map(song=>({
    ...song, catalogueId:`${group}:${song.id}`, suggested:group==='suggestions',
  })));
}
export function filterSongs(songs, {query='',genre='',status='',view='songs',states={}}={}) {
  const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return songs.filter(song=>{
    const saved=states[song.catalogueId]||{};
    const suggested=song.suggested&&!saved.promoted;
    if(view==='suggestions'?!suggested:suggested)return false;
    if(genre&&song.genre!==genre)return false;
    if(status&&(saved.practice?.learning_status||song.practice?.learning_status||'not started')!==status)return false;
    const haystack=[song.title,song.artist,song.genre,...(song.tags||[]),...(song.chords||[]),...(song.techniques||[])].join(' ').toLocaleLowerCase();
    return words.every(word=>haystack.includes(word));
  });
}
export function safeResourceUrl(value) {
  try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
export function captureSession(state, {view='score',mode='timed'}={}) {
  return {tick:Math.max(0,state.position.currentTick||0),track:state.selectedTrack,speed:state.speed,snap:state.snap,
    range:state.range?{...state.range}:null,looping:state.looping,countIn:state.countIn,metronome:state.metronome,
    volume:state.volume,tracks:(state.tracks||[]).map(t=>({index:t.index,muted:t.muted,solo:t.solo})),view,mode};
}
