import * as THREE from 'three';
import { BONE_LENGTHS } from './hand-rig.js';
import { BONE_PALETTE, fingerBoneStyle } from './cartoon-bones.js';

const point = ([x, y, z]) => new THREE.Vector3(x, -y, z);
const up = new THREE.Vector3(0, 1, 0);

// Rigid meshes parented to real Bone nodes. No splines, independent fingertip
// warping, or renderer-only chord corrections: the solver owns the skeleton.
export class BlockHand {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'fretting-hand';
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.ball = new THREE.SphereGeometry(1, 12, 8);
    // Rounded heads and a narrow shaft, on the same rigid axis as the old box.
    this.boneShape = new THREE.LatheGeometry([[0,-0.5],[0.2,-0.5],[0.4,-0.47],[0.5,-0.42],[0.46,-0.34],[0.28,-0.23],[0.21,-0.1],[0.21,0.1],[0.28,0.23],[0.46,0.34],[0.5,0.42],[0.4,0.47],[0.2,0.5],[0,0.5]].map(([r,y])=>new THREE.Vector2(r,y)),16);
    this.boneMaterial = new THREE.MeshStandardMaterial({ color: BONE_PALETTE.bone, roughness: 0.8, transparent: true, depthWrite: false });
    this.jointMaterial = new THREE.MeshStandardMaterial({ color: BONE_PALETTE.joint, roughness: 0.65, transparent: true, depthWrite: false });
    this.palm = this.boxMesh(this.root, [100, 48, 22]);
    this.palm.name = 'palm';
    // Tilt the palm in line with the metacarpals as it cups the lower edge.
    // Its front face stays behind the wooden neck, rather than intersecting it.
    this.palm.rotation.x = Math.PI / 3;
    this.palm.position.z = -8;
    this.wrist = this.boxMesh(this.root, [46, 32, 20]);
    this.wrist.position.set(0, -30, -28);
    this.wrist.rotation.x = Math.PI / 3;
    this.fingers = [1,2,3,4].map(finger => {
      const style=fingerBoneStyle(finger);
      const materials={
        bone:new THREE.MeshStandardMaterial({color:style.bone,roughness:0.8,transparent:true,depthWrite:false}),
        joint:new THREE.MeshStandardMaterial({color:style.joint,roughness:0.65,transparent:true,depthWrite:false}),
      };
      return {finger,materials,
        chain:this.chain(`finger-${finger}`,BONE_LENGTHS[finger],finger===4?10:12,materials),
        metacarpal:this.boneMesh(this.root,[7,1,7],materials.bone),
      };
    });
    this.thumb = this.chain('thumb', [45,38,30], 13);
  }

  boxMesh(parent, scale) {
    const mesh = new THREE.Mesh(this.box, this.boneMaterial);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  boneMesh(parent,scale,material=this.boneMaterial) {
    const mesh=new THREE.Mesh(this.boneShape,material);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  chain(name, lengths, width, materials={bone:this.boneMaterial,joint:this.jointMaterial}) {
    const joints = [];
    let parent = this.root;
    for (let i = 0; i < 4; ++i) {
      const joint = new THREE.Bone();
      joint.name = `${name}-${(name === 'thumb' ? ['CMC','MCP','IP','tip'] : ['MCP','PIP','DIP','tip'])[i]}`;
      parent.add(joint);
      if (i) joint.position.y = lengths[i - 1];
      const ball = new THREE.Mesh(this.ball, materials.joint);
      ball.scale.setScalar(i === 0 ? 7.5 : i === 3 ? 7 : 6);
      joint.add(ball);
      if (i < 3) {
        const bone = this.boneMesh(joint, [width - i, lengths[i] - 12, width - 2],materials.bone);
        bone.position.y = lengths[i] / 2;
      }
      joints.push(joint);
      parent = joint;
    }
    return joints;
  }

  updateChain(chain, joints, localPoint) {
    const points = joints.map(localPoint);
    chain[0].position.copy(points[0]);
    let parentRotation = new THREE.Quaternion();
    for (let i = 0; i < 3; ++i) {
      const axis = points[i + 1].clone().sub(points[i]).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(up, axis);
      chain[i].quaternion.copy(parentRotation.clone().invert().multiply(rotation));
      parentRotation = rotation;
    }
  }

  update(pose, opacity) {
    this.root.position.copy(point(pose.grip.origin));
    this.root.rotation.z = -pose.grip.yaw;
    const inverse = this.root.quaternion.clone().invert();
    const localPoint = p => point(p).sub(this.root.position).applyQuaternion(inverse);
    this.boneMaterial.opacity = opacity;
    this.jointMaterial.opacity = Math.min(0.9, opacity + 0.18);
    for (const finger of this.fingers) {
      const data = pose.fingers[finger.finger - 1];
      const fade=fingerBoneStyle(finger.finger,data.active).opacity;
      finger.materials.bone.opacity=opacity*fade;
      finger.materials.joint.opacity=Math.min(0.9,opacity+0.18)*fade;
      this.updateChain(finger.chain, data.joints, localPoint);
      const a = localPoint(data.metacarpal), b = localPoint(data.joints[0]);
      const axis = b.clone().sub(a);
      finger.metacarpal.position.copy(a).add(b).multiplyScalar(0.5);
      finger.metacarpal.scale.y = axis.length();
      finger.metacarpal.quaternion.setFromUnitVectors(up, axis.normalize());
    }
    this.thumb[0].visible = Boolean(pose.thumbChain);
    if (pose.thumbChain) this.updateChain(this.thumb, pose.thumbChain.joints, localPoint);
  }
}
