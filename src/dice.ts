// The two dice, thrown across the Clearing with real physics, landing on
// results chosen before the throw.
//
// Route (see README.md): three + cannon-es directly, after a spike on
// @3d-dice/dice-box-threejs. How a predetermined roll works here:
//
//   1. The result is chosen first, by the caller.
//   2. The throw is simulated off-screen, to rest, with a fixed step, and its
//      path and its impacts are recorded. A throw that settles cocked (a cube
//      on a corner facet) is thrown again, unseen.
//   3. The dice are labelled so that the face that came to rest upward carries
//      the chosen result: a rotation of the die's own labelling, so it stays a
//      proper die (opposite Schools stay opposite).
//   4. The recorded path is played back, with a clack at every recorded impact.
//   5. At rest, the up face is read off the die as drawn and checked against
//      the chosen result.
//
// Because the playback IS the recorded simulation, the record and the
// animation cannot disagree; step 5 proves it on every throw.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CUBE, TETRA, INK, type School, type SubStance, type SubRoomIcon } from './faces';

// ---------------------------------------------------------------- geometry --

type V3 = [number, number, number];

const CUBE_HALF = 0.74;
/** How far along each edge the corners are cut. */
const CUBE_CUT = 0.18;
const TETRA_SCALE = 0.78;
const CLEARING_RADIUS = 5.2;

/** Cube faces by index: the local normal of each, and which way is "up" on it. */
export const CUBE_FACES: { n: V3; up: V3 }[] = [
  { n: [1, 0, 0], up: [0, 1, 0] },
  { n: [-1, 0, 0], up: [0, 1, 0] },
  { n: [0, 1, 0], up: [0, 0, -1] },
  { n: [0, -1, 0], up: [0, 0, 1] },
  { n: [0, 0, 1], up: [0, 1, 0] },
  { n: [0, 0, -1], up: [0, 1, 0] },
];

/**
 * The cube's base labelling: which School (index into CUBE) is on which face.
 * Opposite spokes of the mandala are opposite faces: R/I, P/W, S/A.
 */
export const CUBE_BASE = [1, 4, 0, 3, 2, 5]; // +x P, -x W, +y R, -y I, +z S, -z A

const TETRA_VERTS: V3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
].map((v) => v.map((c) => c * TETRA_SCALE) as V3);

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Order a planar polygon's points counter-clockwise seen from outside. */
function ccw(points: V3[], normal: V3): V3[] {
  const c = points.reduce<V3>((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length, s[2] + p[2] / points.length], [0, 0, 0]);
  const u = norm(sub(points[0], c));
  const w = cross(normal, u);
  return [...points].sort((a, b) => {
    const da = sub(a, c);
    const db = sub(b, c);
    return Math.atan2(dot(da, w), dot(da, u)) - Math.atan2(dot(db, w), dot(db, u));
  });
}

/** The truncated cube: six octagons (the labelled faces) and eight corner facets. */
function truncatedCube() {
  const h = CUBE_HALF;
  const k = h - CUBE_CUT;
  const vertices: V3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    vertices.push([sx * k, sy * h, sz * h], [sx * h, sy * k, sz * h], [sx * h, sy * h, sz * k]);
  }
  const key = (p: V3) => p.map((c) => c.toFixed(4)).join(',');
  const index = new Map(vertices.map((p, i) => [key(p), i]));
  const faces: { points: V3[]; normal: V3; label: number | null }[] = [];
  CUBE_FACES.forEach(({ n }, i) => {
    const on = vertices.filter((p) => Math.abs(dot(p, n) - h) < 1e-6);
    faces.push({ points: ccw(on, n), normal: n, label: i });
  });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const n = norm([sx, sy, sz]);
    const pts: V3[] = [[sx * k, sy * h, sz * h], [sx * h, sy * k, sz * h], [sx * h, sy * h, sz * k]];
    faces.push({ points: ccw(pts, n), normal: n, label: null });
  }
  return { vertices, faces, index: (p: V3) => index.get(key(p))! };
}

