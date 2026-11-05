import * as THREE from 'three';
import { BlockHand } from './block-hand.js';
import { interpolateHandPose } from './hand-rig.js';

// Oblique orthographic projection keeps fret/string contacts aligned with the
// accessible SVG labels, while real geometry provides volume and occlusion.

function release(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of [object.material].flat()) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
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

  handModel(pose, opacity) {
    this.hand.visible = true;
    if (!this.blockHand) {
      this.blockHand = new BlockHand();
      this.hand.add(this.blockHand.root);
    }
    this.blockHand.update(pose, opacity);
    this.renderer.domElement.dataset.handModel = "articulated";
    this.renderer.domElement.dataset.grip = pose.preset;
    this.renderer.domElement.dataset.fingerBones = "12";
    this.renderer.domElement.dataset.joints = "20";
    this.renderer.domElement.dataset.gripX = pose.palm.x.toFixed(2);
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
      if (pose) this.handModel(interpolateHandPose(previous, pose, t), opacity);
      else this.hand.visible = false;
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
