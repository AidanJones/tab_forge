import { Environment, RenderEngineFactory, model } from '@coderline/alphatab';
import { chordFingerExample, decodeFingerExample } from './finger-examples.js';
import { projectHandPoint } from './hand-rig.js';
import { FINGER_COLORS, fingerBoneStyle, cartoonBonePaths } from './cartoon-bones.js';

export const FINGER_EXAMPLE_ENGINE='tab-forge-finger-examples';
const HEIGHT=145, GAP=12;
const widthFor=data=>2*(data.strings.length-1)*GAP+60;
const cache=new Map();
const color=(hex,opacity=1)=>model.Color.fromJson(hex+(opacity<1?Math.round(opacity*255).toString(16).padStart(2,'0'):''));

function clipSegment(a,b,box) {
  let low=0,high=1;
  const dx=b.x-a.x,dy=b.y-a.y;
  for(const [p,q] of [[-dx,a.x-box.left],[dx,box.right-a.x],[-dy,a.y-box.top],[dy,box.bottom-a.y]]) {
    if(!p) {if(q<0)return null;continue;}
    const t=q/p;
    if(p<0)low=Math.max(low,t);else high=Math.min(high,t);
    if(low>high)return null;
  }
  return [{x:a.x+dx*low,y:a.y+dy*low},{x:a.x+dx*high,y:a.y+dy*high}];
}

function bone(canvas,a,b,width,style) {
  const paths=cartoonBonePaths(a,b,width);
  function path(commands) {
    canvas.beginPath();
    for(const [kind,...p] of commands) {
      if(kind==='M')canvas.moveTo(...p);
      else if(kind==='L')canvas.lineTo(...p);
      else if(kind==='C')canvas.bezierCurveTo(...p);
      else if(kind==='Q')canvas.quadraticCurveTo(...p);
      else canvas.closePath();
    }
  }
  canvas.beginGroup('cartoon-bone');
  path(paths.outline);canvas.color=color(style.bone,style.opacity);canvas.fill();
  // alphaTab's SVG canvas consumes a path on fill; replay it for the ink outline.
  path(paths.outline);canvas.lineWidth=1.05;canvas.color=color(style.outline,style.opacity);canvas.stroke();
  path(paths.shadow);canvas.color=color(style.shadow,style.opacity);canvas.fill();
  path(paths.highlight);canvas.color=color(style.highlight,style.opacity);canvas.lineWidth=0.6;canvas.stroke();
  canvas.endGroup();
}

function grid(canvas,data,x,y,firstFret) {
  const width=(data.strings.length-1)*GAP;
  canvas.color=color('#9a9e90');canvas.lineWidth=0.7;
  for(let i=0;i<data.strings.length;++i) {canvas.beginPath();canvas.moveTo(x+i*GAP,y);canvas.lineTo(x+i*GAP,y+5*GAP);canvas.stroke();}
  for(let i=0;i<=5;++i) {canvas.beginPath();canvas.moveTo(x,y+i*GAP);canvas.lineTo(x+width,y+i*GAP);canvas.stroke();}
  canvas.color=color('#334f43');canvas.lineWidth=firstFret===1?2:0.8;
  canvas.beginPath();canvas.moveTo(x,y);canvas.lineTo(x+width,y);canvas.stroke();
  canvas.font=new model.Font('Arial',8);canvas.textAlign=1;canvas.textBaseline=0;
  data.strings.forEach((fret,index)=>{
    const sx=x+(data.strings.length-index-1)*GAP;
    if(fret===0)canvas.strokeCircle(sx,y-7,2.5);
    else if(fret<0)canvas.fillText('×',sx,y-12);
  });
  if(firstFret>1) {canvas.textAlign=2;canvas.fillText(`${firstFret}fr`,x-4,y+2);}
}