function tetrahedron() {
  // face j is the face opposite vertex j
  const faces = TETRA_VERTS.map((_, j) => {
    const idx = [0, 1, 2, 3].filter((i) => i !== j);
    const pts = idx.map((i) => TETRA_VERTS[i]);
    const c = pts.reduce<V3>((s, p) => [s[0] + p[0] / 3, s[1] + p[1] / 3, s[2] + p[2] / 3], [0, 0, 0]);
    let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    if (dot(n, c) < 0) {
      idx.reverse();
      n = [-n[0], -n[1], -n[2]];
    }
    return { vertexIndices: idx, normal: n };
  });
  return { faces };
}

// ---------------------------------------------------------------- textures --

const WOOD_BASE = '#E6D2AE';

/** A pale wood ground: a few soft grain lines on a warm body, seeded, so every face is alike. */
function woodCanvas(size = 256): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = WOOD_BASE;
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const y = rand() * size;
    g.strokeStyle = `rgba(150, 110, 60, ${0.06 + rand() * 0.1})`;
    g.lineWidth = 0.6 + rand() * 1.6;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) g.lineTo(x, y + Math.sin((x + i * 13) / 37) * 3 + (rand() - 0.5) * 2);
    g.stroke();
  }
  return c;
}

function texture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function letterTexture(school: School): THREE.CanvasTexture {
  const c = woodCanvas();
  const g = c.getContext('2d')!;
  g.fillStyle = school.hex;
  g.font = '600 150px Jost, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(school.letter, 128, 138);
  return texture(c);
}

/** The four sub-room icons, drawn in ink as simple line pictures, centred on 0,0, about 1 unit tall. */
function drawIcon(g: CanvasRenderingContext2D, icon: SubRoomIcon) {
  g.beginPath();
  switch (icon) {
    case 'key':
      g.arc(0, -0.28, 0.2, 0, Math.PI * 2);
      g.moveTo(0, -0.08);
      g.lineTo(0, 0.5);
      g.moveTo(0, 0.3);
      g.lineTo(0.16, 0.3);
      g.moveTo(0, 0.44);
      g.lineTo(0.12, 0.44);
      break;
    case 'anvil':
      g.moveTo(-0.46, -0.22);
      g.lineTo(0.3, -0.22);
      g.quadraticCurveTo(0.5, -0.2, 0.5, -0.08);
      g.lineTo(0.18, -0.02);
      g.lineTo(0.12, 0.18);
      g.lineTo(0.3, 0.36);
      g.lineTo(-0.3, 0.36);
      g.lineTo(-0.12, 0.18);
      g.lineTo(-0.2, -0.02);
      g.lineTo(-0.46, -0.08);
      g.closePath();
      break;
    case 'lamp':
      // an oil lamp: bowl, spout, flame
      g.moveTo(-0.4, 0.12);
      g.quadraticCurveTo(-0.3, 0.42, 0.04, 0.42);
      g.quadraticCurveTo(0.3, 0.4, 0.44, 0.1);
      g.lineTo(-0.4, 0.12);
      g.moveTo(0.3, 0.02);
      g.quadraticCurveTo(0.2, -0.28, 0.32, -0.46);
      g.quadraticCurveTo(0.46, -0.24, 0.3, 0.02);
      break;
    case 'table':
      g.moveTo(-0.46, -0.12);
      g.lineTo(0.46, -0.12);
      g.moveTo(-0.34, -0.12);
      g.lineTo(-0.34, 0.42);
      g.moveTo(0.34, -0.12);
      g.lineTo(0.34, 0.42);
      g.moveTo(-0.34, 0.14);
      g.lineTo(0.34, 0.14);
      break;
  }
  g.stroke();
}

/** Texture corners for a tetrahedron face: an equilateral triangle in UV space. */
const TRI_UV: [number, number][] = [
  [0.5, 0.95],
  [0.06, 0.19],
  [0.94, 0.19],
];

