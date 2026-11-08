export const LEARNING_STATUSES=['not started','learning','comfortable','learned'];
export function catalogueEntries(data) {
  return ['songs','suggestions','retired'].flatMap(group=>(data[group]||[]).map(song=>({
    ...song, catalogueId:song.catalogue_id||`${group}:${song.id}`, suggested:group==='suggestions', archived:group==='retired',
  })));
}
export const UNKNOWN_METADATA='__unknown__';
const KEY_NAMES=['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'];
export function songKey(value) {
  const text=String(value||'').trim().replaceAll('♯','#').replaceAll('♭','b');
  if(!text)return {value:UNKNOWN_METADATA,label:'Unknown / not listed'};
  const match=text.match(/^([A-G])([#b]?)(?:\s*(major|minor|maj|min|m))?(?=\s*\(|$)/i);
  if(!match)return {value:text.toLowerCase(),label:text};
  const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[match[1].toUpperCase()];
  const pc=(natural+(match[2]==='#'?1:match[2]==='b'?-1:0)+12)%12;
  const mode=['minor','min','m'].includes(match[3]?.toLowerCase())?'minor':'major';
  return {value:`${pc}:${mode}`,label:`${KEY_NAMES[pc]} ${mode}`};
}
export function songTuning(value) {
  const text=String(value||'').trim();
  if(!text)return {value:UNKNOWN_METADATA,label:'Unknown / not listed'};
  if(/^(standard\b|e\s*standard\b|e\s*a\s*d\s*g\s*b\s*e$)/i.test(text))return {value:'standard',label:'Standard · E A D G B E'};
  const drop=text.match(/^drop\s+([A-G])([#b♯♭]?)(?=\s|$|\()/i);
  if(drop){const label=`Drop ${drop[1].toUpperCase()}${drop[2]}`;return {value:label.toLowerCase(),label};}
  return {value:text.toLowerCase(),label:text};
}
export function songFilterOptions(songs,field) {
  const options=new Map();
  for(const song of songs.filter(s=>!s.archived)){
    const values=field==='key'?[songKey(song.key)]:field==='tuning'?[songTuning(song.tuning)]:
      (['technique','chord'].includes(field)?song[field==='technique'?'techniques':'chords']||[]:[song[field]]).filter(Boolean).map(v=>({value:v,label:v}));
    for(const option of values)options.set(option.value,option.label);
  }
  return [...options].map(([value,label])=>({value,label})).sort((a,b)=>a.value===UNKNOWN_METADATA?1:b.value===UNKNOWN_METADATA?-1:a.label.localeCompare(b.label,undefined,{numeric:true}));
}
export function filterSongs(songs, {query='',genre='',key='',instrument='',tuning='',technique='',chord='',guitarPro='',gp4FoundIds=new Set(),gp4LocalIds=new Set(),hasScore=false,scoreIds=new Set(),status='',view='songs',states={}}={}) {
  const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return songs.filter(song=>{
    if(song.archived)return false;
    const saved=states[song.catalogueId]||{};
    const suggested=song.suggested&&!saved.promoted;
    if(view==='suggestions'?!suggested:suggested)return false;
    if(genre&&song.genre!==genre)return false;
    if(key&&songKey(song.key).value!==key)return false;
    if(instrument&&song.instrument!==instrument)return false;
    if(tuning&&songTuning(song.tuning).value!==tuning)return false;
    if(technique&&!song.techniques?.includes(technique))return false;
    if(chord&&!song.chords?.includes(chord))return false;
    if(hasScore&&!scoreIds.has(song.catalogueId))return false;
    if(guitarPro==='local'&&!gp4LocalIds.has(song.catalogueId))return false;
    if(guitarPro==='found'&&!gp4FoundIds.has(song.catalogueId))return false;
    if(guitarPro==='missing'&&gp4FoundIds.has(song.catalogueId))return false;
    if(status&&(saved.practice?.learning_status||song.practice?.learning_status||'not started')!==status)return false;
    const haystack=[song.title,song.artist,song.genre,song.key,song.instrument,song.tuning,song.source,song.album,...(song.tags||[]),...(song.chords||[]),...(song.techniques||[])].join(' ').toLocaleLowerCase();
    return words.every(word=>haystack.includes(word));
  });
}
export function sortSongs(songs,sort='catalogue') {
  const result=[...songs];
  const text=(a,b,field)=>String(a[field]||'').localeCompare(String(b[field]||''),undefined,{sensitivity:'base',numeric:true})||String(a.title||'').localeCompare(String(b.title||''));
  if(['title','artist'].includes(sort))result.sort((a,b)=>text(a,b,sort));
  if(sort==='bpm')result.sort((a,b)=>(Number(a.bpm)>0?Number(a.bpm):Infinity)-(Number(b.bpm)>0?Number(b.bpm):Infinity)||text(a,b,'title'));
  return result;
}
export function safeResourceUrl(value) {
  try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
export function captureSession(state, {view='score',mode='timed'}={}) {
  return {tick:Math.max(0,state.position.currentTick||0),track:state.selectedTrack,speed:state.speed,snap:state.snap,
    range:state.range?{...state.range}:null,looping:state.looping,countIn:state.countIn,metronome:state.metronome,
    volume:state.volume,tracks:(state.tracks||[]).map(t=>({index:t.index,muted:t.muted,solo:t.solo})),view,mode};
}
