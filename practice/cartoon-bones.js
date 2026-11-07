// Shared cartoon styling for projected chord examples, SVG fallback and the
// live 3D hand. These silhouettes decorate bones, never move their joints.
export const BONE_PALETTE = { bone:'#fff5df', joint:'#f3e4cb', shadow:'#c6a596', outline:'#382c23', highlight:'#fffef7' };
export const FINGER_COLORS = { 0:'#536254', 1:'#b16920', 2:'#276da3', 3:'#7853a2', 4:'#ac4668' };
function mix(first,second,amount) {
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  return '#'+rgb(first).map((v,i)=>Math.round(v*(1-amount)+rgb(second)[i]*amount).toString(16).padStart(2,'0')).join('');
}
export function fingerBoneStyle(finger,active=true) {
  const tint=FINGER_COLORS[finger]??FINGER_COLORS[0];
  return { bone:mix(tint,'#ffffff',0.7),joint:mix(tint,'#ffffff',0.5),shadow:mix(tint,'#ffffff',0.18),outline:mix(tint,'#000000',0.3),highlight:'#fffef7',opacity:active?1:0.22 };
}

export function cartoonBonePaths(a,b,width) {
  const distance=Math.hypot(b.x-a.x,b.y-a.y);
  const ux=distance>1e-9?(b.x-a.x)/distance:1,uy=distance>1e-9?(b.y-a.y)/distance:0;
  const inset=Math.min(width*0.45,distance*0.16),length=Math.max(0,distance-2*inset);
  const r=Math.min(width*0.55,length*0.24),shaft=r*0.32;
  const transform=commands=>commands.map(([kind,...values])=>{
    const result=[kind];
    for(let i=0;i<values.length;i+=2) {
      const x=values[i]+inset,y=values[i+1];
      result.push(a.x+ux*x-uy*y,a.y+uy*x+ux*y);
    }
    return result;
  });
  return {
    outline:transform([
      ['M',0,0],
      ['C',-r*0.65,-r*0.5,-r*0.45,-r*1.1,r*0.3,-r],
      ['Q',r,-r*0.85,r*1.2,-r*0.45],
      ['C',length*0.32,-shaft,length*0.68,-shaft,length-r*1.2,-r*0.45],
      ['Q',length-r,-r*0.85,length-r*0.3,-r],
      ['C',length+r*0.45,-r*1.1,length+r*0.65,-r*0.5,length,0],
      ['C',length+r*0.65,r*0.5,length+r*0.45,r*1.1,length-r*0.3,r],
      ['Q',length-r,r*0.85,length-r*1.2,r*0.45],
      ['C',length*0.68,shaft,length*0.32,shaft,r*1.2,r*0.45],
      ['Q',r,r*0.85,r*0.3,r],
      ['C',-r*0.45,r*1.1,-r*0.65,r*0.5,0,0],['Z'],
    ]),
    shadow:transform([
      ['M',r*0.7,r*0.72],
      ['C',length*0.3,r*0.18,length*0.7,r*0.18,length-r*0.7,r*0.72],
      ['L',length-r*0.2,r*0.55],
      ['C',length*0.7,r*0.02,length*0.3,r*0.02,r*0.2,r*0.55],['Z'],
    ]),
    highlight:transform([['M',length*0.23,-shaft*0.4],['Q',length*0.5,-shaft*0.85,length*0.77,-shaft*0.4]]),
  };
}

export function svgBonePath(commands) {
  return commands.map(([kind,...values])=>`${kind} ${values.map(n=>Number(n.toFixed(3))).join(' ')}`).join(' ');
}