/**
 * A tetrahedron face showing, near each of its three corners, the sub-room of
 * the vertex at that corner — upright towards the corner, so the die is read
 * at its apex: the three faces round the top vertex all show its sub-room at
 * the top.
 */
function tetraFaceTexture(labels: [number, number, number]): THREE.CanvasTexture {
  const size = 256;
  const c = woodCanvas(size);
  const g = c.getContext('2d')!;
  const px = TRI_UV.map(([u, v]) => [u * size, (1 - v) * size]);
  const cx = (px[0][0] + px[1][0] + px[2][0]) / 3;
  const cy = (px[0][1] + px[1][1] + px[2][1]) / 3;
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  labels.forEach((label, i) => {
    const [x, y] = px[i];
    // a third of the way from the corner towards the middle
    const ax = x + (cx - x) * 0.34;
    const ay = y + (cy - y) * 0.34;
    const angle = Math.atan2(x - cx, cy - y); // "up" points at the corner
    g.save();
    g.translate(ax, ay);
    g.rotate(angle);
    g.scale(50, 50);
    g.lineWidth = 0.1;
    drawIcon(g, TETRA[label].icon);
    g.restore();
  });
  return texture(c);
}

// ------------------------------------------------------------------ meshes --

const ink = new THREE.LineBasicMaterial({ color: INK });

function cubeMesh(): { mesh: THREE.Mesh; faceMaterials: THREE.MeshStandardMaterial[] } {
  const { faces } = truncatedCube();
  const positions: number[] = [];
  const uvs: number[] = [];
  const geo = new THREE.BufferGeometry();
  let start = 0;
  const groups: [number, number, number][] = [];
  for (const face of faces) {
    const n = face.normal;
    const spec = face.label === null ? null : CUBE_FACES[face.label];
    const right = spec ? cross(spec.up, n) : ([1, 0, 0] as V3);
    for (let i = 1; i < face.points.length - 1; i++) {
      for (const p of [face.points[0], face.points[i], face.points[i + 1]]) {
        positions.push(...p);
        if (spec) uvs.push(0.5 + dot(p, right) / (2 * CUBE_HALF), 0.5 + dot(p, spec.up) / (2 * CUBE_HALF));
        else uvs.push(0.02, 0.02);
      }
    }
    const count = (face.points.length - 2) * 3;
    groups.push([start, count, face.label ?? 6]);
    start += count;
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  for (const [s, c, m] of groups) geo.addGroup(s, c, m);
  geo.computeVertexNormals();
  const wood = texture(woodCanvas());
  const faceMaterials = CUBE_FACES.map(() => new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }));
  const corner = new THREE.MeshStandardMaterial({ color: WOOD_BASE, roughness: 0.75 });
  const mesh = new THREE.Mesh(geo, [...faceMaterials, corner]);
  mesh.castShadow = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 10), ink));
  return { mesh, faceMaterials };
}

function tetraMesh(): { mesh: THREE.Mesh; faceMaterials: THREE.MeshStandardMaterial[] } {
  const { faces } = tetrahedron();
  const positions: number[] = [];
  const uvs: number[] = [];
  const geo = new THREE.BufferGeometry();
  faces.forEach((face, j) => {
    face.vertexIndices.forEach((vi, corner) => {
      positions.push(...TETRA_VERTS[vi]);
      uvs.push(...TRI_UV[corner]);
    });
    geo.addGroup(j * 3, 3, j);
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const faceMaterials = faces.map(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }));
  const mesh = new THREE.Mesh(geo, faceMaterials);
  mesh.castShadow = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 10), ink));
  return { mesh, faceMaterials };
}

// ------------------------------------------------------------- labellings --

