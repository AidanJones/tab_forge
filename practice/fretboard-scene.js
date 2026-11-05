import * as THREE from 'three';

// Oblique orthographic projection keeps fret/string contacts aligned with the
// accessible SVG labels, while real geometry provides volume and occlusion.
const vector = ([x, y, z]) => new THREE.Vector3(x, -y, z);
const mixPose = (before, after, t) => after.fingers.map((finger, i) => ({
  ...finger, joints: finger.joints.map((joint, j) => joint.map((n, axis) =>
    before ? before.fingers[i].joints[j][axis] * (1 - t) + n * t : n)),
}));

function release(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    if (object.material) for (const material of [object.material].flat()) material.dispose();
  });
  group.clear();
}

export class FretboardScene {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'fretboard-3d';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x65715f, 2.1));
    const light = new THREE.DirectionalLight(0xfff4dd, 3.5);
    light.position.set(200, 300, 500);
    this.scene.add(light);
    this.world = new THREE.Group();
    this.world.matrixAutoUpdate = false;
    this.world.matrix.set(1, 0, 0, 0, 0, 1, 0.6, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    this.scene.add(this.world);
    this.neck = new THREE.Group();
    this.hand = new THREE.Group();
    this.world.add(this.neck, this.hand);
    this.observer = new ResizeObserver(() => this.resize());
  }

  mesh(group, geometry, color, options = {}) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...options }));
    group.add(mesh);
    return mesh;
  }

  neckModel(layout) {
    release(this.neck);
    const left = Math.min(layout.x(105), layout.x(875)), bottom = layout.height - 26;
    const box = (x, y, z, width, height, depth, color, options) => {
      const mesh = this.mesh(this.neck, new THREE.BoxGeometry(width, height, depth), color, options);
      mesh.position.set(x, -y, z);
      return mesh;
    };
    box(left + 385, (40 + bottom) / 2, -18, 770, bottom - 40, 28, '#806044');
    box(left + 385, (40 + bottom) / 2, -5, 770, bottom - 40, 6, '#b9966b');
    for (let i = 0; i <= layout.frets; ++i) {
      const x = layout.x(105 + i * layout.cell);
      box(x, (40 + bottom) / 2, -0.6, i === 0 && layout.start === 1 ? 5 : 2, bottom - 40, 3, i === 0 && layout.start === 1 ? '#e8dfc6' : '#bfc4bf', { metalness: 0.75, roughness: 0.28 });
    }
    for (let string = 1; string <= layout.strings; ++string) {
      box(left + 385, layout.y(string), 0, 770, 0.8 + (string - 1) * 0.22, 0.8, '#d3d2bf', { metalness: 0.8, roughness: 0.3 });
    }
    for (let i = 0; i < layout.frets; ++i) {
      const fret = layout.start + i;
      if (![3, 5, 7, 9, 12, 15, 17, 19, 21, 24].includes(fret)) continue;
      const ys = fret % 12 === 0 ? [layout.y(2), layout.y(layout.strings - 1)] : [(40 + bottom) / 2];
      for (const y of ys) {
        const dot = this.mesh(this.neck, new THREE.CircleGeometry(4, 16), '#e8ddc4');
        dot.position.set(layout.x(105 + (i + 0.5) * layout.cell), -y, -1.9);
      }
    }
  }

  handModel(fingers, pose, opacity) {
    release(this.hand);
    for (const finger of fingers) {
      const radii = [finger.finger === 4 ? 9 : 11, finger.finger === 4 ? 8 : 10, 7.5, 6.3];
      // Finger axes sit one pad radius above the contact target, so the lower
      // surface, rather than the middle of a bone, touches the string.
      let points = finger.joints.map((joint, i) => vector([joint[0], joint[1], joint[2] + radii[i]]));
      if (finger.targets.length > 1) {
        const ys = finger.targets.map(note => this.layout.y(note.string));
        const x = finger.joints[3][0], min = Math.min(...ys), max = Math.max(...ys);
        // Lay the side of a barre finger down as one continuous surface, rather
        // than drawing an extra vertical finger on top of an arched index.
        points = [points[0], vector([x, max + 16, 9]), vector([x, (min + max) / 2, 8]), vector([x, min, 6.3])];
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const geometry = new THREE.TubeGeometry(curve, 36, 1, 12, false);
      const positions = geometry.attributes.position;
      for (let ring = 0; ring <= 36; ++ring) {
        const t = ring / 36, interval = Math.min(2, Math.floor(t * 3)), fraction = t * 3 - interval;
        const radius = radii[interval] * (1 - fraction) + radii[interval + 1] * fraction;
        const centre = curve.getPointAt(t);
        // TubeGeometry uses getPointAt(), too: the same sampling is necessary
        // to taper around its centre rather than accidentally warping the tube.
        for (let side = 0; side <= 12; ++side) {
          const index = ring * 13 + side;
          const p = new THREE.Vector3().fromBufferAttribute(positions, index).sub(centre).multiplyScalar(radius).add(centre);
          positions.setXYZ(index, p.x, p.y, p.z);
        }
      }
      geometry.computeVertexNormals();
      this.mesh(this.hand, geometry, '#d3bca6', { transparent: true, opacity, depthWrite: false });
      // Only the fingertip needs a cap. Separate spheres at every joint create
      // artificial ball joints when the translucent surfaces overlap.
      const cap = this.mesh(this.hand, new THREE.SphereGeometry(radii[3], 16, 10), '#d3bca6', { transparent: true, opacity, depthWrite: false });
      cap.position.copy(points[3]);
      const nail = this.mesh(this.hand, new THREE.SphereGeometry(1, 16, 8), '#eee2d1', { transparent: true, opacity: opacity * 0.85, depthWrite: false, roughness: 0.35 });
      nail.position.copy(points[3]).lerp(points[2], 0.2);
      nail.position.z += 5;
      nail.scale.set(4.7, 7, 1.3);
      const distal = points[3].clone().sub(points[2]);
      nail.rotation.z = Math.atan2(distal.y, distal.x) - Math.PI / 2;
    }
    // The thumb is behind the neck by default; only an explicit thumb-over
    // fingering brings a small tip into view. The wrist/palm stay out of frame.
    if (pose.thumb) {
      const thumb = this.mesh(this.hand, new THREE.SphereGeometry(10, 20, 12), '#d3bca6', { transparent: true, opacity, depthWrite: false });
      thumb.position.copy(vector([pose.thumb.x, pose.thumb.y, 7]));
      thumb.scale.set(0.85, 1.4, 0.75);
    }
  }

  update(stage, layout, pose, { previous, duration = 0, opacity = 0.42 } = {}) {
    this.pause();
    this.layout = layout;
    this.viewHeight = layout.height - 16;
    this.camera = new THREE.OrthographicCamera(-460, 460, this.viewHeight / 2, -this.viewHeight / 2, 1, 2000);
    this.camera.position.set(460, -this.viewHeight / 2, 1000);
    this.camera.lookAt(460, -this.viewHeight / 2, 0);
    this.neckModel(layout);
    this.stage = stage;
    stage.prepend(this.renderer.domElement);
    this.observer.observe(stage);
    this.resize();
    const start = performance.now();
    const frame = now => {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      const t = 1 - (1 - progress) ** 3;
      if (pose) this.handModel(mixPose(previous, pose, t), pose, opacity);
      else release(this.hand);
      this.renderer.render(this.scene, this.camera);
      if (progress < 1) this.animation = requestAnimationFrame(frame);
    };
    frame(start);
  }

  resize() {
    if (!this.stage?.isConnected) return;
    const width = this.stage.clientWidth;
    this.renderer.setSize(width, width * this.viewHeight / 920, false);
    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    cancelAnimationFrame(this.animation);
    this.observer.disconnect();
    this.stage = null;
  }

  dispose() {
    this.pause();
    release(this.neck);
    release(this.hand);
    this.renderer.dispose();
  }
}
