// Accessible SVG fallback using the same joint centres as the 3D skeleton.
const point = p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
function bonePath(a,b,width) {
  const dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy)||1;
  const nx=-dy/length*width/2, ny=dx/length*width/2;
  const start={x:a.x+dx/length*5,y:a.y+dy/length*5};
  const end={x:b.x-dx/length*5,y:b.y-dy/length*5};
  return `M ${point({x:start.x+nx,y:start.y+ny})} L ${point({x:end.x+nx,y:end.y+ny})} L ${point({x:end.x-nx,y:end.y-ny})} L ${point({x:start.x-nx,y:start.y-ny})} Z`;
}
function animate(node,attribute,before,after,duration,create) {
  if(!duration||before===undefined||before===after) return;
  node.append(create('animate',{attributeName:attribute,from:before,to:after,dur:`${duration}ms`,fill:'freeze'}));
}

export function drawHand(svg,pose,layout,create,{previous,duration=0,opacity=0.42}={}) {
  const group=create('g',{class:'hand-overlay',opacity,'aria-label':'Articulated fretting hand with cuboid bones and joint spheres.'});
  for(const finger of pose.fingers) {
    const prior=previous?.fingers[finger.finger-1];
    const chain=create('g',{
      class:`hand-finger${finger.targets.length>1?' hand-barre':''}`,
      'data-finger':finger.finger,'data-active':finger.active,
      'data-tip-x':finger.tip.x,'data-tip-y':finger.tip.y,'data-clearance':finger.clearance,
    });
    for(let bone=0;bone<3;++bone) {
      const d=bonePath(finger.points[bone],finger.points[bone+1],12-bone);
      const mesh=create('path',{d,fill:'#d9c9a8',stroke:'#7e806e','stroke-width':0.8});
      if(prior) animate(mesh,'d',bonePath(prior.points[bone],prior.points[bone+1],12-bone),d,duration,create);
      chain.append(mesh);
    }
    for(let joint=0;joint<4;++joint) {
      const p=finger.points[joint];
      const sphere=create('circle',{cx:p.x,cy:p.y,r:joint===3?7:6,fill:'#52786b'});
      if(prior) {
        animate(sphere,'cx',prior.points[joint].x,p.x,duration,create);
        animate(sphere,'cy',prior.points[joint].y,p.y,duration,create);
      }
      chain.append(sphere);
    }
    group.append(chain);
  }
  svg.append(group);
}