/** The 24 rotations of the cube, as signed permutation matrices with determinant 1. */
const CUBE_ROTATIONS: number[][][] = (() => {
  const out: number[][][] = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) for (let signs = 0; signs < 8; signs++) {
    const m = [0, 1, 2].map((r) => {
      const row = [0, 0, 0];
      row[p[r]] = signs & (1 << r) ? -1 : 1;
      return row;
    });
    const det =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    if (det === 1) out.push(m);
  }
  return out;
})();

const apply = (m: number[][], v: V3): V3 => [dot(m[0] as V3, v), dot(m[1] as V3, v), dot(m[2] as V3, v)];
const faceOf = (n: V3) => CUBE_FACES.findIndex((f) => dot(f.n, n) > 0.5);

/** A labelling of the cube's faces that puts School `chosen` on face `up`: the base labelling turned by one of the cube's 24 rotations, never permuted freely, so R/I, P/W and S/A stay opposite on every throw. */
export function cubeLabelling(up: number, chosen: number): number[] {
  const from = CUBE_BASE.indexOf(chosen);
  const rotation = CUBE_ROTATIONS.find((m) => faceOf(apply(m, CUBE_FACES[from].n)) === up)!;
  const labels = new Array<number>(6);
  CUBE_FACES.forEach((f, i) => {
    labels[faceOf(apply(rotation, f.n))] = CUBE_BASE[i];
  });
  return labels;
}

/** A labelling of the tetrahedron's vertices that puts sub-stance `chosen` on vertex `up`: a half-turn about an edge axis, so an even permutation — a rotation, not a mirror image. */
export function tetraLabelling(up: number, chosen: number): number[] {
  const labels = [0, 1, 2, 3];
  if (up === chosen) return labels;
  const [x, y] = [0, 1, 2, 3].filter((i) => i !== up && i !== chosen);
  labels[up] = chosen;
  labels[chosen] = up;
  labels[x] = y;
  labels[y] = x;
  return labels;
}

// ----------------------------------------------------------------- physics --

const STEP = 1 / 120;
const RECORD_EVERY = 2; // 60 recorded frames a second
const MAX_SECONDS = 7;

export interface Impact {
  t: number;
  speed: number;
  kind: 'die' | 'floor';
}

interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
}

interface Simulation {
  frames: Float32Array[]; // per die: [x y z qx qy qz qw] per recorded frame
  impacts: Impact[];
  duration: number;
  final: Pose[];
}

type Which = 'cube' | 'tetra';

function cubeShape(): CANNON.ConvexPolyhedron {
  const { vertices, faces, index } = truncatedCube();
  return new CANNON.ConvexPolyhedron({
    vertices: vertices.map((v) => new CANNON.Vec3(...v)),
    faces: faces.map((f) => f.points.map(index)),
  });
}

function tetraShape(): CANNON.ConvexPolyhedron {
  const { faces } = tetrahedron();
  return new CANNON.ConvexPolyhedron({
    vertices: TETRA_VERTS.map((v) => new CANNON.Vec3(...v)),
    faces: faces.map((f) => f.vertexIndices),
  });
}

