const groups=['songs','suggestions'];
const identity=(group,song)=>song.catalogue_id||`${group}:${song.id}`;
const name=song=>JSON.stringify([song.title?.trim().toLocaleLowerCase(),song.artist?.trim().toLocaleLowerCase()||'']);

// The latest list owns metadata and membership; the original owns identities.
// In particular, moving a suggestion into Songs must not orphan saved scores.
export function mergeCatalogues(original,updated) {
  const previous=[...groups,'retired'].flatMap(group=>(original[group]||[]).map(song=>({group,song,key:identity(group,song)})));
  const used=new Set();
  const result={...updated,genres:[...new Set([...(original.genres||[]),...(updated.genres||[])])]};
  for(const group of groups){
    result[group]=(updated[group]||[]).map(song=>{
      const match=previous.find(old=>old.group===group&&old.song.id===song.id)||previous.find(old=>name(old.song)===name(song));
      const key=match?.key||identity(group,song);
      if(used.has(key))throw new Error(`Duplicate song catalogue identity: ${key}`);
      used.add(key);
      return {...match?.song,...song,catalogue_id:key};
    });
  }
  // Removed records remain resolvable from old projects but are not browsed.
  result.retired=previous.filter(old=>!used.has(old.key)).map(old=>({...old.song,catalogue_id:old.key}));
  return result;
}