export function paintFingerExample(canvas,data,x,y) {
  const saved={color:canvas.color,font:canvas.font,lineWidth:canvas.lineWidth,textAlign:canvas.textAlign,textBaseline:canvas.textBaseline};
  const width=widthFor(data),left=x-width/2,gridWidth=(data.strings.length-1)*GAP;
  let example=cache.get(JSON.stringify(data));
  if(!example) {
    example=chordFingerExample(data,{assignments:data.assignments,variantId:data.variantId});
    if(cache.size>=128)cache.delete(cache.keys().next().value);
    cache.set(JSON.stringify(data),example);
  }
  const firstFret=example.layout.start,top=y+40,lx=left+12,rx=lx+gridWidth+18;
  canvas.beginGroup('finger-example-diagram');
  canvas.color=color('#243b30');canvas.font=new model.Font('Arial',10);canvas.textAlign=1;canvas.textBaseline=0;
  canvas.fillText(data.name,x,y);
  canvas.font=new model.Font('Arial',8);
  canvas.fillText('Chord',lx+gridWidth/2,y+17);
  canvas.fillText('Fingers',rx+gridWidth/2,y+17);
  grid(canvas,data,lx,top,firstFret);grid(canvas,data,rx,top,firstFret);
  const {layout,pose}=example;
  // Rotate the Video-view skeleton into a standard chord chart: low string at
  // left, nut at top. This affine projection preserves every contact point.
  const project=p=>({x:rx+(p.y-54)/layout.gap*GAP,y:top+(layout.x(105)-p.x)/layout.cell*GAP+(0.5-0.72)*GAP});
  if(data.available && example.available) {
    const box={left:rx-7,right:rx+gridWidth+5,top:top-5,bottom:top+5*GAP+18};
    canvas.beginGroup('finger-example-skeleton');canvas.lineWidth=0.8;
    for(const finger of pose.fingers) {
      const style=fingerBoneStyle(finger.finger,finger.active);
      canvas.beginGroup(`finger-example-finger finger-${finger.finger} ${finger.active?'finger-pressing':'finger-hovering'}`);
      const points=finger.points.map(project);
      const metacarpal=clipSegment(project(projectHandPoint(finger.metacarpal)),points[0],box);
      if(metacarpal)bone(canvas,...metacarpal,3,style);
      for(let i=0;i<3;++i) {
        const segment=clipSegment(points[i],points[i+1],box);
        if(segment)bone(canvas,...segment,5.3-i*0.5,style);
      }
      for(const p of points) if(p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom) {
        canvas.color=color(style.joint,style.opacity);canvas.fillCircle(p.x,p.y,2.6);
        canvas.color=color(style.outline,style.opacity);canvas.lineWidth=0.9;canvas.strokeCircle(p.x,p.y,2.6);
        canvas.beginPath();canvas.moveTo(p.x-1.5,p.y+0.7);canvas.quadraticCurveTo(p.x,p.y+1.5,p.x+1.5,p.y+0.7);canvas.color=color(style.shadow,style.opacity);canvas.stroke();
      }
      canvas.endGroup();
    }
    canvas.endGroup();
  }
  canvas.font=new model.Font('Arial',8);canvas.textAlign=1;canvas.textBaseline=0;
  data.strings.forEach((fret,index)=>{
    if(fret<firstFret || fret>=firstFret+5)return;
    const dx=(data.strings.length-index-1)*GAP,dy=(fret-firstFret+0.5)*GAP;
    canvas.color=color('#334f43');canvas.fillCircle(lx+dx,top+dy,2.8);
    canvas.color=color('#ffffff');canvas.fillCircle(rx+dx,top+dy,4.8);
    const finger=data.assignments[index];
    canvas.color=color(FINGER_COLORS[finger]??'#334f43');canvas.lineWidth=0.8;canvas.strokeCircle(rx+dx,top+dy,4.8);
    canvas.fillText(finger===null?'?':finger===0?'T':String(finger),rx+dx,top+dy-4);
  });
  canvas.color=color('#65745d');canvas.font=new model.Font('Arial',8);
  canvas.fillText(data.available&&example.available ? (data.origin==='written'?'Written fingering':'One possible fingering') : 'Check fingering',x,y+HEIGHT-15);
  canvas.endGroup();
  Object.assign(canvas,saved);
}

// Public ICanvas adapter: a specially marked chord-name text glyph supplies
// proper layout bounds. All other notation uses alphaTab's own SVG backend.
// No post-render DOM overlays or private glyph patches, so print/zoom agree.
export function fingerExampleCanvas(base) {
  return new Proxy(base,{
    get(target,key) {
      if(key==='measureText')return text=>{
        const data=decodeFingerExample(text);
        return data?{width:widthFor(data),height:HEIGHT}:target.measureText(text);
      };
      if(key==='fillText')return (text,x,y)=>{
        const data=decodeFingerExample(text);
        if(data)paintFingerExample(target,data,x,y);else target.fillText(text,x,y);
      };
      const value=Reflect.get(target,key,target);
      return typeof value==='function'?value.bind(target):value;
    },
    set(target,key,value) {Reflect.set(target,key,value,target);return true;},
  });
}

export function registerFingerExampleRenderer() {
  if(Environment.renderEngines.has(FINGER_EXAMPLE_ENGINE))return;
  const svg=Environment.getRenderEngineFactory('svg');
  Environment.renderEngines.set(FINGER_EXAMPLE_ENGINE,new RenderEngineFactory(false,()=>fingerExampleCanvas(svg.createCanvas())));
}