/** Uniform in [0, 1), from the platform's CSPRNG: throws are not predictable either. */
function unit(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

function simulate(thrown: Which[], resting: Partial<Record<Which, Pose>>): Simulation {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0) });
  world.allowSleep = true;
  const dieMat = new CANNON.Material('die');
  const floorMat = new CANNON.Material('floor');
  world.addContactMaterial(new CANNON.ContactMaterial(dieMat, floorMat, { friction: 0.12, restitution: 0.4 }));
  world.addContactMaterial(new CANNON.ContactMaterial(dieMat, dieMat, { friction: 0.08, restitution: 0.5 }));

  const floor = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  // the Clearing's rim, as a ring of low walls the dice rebound from
  const segments = 32;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const wall = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Box(new CANNON.Vec3(0.2, 2, (Math.PI * CLEARING_RADIUS) / segments + 0.1)) });
    wall.position.set(Math.cos(a) * (CLEARING_RADIUS + 0.2), 2, Math.sin(a) * (CLEARING_RADIUS + 0.2));
    wall.quaternion.setFromEuler(0, -a, 0);
    world.addBody(wall);
  }

  const bodies: Record<Which, CANNON.Body> = {
    cube: new CANNON.Body({ mass: 1, material: dieMat, shape: cubeShape() }),
    tetra: new CANNON.Body({ mass: 0.7, material: dieMat, shape: tetraShape() }),
  };
  const impacts: Impact[] = [];
  let step = 0;
  const base = unit() * Math.PI * 2;
  (['cube', 'tetra'] as Which[]).forEach((which, i) => {
    const body = bodies[which];
    body.sleepSpeedLimit = 0.08;
    body.sleepTimeLimit = 0.25;
    body.linearDamping = 0.25;
    body.angularDamping = 0.15;
    if (thrown.includes(which)) {
      // in from the rim, towards the middle, tumbling
      const a = base + i * 0.5;
      body.position.set(Math.cos(a) * (CLEARING_RADIUS - 1), 2.5 + unit(), Math.sin(a) * (CLEARING_RADIUS - 1));
      body.quaternion.setFromEuler(unit() * 6.3, unit() * 6.3, unit() * 6.3);
      const to = a + Math.PI + (unit() - 0.5) * 0.7;
      const speed = 6.5 + unit() * 2.5;
      body.velocity.set(Math.cos(to) * speed, -2, Math.sin(to) * speed);
      body.angularVelocity.set((unit() - 0.5) * 30, (unit() - 0.5) * 30, (unit() - 0.5) * 30);
    } else {
      // the other die lies where it came to rest, and does not move
      const pose = resting[which];
      if (!pose) return;
      body.type = CANNON.Body.STATIC;
      body.mass = 0;
      body.position.set(pose.p.x, pose.p.y, pose.p.z);
      body.quaternion.set(pose.q.x, pose.q.y, pose.q.z, pose.q.w);
    }
    body.addEventListener('collide', (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      const speed = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (speed < 0.6) return;
      const kind = e.body === bodies.cube || e.body === bodies.tetra ? 'die' : 'floor';
      impacts.push({ t: step * STEP, speed, kind });
    });
    world.addBody(body);
  });

  const order: Which[] = ['cube', 'tetra'];
  const record: number[][] = order.map(() => []);
  const moving = () => thrown.some((w) => bodies[w].sleepState !== CANNON.Body.SLEEPING);
  while (step < MAX_SECONDS / STEP) {
    if (step % RECORD_EVERY === 0) {
      order.forEach((w, i) => {
        const b = bodies[w];
        record[i].push(b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      });
    }
    world.step(STEP);
    step++;
    if (step > 30 && !moving()) break;
  }
  const final = order.map((w) => ({
    p: new THREE.Vector3(bodies[w].position.x, bodies[w].position.y, bodies[w].position.z),
    q: new THREE.Quaternion(bodies[w].quaternion.x, bodies[w].quaternion.y, bodies[w].quaternion.z, bodies[w].quaternion.w),
  }));
  /* A die rocks by fractions of a millimetre for a second or more before the
     engine lets it sleep. Nobody can see that, and waiting it out makes a throw
     feel slow, so the playback ends once the thrown dice stop visibly moving
     and then snaps to the resting pose — the pose that was read and labelled,
     a sub-pixel step away. */
  const still = (i: number, a: number, b: number) => {
    const r = record[i];
    const dp = Math.hypot(r[b * 7] - r[a * 7], r[b * 7 + 1] - r[a * 7 + 1], r[b * 7 + 2] - r[a * 7 + 2]);
    const dq = 1 - Math.abs(r[b * 7 + 3] * r[a * 7 + 3] + r[b * 7 + 4] * r[a * 7 + 4] + r[b * 7 + 5] * r[a * 7 + 5] + r[b * 7 + 6] * r[a * 7 + 6]);
    return dp < 0.004 && dq < 2e-6;
  };
  const frames = record[0].length / 7;
  let last = frames - 1;
  while (last > 1 && order.every((w, i) => !thrown.includes(w) || still(i, last - 1, last))) last--;
  const cut = Math.min(frames, last + 8);
  order.forEach((_, i) => {
    record[i].length = cut * 7;
    const f = final[i];
    record[i].push(f.p.x, f.p.y, f.p.z, f.q.x, f.q.y, f.q.z, f.q.w);
  });
  const ends = (cut * RECORD_EVERY) * STEP;
  // collisions within a single step are one impact; keep the hardest
  impacts.sort((a, b) => a.t - b.t);
  const merged = impacts.filter((x, i) => x.t <= ends && (i === 0 || x.t - impacts[i - 1].t > 0.03 || x.kind !== impacts[i - 1].kind));
  return { frames: record.map((r) => Float32Array.from(r)), impacts: merged, duration: ends, final };
}

