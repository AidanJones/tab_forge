// Accessible SVG fallback using the same joint centres as the 3D skeleton.
import { BONE_PALETTE, cartoonBonePaths, svgBonePath } from './cartoon-bones.js';
const bonePath=(a,b,width,part='outline')=>svgBonePath(cartoonBonePaths(a,b,width)[part]);
function animate(node,attribute,before,after,duration,create) {
  if(!duration||before===undefined||before===after) return;
  node.append(create('animate',{attributeName:attribute,from:before,to:after,dur:`${duration}ms`,fill:'freeze'}));
}

export function drawHand(svg,pose,layout,create,{previous,duration=0,opacity=0.42}={}) {
  const group=create('g',{class:'hand-overlay',opacity,'aria-label':'Articulated fretting hand with cartoon skeleton bones and rounded joints.'});
  for(const finger of pose.fingers) {
    const prior=previous?.fingers[finger.finger-1];
    const chain=create('g',{
      class:`hand-finger${finger.targets.length>1?' hand-barre':''}`,
      'data-finger':finger.finger,'data-active':finger.active,
      'data-tip-x':finger.tip.x,'data-tip-y':finger.tip.y,'data-clearance':finger.clearance,
    });
    for(let bone=0;bone<3;++bone) {
      const d=bonePath(finger.points[bone],finger.points[bone+1],12-bone);
      const mesh=create('path',{class:'cartoon-bone',d,fill:BONE_PALETTE.bone,stroke:BONE_PALETTE.outline,'stroke-width':1.4});
      if(prior) animate(mesh,'d',bonePath(prior.points[bone],prior.points[bone+1],12-bone),d,duration,create);
      chain.append(mesh);
      const shadowD=bonePath(finger.points[bone],finger.points[bone+1],12-bone,'shadow');
      const shadow=create('path',{d:shadowD,fill:BONE_PALETTE.shadow});
      if(prior)animate(shadow,'d',bonePath(prior.points[bone],prior.points[bone+1],12-bone,'shadow'),shadowD,duration,create);
      chain.append(shadow);
    }
    for(let joint=0;joint<4;++joint) {
      const p=finger.points[joint];
      const sphere=create('circle',{cx:p.x,cy:p.y,r:joint===3?7:6,fill:BONE_PALETTE.joint,stroke:BONE_PALETTE.outline,'stroke-width':1.3});
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