// ---------------------------------------------------------------- reading --

/** Which cube face is up, and how squarely (1 = flat). */
function cubeUp(q: THREE.Quaternion): { face: number; flat: number } {
  let best = { face: -1, flat: -2 };
  CUBE_FACES.forEach((f, i) => {
    const y = new THREE.Vector3(...f.n).applyQuaternion(q).y;
    if (y > best.flat) best = { face: i, flat: y };
  });
  return best;
}

/** Which tetrahedron vertex is up (the apex), and how squarely the die sits on the opposite face. */
function tetraUp(q: THREE.Quaternion): { vertex: number; flat: number } {
  let best = { vertex: -1, y: -Infinity };
  TETRA_VERTS.forEach((v, i) => {
    const y = new THREE.Vector3(...v).applyQuaternion(q).y;
    if (y > best.y) best = { vertex: i, y };
  });
  // the apex direction is straight up when the die sits flat
  const dir = new THREE.Vector3(...TETRA_VERTS[best.vertex]).normalize().applyQuaternion(q);
  return { vertex: best.vertex, flat: dir.y };
}

// ---------------------------------------------------------------- the box --

export interface Landing {
  /** Index into CUBE / TETRA, as read off the die at rest. */
  cube?: number;
  tetra?: number;
  /** Where the cube came to rest, in page pixels relative to the canvas. */
  cubeAt?: { x: number; y: number };
  tetraAt?: { x: number; y: number };
}

export interface Clearing {
  /** Throw the named dice so they land on the chosen results. */
  roll(chosen: { cube?: number; tetra?: number }): Promise<Landing>;
  /** Put the dice at rest on the chosen results, with no throw (reduced motion). */
  place(chosen: { cube?: number; tetra?: number }): Landing;
  onImpact: (impact: Impact) => void;
  onLand: () => void;
  /** Stop drawing, and release the WebGL context and every GPU resource. */
  destroy(): void;
}

export function createClearing(host: HTMLElement): Clearing {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // sized by its host, with no stylesheet needed
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 17.5, 6.2);
  camera.lookAt(0, 0, 0.3);

  scene.add(new THREE.HemisphereLight('#fff8ec', '#b9a78a', 1.4));
  const sun = new THREE.DirectionalLight('#fff3dd', 2.1);
  sun.position.set(-5, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  scene.add(sun);

  // the Clearing: the page's own paper shows through; only the shadows and the ring are drawn
  const ground = new THREE.Mesh(new THREE.CircleGeometry(CLEARING_RADIUS + 0.4, 96), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  for (const [r, opacity] of [[CLEARING_RADIUS + 0.4, 0.9], [CLEARING_RADIUS * 0.2, 0.25]] as const) {
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * r, 0.002, Math.sin((i / 128) * Math.PI * 2) * r)),
      ),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity }),
    );
    scene.add(ring);
  }

  const cube = cubeMesh();
  const tetra = tetraMesh();
  scene.add(cube.mesh, tetra.mesh);
  const meshes: Record<Which, THREE.Mesh> = { cube: cube.mesh, tetra: tetra.mesh };

  const letterTextures = CUBE.map(letterTexture);
  const tetraTextures = new Map<string, THREE.CanvasTexture>();

  let cubeLabels = [...CUBE_BASE];
  let tetraLabels = [0, 1, 2, 3];

  const applyLabels = () => {
    cube.faceMaterials.forEach((m, f) => {
      m.map = letterTextures[cubeLabels[f]];
      m.needsUpdate = true;
    });
    const { faces } = tetrahedron();
    tetra.faceMaterials.forEach((m, j) => {
      const labels = faces[j].vertexIndices.map((v) => tetraLabels[v]) as [number, number, number];
      const key = labels.join('');
      if (!tetraTextures.has(key)) tetraTextures.set(key, tetraFaceTexture(labels));
      m.map = tetraTextures.get(key)!;
      m.needsUpdate = true;
    });
  };

  // at rest before the first throw: side by side in the middle of the Clearing
  const rest: Record<Which, Pose> = {
    cube: { p: new THREE.Vector3(-0.9, CUBE_HALF, 0.4), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, 0)) },
    tetra: { p: new THREE.Vector3(1.0, 0, 0), q: new THREE.Quaternion() },
  };
  // a tetrahedron resting on face 0, apex (vertex 0) up
  rest.tetra.q.setFromUnitVectors(new THREE.Vector3(...TETRA_VERTS[0]).normalize(), new THREE.Vector3(0, 1, 0));
  rest.tetra.p.y = -Math.min(...TETRA_VERTS.map((v) => new THREE.Vector3(...v).applyQuaternion(rest.tetra.q).y));
  const setPose = (w: Which, pose: Pose) => {
    meshes[w].position.copy(pose.p);
    meshes[w].quaternion.copy(pose.q);
  };
  setPose('cube', rest.cube);
  setPose('tetra', rest.tetra);
  applyLabels();

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let playing = false;
  let destroyed = false;
  let frame = 0;
  const render = () => renderer.render(scene, camera);
  const loop = () => {
    render();
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);

  const toScreen = (p: THREE.Vector3) => {
    const v = p.clone().project(camera);
    const { width, height } = host.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  };

  /** Read the dice as they are drawn: the physical up faces, under their current labels. */
  const read = (): Landing => {
    const c = cubeUp(meshes.cube.quaternion);
    const t = tetraUp(meshes.tetra.quaternion);
    return {
      cube: cubeLabels[c.face],
      tetra: tetraLabels[t.vertex],
      cubeAt: toScreen(meshes.cube.position),
      tetraAt: toScreen(meshes.tetra.position),
    };
  };

  const clearing: Clearing = {
    onImpact: () => {},
    onLand: () => {},
    destroy: () => {},

    async roll(chosen) {
      if (playing) throw new Error('The dice are already rolling');
      playing = true;
      const thrown = (['cube', 'tetra'] as Which[]).filter((w) => chosen[w] !== undefined);
      const resting = { cube: { p: meshes.cube.position.clone(), q: meshes.cube.quaternion.clone() }, tetra: { p: meshes.tetra.position.clone(), q: meshes.tetra.quaternion.clone() } };

      // 2. simulate unseen until every thrown die rests squarely on a face
      let sim: Simulation | null = null;
      for (let attempt = 0; attempt < 12 && !sim; attempt++) {
        const s = simulate(thrown, resting);
        const squarely =
          (!thrown.includes('cube') || cubeUp(s.final[0].q).flat > 0.97) &&
          (!thrown.includes('tetra') || tetraUp(s.final[1].q).flat > 0.97);
        if (squarely) sim = s;
      }
      if (!sim) {
        playing = false;
        throw new Error('No throw came to rest squarely in 12 tries');
      }

      // 3. label the dice so the faces that came up carry the chosen results
      if (chosen.cube !== undefined) cubeLabels = cubeLabelling(cubeUp(sim.final[0].q).face, chosen.cube);
      if (chosen.tetra !== undefined) tetraLabels = tetraLabelling(tetraUp(sim.final[1].q).vertex, chosen.tetra);
      applyLabels();

      // 4. play the recorded throw back, in real time, with its impacts
      const order: Which[] = ['cube', 'tetra'];
      const count = sim.frames[0].length / 7;
      const pa = new THREE.Vector3();
      const qa = new THREE.Quaternion();
      const qb = new THREE.Quaternion();
      await new Promise<void>((done) => {
        const start = performance.now();
        let nextImpact = 0;
        const tick = () => {
          const t = (performance.now() - start) / 1000;
          const f = Math.min(count - 1, t * (1 / (STEP * RECORD_EVERY)));
          const i = Math.floor(f);
          const j = Math.min(count - 1, i + 1);
          const k = f - i;
          order.forEach((w, d) => {
            if (!thrown.includes(w)) return;
            const fr = sim!.frames[d];
            pa.set(fr[i * 7], fr[i * 7 + 1], fr[i * 7 + 2]).lerp(new THREE.Vector3(fr[j * 7], fr[j * 7 + 1], fr[j * 7 + 2]), k);
            qa.set(fr[i * 7 + 3], fr[i * 7 + 4], fr[i * 7 + 5], fr[i * 7 + 6]);
            qb.set(fr[j * 7 + 3], fr[j * 7 + 4], fr[j * 7 + 5], fr[j * 7 + 6]);
            meshes[w].position.copy(pa);
            meshes[w].quaternion.copy(qa).slerp(qb, k);
          });
          while (nextImpact < sim!.impacts.length && sim!.impacts[nextImpact].t <= t) clearing.onImpact(sim!.impacts[nextImpact++]);
          if (i >= count - 1 || destroyed) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if (destroyed) throw new Error('The tray was destroyed during the throw');
      order.forEach((w, d) => thrown.includes(w) && setPose(w, sim!.final[d]));
      render();
      playing = false;
      clearing.onLand();

      // 5. what the dice show, read off the dice themselves
      const shown = read();
      return {
        ...(chosen.cube !== undefined ? { cube: shown.cube, cubeAt: shown.cubeAt } : {}),
        ...(chosen.tetra !== undefined ? { tetra: shown.tetra, tetraAt: shown.tetraAt } : {}),
      };
    },

    place(chosen) {
      if (chosen.cube !== undefined) {
        cubeLabels = [...CUBE_BASE];
        const face = CUBE_BASE.indexOf(chosen.cube);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...CUBE_FACES[face].n), new THREE.Vector3(0, 1, 0));
        setPose('cube', { p: rest.cube.p.clone(), q });
      }
      if (chosen.tetra !== undefined) {
        tetraLabels = [0, 1, 2, 3];
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...TETRA_VERTS[chosen.tetra]).normalize(), new THREE.Vector3(0, 1, 0));
        const y = -Math.min(...TETRA_VERTS.map((v) => new THREE.Vector3(...v).applyQuaternion(q).y));
        setPose('tetra', { p: new THREE.Vector3(rest.tetra.p.x, y, rest.tetra.p.z), q });
      }
      applyLabels();
      render();
      clearing.onLand();
      const shown = read();
      return {
        ...(chosen.cube !== undefined ? { cube: shown.cube, cubeAt: shown.cubeAt } : {}),
        ...(chosen.tetra !== undefined ? { tetra: shown.tetra, tetraAt: shown.tetraAt } : {}),
      };
    },
  };
  clearing.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    const textures = new Set<THREE.Texture>([...letterTextures, ...tetraTextures.values()]);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      for (const m of ([] as THREE.Material[]).concat(mesh.material ?? [])) {
        const map = (m as THREE.MeshStandardMaterial).map;
        if (map) textures.add(map);
        m.dispose();
      }
    });
    textures.forEach((t) => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
  return clearing;
}

export type { School, SubStance };
