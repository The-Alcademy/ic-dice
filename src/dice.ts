// The three dice, thrown across the Clearing with real physics, landing on
// results chosen before the throw: the MetaMind cube (the Skhool), the
// tetrahedron (the sub-stance) and the solid die (the Hall's solid).
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
import { CUBE, TETRA, SOLIDS, INK, INK_ON_DARK, type Paper, type School, type SubStance, type SubRoomIcon } from './faces';

// ---------------------------------------------------------------- geometry --

type V3 = [number, number, number];

export const CUBE_HALF = 0.74;
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

/**
 * The solid die's base labelling: which solid (index into SOLIDS) is on which
 * face. Opposite faces sum to ring 5, as a real die's sum to 7: Sphere/Icosahedron,
 * Tetrahedron/Dodecahedron, Hexahedron/Octahedron.
 */
export const SOLID_BASE = [0, 5, 1, 4, 2, 3]; // +x S, -x I, +y T, -y D, +z H, -z O

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

/** The solid die's wood: the same grain, stained darker, so it is never taken for the MetaMind cube. */
const STAIN_BASE = '#8A6844';
function stainedCanvas(size = 256): HTMLCanvasElement {
  const c = woodCanvas(size);
  const g = c.getContext('2d')!;
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = STAIN_BASE;
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** How each solid is seen when it is drawn on the die: a little from above and to one side. */
const DRAWING_VIEW = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, -0.62, 0));

/**
 * A solid as drawn on a face of the solid die: the edges of its faces turned
 * towards the viewer, in 2D, fitted to a unit box centred on 0,0 (y down, as a
 * canvas draws). The Sphere has no edges: its outline and one great circle are
 * drawn instead (see solidTexture).
 */
export function solidDrawing(code: string): [number, number, number, number][] {
  const geometry =
    code === 'T' ? new THREE.TetrahedronGeometry(1) :
    code === 'H' ? new THREE.BoxGeometry(1.2, 1.2, 1.2) :
    code === 'O' ? new THREE.OctahedronGeometry(1) :
    code === 'D' ? new THREE.DodecahedronGeometry(1) :
    code === 'I' ? new THREE.IcosahedronGeometry(1) : null;
  if (!geometry) return [];
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.getAttribute('position');
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyQuaternion(DRAWING_VIEW));
  // the triangles facing the viewer (+z), and the true edges (not the diagonals splitting a flat face)
  const front: THREE.Vector3[][] = [];
  for (let i = 0; i < pts.length; i += 3) {
    const n = new THREE.Vector3().subVectors(pts[i + 1], pts[i]).cross(new THREE.Vector3().subVectors(pts[i + 2], pts[i]));
    if (n.z > 1e-6) front.push([pts[i], pts[i + 1], pts[i + 2]]);
  }
  const edges = new THREE.EdgesGeometry(geometry, 1).getAttribute('position');
  const near = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b) < 1e-4;
  const segments: [number, number, number, number][] = [];
  for (let i = 0; i < edges.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(edges, i).applyQuaternion(DRAWING_VIEW);
    const b = new THREE.Vector3().fromBufferAttribute(edges, i + 1).applyQuaternion(DRAWING_VIEW);
    if (front.some((t) => t.some((p) => near(p, a)) && t.some((p) => near(p, b)))) segments.push([a.x, -a.y, b.x, -b.y]);
  }
  // fitted to the unit box, so every solid is drawn the same size
  const xs = segments.flatMap(([x1, , x2]) => [x1, x2]);
  const ys = segments.flatMap(([, y1, , y2]) => [y1, y2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const k = 1 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return segments.map(([x1, y1, x2, y2]) => [(x1 - cx) * k, (y1 - cy) * k, (x2 - cx) * k, (y2 - cy) * k]);
}

/** A face of the solid die: its solid, drawn in ink on the stained wood. */
function solidTexture(solid: (typeof SOLIDS)[number]): THREE.CanvasTexture {
  const size = 256;
  const c = stainedCanvas(size);
  const g = c.getContext('2d')!;
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 9;
  g.translate(size / 2, size / 2);
  const scale = size * 0.56;
  if (solid.code === 'S') {
    // the Sphere: its outline and one great circle
    g.beginPath();
    g.arc(0, 0, scale / 2, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.ellipse(0, 0, scale / 2, scale / 6, -0.35, 0, Math.PI * 2);
    g.stroke();
  } else {
    g.beginPath();
    for (const [x1, y1, x2, y2] of solidDrawing(solid.code)) {
      g.moveTo(x1 * scale, y1 * scale);
      g.lineTo(x2 * scale, y2 * scale);
    }
    g.stroke();
  }
  return texture(c);
}

function letterTexture(school: School): THREE.CanvasTexture {
  const c = woodCanvas();
  const g = c.getContext('2d')!;
  g.fillStyle = school.deep; // text on the pale wood
  g.font = '600 150px Jost, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(school.facultyLetter, 128, 138);
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

function cubeMesh(stained = false): { mesh: THREE.Mesh; faceMaterials: THREE.MeshStandardMaterial[] } {
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
  const wood = texture(stained ? stainedCanvas() : woodCanvas());
  const faceMaterials = CUBE_FACES.map(() => new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }));
  // the solid die's corners take the stain too: multiplied, as on its faces
  const corner = new THREE.MeshStandardMaterial({ color: stained ? new THREE.Color(WOOD_BASE).multiply(new THREE.Color(STAIN_BASE)) : WOOD_BASE, roughness: 0.75 });
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
  return turnedLabelling(CUBE_BASE, up, chosen);
}

/** The same for the solid die: the solid `chosen` on face `up`, opposite faces still summing to ring 5. */
export function solidLabelling(up: number, chosen: number): number[] {
  return turnedLabelling(SOLID_BASE, up, chosen);
}

/** A six-faced die's base labelling turned by one of the cube's 24 rotations so that label `chosen` is on face `up`. */
function turnedLabelling(base: number[], up: number, chosen: number): number[] {
  const from = base.indexOf(chosen);
  const rotation = CUBE_ROTATIONS.find((m) => faceOf(apply(m, CUBE_FACES[from].n)) === up)!;
  const labels = new Array<number>(6);
  CUBE_FACES.forEach((f, i) => {
    labels[faceOf(apply(rotation, f.n))] = base[i];
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
/* A throw lasts about 4 s at most. A die that has come down to the Clearing
   and is barely moving is damped hard, so it settles instead of gliding; from
   SETTLE_BY every thrown die is; and a throw not truly at rest by MAX_SECONDS
   is thrown again, unseen, so the playback never snaps a moving die to rest. */
const MAX_SECONDS = 4;
const SETTLE_BY = 3;
const DAMPING = { linear: 0.25, angular: 0.15 };
const SETTLING = { linear: 0.9, angular: 0.9 };
/** Close to rest: down on the Clearing, slower than this, turning slower than this. */
const NEAR_REST = { speed: 1.2, spin: 4, fall: 0.3 };

/* Where the dice come to rest: near the middle, one each side of the inner
   circle, apart. While a thrown die is low and still moving it is drawn gently
   towards its own spot (a shallow dish, not a magnet); a throw is kept only if
   every die then rests within REST_WITHIN of the middle and the two are
   REST_APART or more apart and not touching. */
/** The inner circle drawn on the Clearing. */
export const INNER_RADIUS = CLEARING_RADIUS * 0.2;
/** Each die's spot: this far from the middle, the two on opposite sides. */
const SPOT_RADIUS = INNER_RADIUS + 0.65;
/** The pull towards the spot, per unit of distance, while the die is low and moving. */
const PULL = 18;
/** The push away from the other die, per unit it is closer than REST_APART + 0.5. */
const PUSH = 14;
/** The dish's drag on a low, moving die, per unit of its speed across the Clearing, so it does not overshoot its spot. */
const DRAG = 3.5;
/** Slower than this, a die is left alone to settle and sleep. */
const PULL_UNTIL = 0.3;
/** Below this height (of its centre) a die counts as low enough to be pulled. */
const PULL_BELOW = 1.6;
/** Every die rests with its centre this close to the middle. */
export const REST_WITHIN = 2.8;
/** With three dice on the Clearing, the spots move out, and so may the dice: there is not room for three within REST_WITHIN, REST_APART apart. */
export const REST_WITHIN_THREE = 3.5;
/** Each die's spot when three are on the Clearing. */
const SPOT_RADIUS_THREE = 2.7;
/** The two dice rest with their centres at least this far apart (touching needs 2.4 at most: the cube's corner and the tetrahedron's point; 3 leaves a clear gap). */
export const REST_APART = 3.0;
/** Dice in contact this close to the end of a throw are touching at rest: a sleeping die makes no contacts, and falling asleep takes 0.25 s. */
const TOUCH_LOOKBACK = 0.5;

export interface Impact {
  t: number;
  speed: number;
  kind: 'die' | 'floor';
}

export interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
}

export interface Simulation {
  frames: Float32Array[]; // per die: [x y z qx qy qz qw] per recorded frame
  impacts: Impact[];
  duration: number;
  final: Pose[];
  /** Every thrown die was truly still when the recording ended. */
  settled: boolean;
  /** Two dice were in contact at the end: one leaning on, or lying against, another. */
  touching: boolean;
  /** The dice on the Clearing during the throw: those thrown, and those lying there. */
  present: Which[];
}

export type Which = 'cube' | 'tetra' | 'solid';
/** The three dice, in the order a simulation records them. */
export const DICE: readonly Which[] = ['cube', 'tetra', 'solid'];
const isSix = (w: Which) => w !== 'tetra'; // the cube and the solid die: six faces, the same body

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

export function simulate(thrown: Which[], resting: Partial<Record<Which, Pose>>): Simulation {
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
    solid: new CANNON.Body({ mass: 1, material: dieMat, shape: cubeShape() }),
  };
  const impacts: Impact[] = [];
  let step = 0;
  const base = unit() * Math.PI * 2;
  // the dice on the Clearing: those thrown, and those lying where they came to rest
  const present = DICE.filter((w) => thrown.includes(w) || resting[w]);
  const radius = present.length >= 3 ? SPOT_RADIUS_THREE : SPOT_RADIUS;
  // each thrown die's spot: the middle of the widest gap round the Clearing
  // between the dice already there (opposite a single die; across from the
  // first when two are thrown together)
  const taken = present.filter((w) => !thrown.includes(w)).map((w) => Math.atan2(resting[w]!.p.z, resting[w]!.p.x));
  const spot: Partial<Record<Which, CANNON.Vec3>> = {};
  for (const w of thrown) {
    let a = base + Math.PI / 2;
    if (taken.length) {
      const sorted = [...taken].sort((x, y) => x - y);
      let widest = -1;
      sorted.forEach((t, i) => {
        const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
        const gap = next - t;
        // equal gaps (two dice lying opposite) are chosen between at random
        if (gap > widest + 1e-6 || (Math.abs(gap - widest) <= 1e-6 && unit() < 0.5)) {
          widest = gap;
          a = t + gap / 2;
        }
      });
    }
    taken.push(a);
    spot[w] = new CANNON.Vec3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  DICE.forEach((which) => {
    const body = bodies[which];
    body.sleepSpeedLimit = 0.08;
    body.sleepTimeLimit = 0.25;
    body.linearDamping = DAMPING.linear;
    body.angularDamping = DAMPING.angular;
    if (thrown.includes(which)) {
      // in from the rim, from the side (so it never crosses the other die's path), towards its own spot, tumbling
      const s = spot[which]!;
      const a = Math.atan2(s.z, s.x) + Math.PI / 2 + (unit() - 0.5) * 0.6;
      body.position.set(Math.cos(a) * (CLEARING_RADIUS - 1), 2.5 + unit(), Math.sin(a) * (CLEARING_RADIUS - 1));
      body.quaternion.setFromEuler(unit() * 6.3, unit() * 6.3, unit() * 6.3);
      const to = Math.atan2(s.z - body.position.z, s.x - body.position.x) + (unit() - 0.5) * 0.4;
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
      const kind = DICE.some((w) => e.body === bodies[w]) ? 'die' : 'floor';
      impacts.push({ t: step * STEP, speed, kind });
    });
    world.addBody(body);
  });

  const order = DICE;
  const record: number[][] = order.map(() => []);
  let lastTouch = -1;
  const moving = () => thrown.some((w) => bodies[w].sleepState !== CANNON.Body.SLEEPING);
  while (step < MAX_SECONDS / STEP) {
    if (step % RECORD_EVERY === 0) {
      order.forEach((w, i) => {
        const b = bodies[w];
        record[i].push(b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      });
    }
    for (const w of thrown) {
      const b = bodies[w];
      const near =
        Math.abs(b.velocity.y) < NEAR_REST.fall &&
        b.velocity.length() < NEAR_REST.speed &&
        b.angularVelocity.length() < NEAR_REST.spin;
      const settle = near || step * STEP >= SETTLE_BY;
      b.linearDamping = settle ? SETTLING.linear : DAMPING.linear;
      b.angularDamping = settle ? SETTLING.angular : DAMPING.angular;
      // the dish: low and still moving, drawn towards its spot and away from the
      // other die; once slow it is left alone, so it can fall asleep
      if (b.position.y < PULL_BELOW && b.velocity.length() > PULL_UNTIL) {
        const s = spot[w]!;
        let fx = (s.x - b.position.x) * PULL - b.velocity.x * DRAG;
        let fz = (s.z - b.position.z) * PULL - b.velocity.z * DRAG;
        // and away from every other die on the Clearing
        for (const other of present) {
          if (other === w) continue;
          const o = bodies[other];
          const dx = b.position.x - o.position.x;
          const dz = b.position.z - o.position.z;
          const d = Math.hypot(dx, dz);
          if (d > 1e-6 && d < REST_APART + 0.5) {
            fx += (dx / d) * (REST_APART + 0.5 - d) * PUSH;
            fz += (dz / d) * (REST_APART + 0.5 - d) * PUSH;
          }
        }
        b.applyForce(new CANNON.Vec3(fx * b.mass, 0, fz * b.mass));
      }
    }
    world.step(STEP);
    const isDie = (b: CANNON.Body) => DICE.some((w) => bodies[w] === b);
    if (world.contacts.some((c) => isDie(c.bi) && isDie(c.bj))) lastTouch = step;
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
  const settled = thrown.every(
    (w) => bodies[w].sleepState === CANNON.Body.SLEEPING || (bodies[w].velocity.length() < 0.02 && bodies[w].angularVelocity.length() < 0.05),
  );
  // a die leaning on the other touches it until the last one sleeps; sleeping dice make no contacts, so look back
  const touching = lastTouch >= 0 && step - lastTouch <= TOUCH_LOOKBACK / STEP;
  return { frames: record.map((r) => Float32Array.from(r)), impacts: merged, duration: ends, final, settled, touching, present };
}

/**
 * A throw worth showing: every thrown die still and squarely on a face, every
 * die resting near the middle, and the two apart, neither touching nor leaning
 * on the other. The faces that came up are then relabelled to the chosen ones.
 */
export function restsWell(sim: Simulation, thrown: Which[]): boolean {
  const at = (w: Which) => sim.final[DICE.indexOf(w)];
  const out = (p: THREE.Vector3) => Math.hypot(p.x, p.z);
  const within = sim.present.length >= 3 ? REST_WITHIN_THREE : REST_WITHIN;
  const pairs = sim.present.flatMap((a, i) => sim.present.slice(i + 1).map((b) => [a, b] as const));
  return (
    sim.settled &&
    !sim.touching &&
    thrown.every((w) => (isSix(w) ? cubeUp(at(w).q).flat : tetraUp(at(w).q).flat) > 0.97) &&
    sim.present.every((w) => out(at(w).p) <= within) &&
    pairs.every(([a, b]) => Math.hypot(at(a).p.x - at(b).p.x, at(a).p.z - at(b).p.z) >= REST_APART)
  );
}

/** How many unseen throws to try before giving up. */
export const TRIES = 40;

/** Throw unseen until one rests well (see restsWell), or null after TRIES. */
export function throwUnseen(thrown: Which[], resting: Partial<Record<Which, Pose>>): Simulation | null {
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const s = simulate(thrown, resting);
    if (restsWell(s, thrown)) return s;
  }
  return null;
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

// ---------------------------------------------------------------- turning --

const UP = new THREE.Vector3(0, 1, 0);

/**
 * The orientation that brings the cube face carrying School `chosen` up, by the
 * smallest rotation from `q`. The labels stay where they are: the die is turned
 * to its own face, as a hand would turn a real one.
 */
export function cubeTurnTo(q: THREE.Quaternion, labels: number[], chosen: number): THREE.Quaternion {
  const face = labels.indexOf(chosen);
  const n = new THREE.Vector3(...CUBE_FACES[face].n).applyQuaternion(q);
  return new THREE.Quaternion().setFromUnitVectors(n, UP).multiply(q);
}

/** The orientation that brings the tetrahedron's vertex carrying `chosen` to the apex, by the smallest rotation from `q`. */
export function tetraTurnTo(q: THREE.Quaternion, labels: number[], chosen: number): THREE.Quaternion {
  const vertex = labels.indexOf(chosen);
  const dir = new THREE.Vector3(...TETRA_VERTS[vertex]).normalize().applyQuaternion(q);
  return new THREE.Quaternion().setFromUnitVectors(dir, UP).multiply(q);
}

/** How high the tetrahedron's centre sits when it rests on the floor in orientation `q`. */
export function tetraRestHeight(q: THREE.Quaternion): number {
  return -Math.min(...TETRA_VERTS.map((v) => new THREE.Vector3(...v).applyQuaternion(q).y));
}

const DOWN = new THREE.Vector3(0, -1, 0);
/** The cube's eight corners, as directions from its centre. */
const CORNERS: V3[] = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) CORNERS.push(norm([sx, sy, sz]));

/**
 * Undecided: the cube balanced on a truncated corner. The corner lowest in `q`
 * turns straight down, by the smallest rotation; no face is then up, so the die
 * shows no School.
 */
export function cubeUnsetTo(q: THREE.Quaternion): THREE.Quaternion {
  let low = new THREE.Vector3(0, Infinity, 0);
  for (const c of CORNERS) {
    const d = new THREE.Vector3(...c).applyQuaternion(q);
    if (d.y < low.y) low = d;
  }
  return new THREE.Quaternion().setFromUnitVectors(low, DOWN).multiply(q);
}

/** How high the cube's centre sits when it stands on a corner facet: that facet's distance from the centre. */
export const CUBE_CORNER_HEIGHT = (3 * CUBE_HALF - CUBE_CUT) / Math.sqrt(3);

/** Undecided: the tetrahedron balanced on its point. The vertex lowest in `q` turns straight down; a face is then up, so it shows no sub-stance. */
export function tetraUnsetTo(q: THREE.Quaternion): THREE.Quaternion {
  let low = new THREE.Vector3(0, Infinity, 0);
  for (const v of TETRA_VERTS) {
    const d = new THREE.Vector3(...v).normalize().applyQuaternion(q);
    if (d.y < low.y) low = d;
  }
  return new THREE.Quaternion().setFromUnitVectors(low, DOWN).multiply(q);
}

/** How high the tetrahedron's centre sits when it stands on its point: the distance to a vertex. */
export const TETRA_POINT_HEIGHT = Math.hypot(...TETRA_VERTS[0]);

/** The lowest point of a die in orientation `q` with its centre at height `y`: 0 when it stands on the floor. */
export function lowestPoint(which: 'cube' | 'tetra', q: THREE.Quaternion, y: number): number {
  const points = which === 'cube' ? truncatedCube().vertices : TETRA_VERTS;
  return y + Math.min(...points.map((p) => new THREE.Vector3(...p).applyQuaternion(q).y));
}

/** What a turned die shows: for the tests, and for reading back after a turn. */
export function cubeShows(q: THREE.Quaternion, labels: number[]): { label: number; flat: number } {
  const up = cubeUp(q);
  return { label: labels[up.face], flat: up.flat };
}
export function tetraShows(q: THREE.Quaternion, labels: number[]): { label: number; flat: number } {
  const up = tetraUp(q);
  return { label: labels[up.vertex], flat: up.flat };
}

// ----------------------------------------------------------------- the table --

/** Where a die is: off the table (not drawn), on the Clearing, or parked above its rim. */
export type Place = 'off' | 'table' | 'parked';

/**
 * Which die is where, and what must happen before a die is thrown, shown or
 * unset. The state machine alone: no drawing, no animation. The MetaMind cube and
 * the tetrahedron begin on the Clearing; the solid die begins off the table.
 */
export class DiceTable {
  readonly place: Record<Which, Place> = { cube: 'table', tetra: 'table', solid: 'off' };

  /** The dice lying on the Clearing: the ones a throw lands among. */
  onTable(): Which[] {
    return DICE.filter((w) => this.place[w] === 'table');
  }

  /** Park the named dice that are on the Clearing; returns those that move. A die off the table stays off. */
  park(which: readonly Which[]): Which[] {
    const moved = which.filter((w) => this.place[w] === 'table');
    for (const w of moved) this.place[w] = 'parked';
    return moved;
  }

  /** Bring parked dice back onto the Clearing (all of them, unless named); returns those that move. */
  unpark(which: readonly Which[] = DICE): Which[] {
    const moved = which.filter((w) => this.place[w] === 'parked');
    for (const w of moved) this.place[w] = 'table';
    return moved;
  }

  /**
   * Before the named dice are thrown, shown or unset: a parked die is unparked
   * first, and a die off the table comes onto it. Every named die is then on the table.
   */
  before(which: readonly Which[]): { unparked: Which[]; appeared: Which[] } {
    const unparked = this.unpark(which);
    const appeared = which.filter((w) => this.place[w] === 'off');
    for (const w of appeared) this.place[w] = 'table';
    return { unparked, appeared };
  }
}

/** The parked row: just above the Clearing's rim, as the page is seen, the dice side by side. */
export const PARK_Z = -(CLEARING_RADIUS + 1.5);
const PARK_X: Record<Which, number> = { cube: -1.3, tetra: 1.3, solid: 0 };

/**
 * A place on the Clearing for a die: `preferred` if it is REST_APART from every
 * die in `avoid`; else the first point clear of them on a circle round the
 * middle, widening the circle if it must; else the point farthest from them.
 */
export function freeSpot(preferred: THREE.Vector3 | null, avoid: THREE.Vector3[], radius = 2.4): THREE.Vector3 {
  const gap = (p: THREE.Vector3) => Math.min(Infinity, ...avoid.map((a) => Math.hypot(p.x - a.x, p.z - a.z)));
  if (preferred && gap(preferred) >= REST_APART) return preferred.clone();
  let best = new THREE.Vector3(radius, 0, 0);
  for (const r of [radius, radius + 0.6, radius + 1.1]) {
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (gap(p) > gap(best)) best = p;
    }
    if (gap(best) >= REST_APART) return best;
  }
  return best;
}

// ---------------------------------------------------------------- the box --

export interface Landing {
  /** Index into CUBE / TETRA / SOLIDS, as read off the die at rest. */
  cube?: number;
  tetra?: number;
  solid?: number;
  /** Where the cube came to rest, in page pixels relative to the canvas. */
  cubeAt?: { x: number; y: number };
  tetraAt?: { x: number; y: number };
  solidAt?: { x: number; y: number };
}

/** Which dice, and onto which result (an index into CUBE / TETRA / SOLIDS). */
export type Chosen = Partial<Record<Which, number>>;

export interface Clearing {
  /** Throw the named dice so they land on the chosen results. A parked die is unparked first; a die off the table comes onto it. */
  roll(chosen: Chosen): Promise<Landing>;
  /** Put the dice at rest on the chosen results, with no throw (reduced motion). */
  place(chosen: Chosen): Landing;
  /**
   * Turn the named dice in place to show the given faces: a short, smooth
   * rotation, lifting just clear of the floor. No throw, no sound, no landing.
   * `ms` 0 turns at once. Resolves when they are still.
   */
  turn(chosen: Chosen, ms: number): Promise<Landing>;
  /**
   * Undecide the named dice: turn each to stand balanced on a corner (the cube
   * on a truncated corner, the tetrahedron on its point), showing nothing. The
   * same short, smooth motion as turn(): no sound, no landing. `ms` 0 is at once.
   */
  unset(which: Partial<Record<Which, boolean>>, ms: number): Promise<void>;
  /**
   * Lift the named dice off the Clearing to the parked row above its rim, still
   * showing their faces; they take no part in a throw until unparked. `ms` 0 is at once.
   */
  park(which: Which[], ms: number): Promise<void>;
  /** Bring parked dice (all, unless named) back down onto the Clearing, clear of the dice there. */
  unpark(which: Which[] | undefined, ms: number): Promise<void>;
  /** Where each die is. */
  readonly table: DiceTable;
  /** Draw the ring and the shadows for this paper. */
  setPaper(paper: Paper): void;
  onImpact: (impact: Impact) => void;
  onLand: () => void;
  /** Stop drawing, and release the WebGL context and every GPU resource. */
  destroy(): void;
}

/** The ink the ring is drawn in on each paper. */
export const paperInk = (paper: Paper): string => (paper === 'dark' ? INK_ON_DARK : INK);
/** A shadow dark enough to read on each paper. */
const SHADOW: Record<Paper, number> = { light: 0.18, dark: 0.45 };

/** How the Clearing is shown in its element (see DiceTrayOptions). */
export interface ClearingOptions {
  /** Draw the Clearing's rings (the rim and the inner circle). Default true. The dice rebound from the rim either way. */
  ring?: boolean;
  /** The fraction of the element's shorter side the Clearing's rim spans, clamped to 0.2–1. Default DEFAULT_CLEARING_SIZE. */
  clearingSize?: number;
}

/** Where the camera looks at the Clearing from, and at: fixed; its field of view sets the size. */
const CAMERA_AT = new THREE.Vector3(0, 17.5, 6.2);
const CAMERA_AIM = new THREE.Vector3(0, 0, 0.3);
/** The drawn rim: just outside the wall the dice rebound from. */
const RIM_RADIUS = CLEARING_RADIUS + 0.4;
/** The field of view the tray has always framed a square element at. */
const FRAMING_FOV = 34;

/**
 * The rim's span on the view plane, one unit from the camera: the larger of its
 * width and its height (its width, seen from above and in front).
 */
function rimSpan(): number {
  const eye = new THREE.Object3D();
  eye.position.copy(CAMERA_AT);
  eye.lookAt(CAMERA_AIM); // an Object3D looks along +z; a camera along -z, so the signs below differ from a camera's
  eye.updateMatrixWorld();
  const toEye = eye.matrixWorld.clone().invert();
  let [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * RIM_RADIUS, 0.002, Math.sin(a) * RIM_RADIUS).applyMatrix4(toEye);
    const [u, v] = [p.x / p.z, p.y / p.z];
    [u0, u1, v0, v1] = [Math.min(u0, u), Math.max(u1, u), Math.min(v0, v), Math.max(v1, v)];
  }
  return Math.max(u1 - u0, v1 - v0);
}
const RIM_SPAN = rimSpan();

/** The current framing: the fraction of a square element the rim spans at the tray's usual field of view (about 0.99). */
export const DEFAULT_CLEARING_SIZE = RIM_SPAN / (2 * Math.tan(THREE.MathUtils.degToRad(FRAMING_FOV) / 2));

/** A Clearing size in 0.2–1; anything else not a number is the default. */
export function clampClearingSize(size: number | undefined): number {
  if (size === undefined || !Number.isFinite(size)) return DEFAULT_CLEARING_SIZE;
  return Math.min(1, Math.max(0.2, size));
}

/**
 * The vertical field of view (degrees) at which the rim spans `size` of the
 * element's shorter side. At the default size, a square or landscape element is
 * framed exactly as it always was; a portrait one now fits its width.
 */
export function clearingFov(size: number | undefined, width: number, height: number): number {
  if (!(width > 0 && height > 0)) return FRAMING_FOV;
  const s = clampClearingSize(size);
  // in pixels the rim spans RIM_SPAN × the focal length, which is height / (2 tan(fov / 2))
  return THREE.MathUtils.radToDeg(2 * Math.atan((height * RIM_SPAN) / (2 * s * Math.min(width, height))));
}

/**
 * The Clearing's scene without its renderer (no page needed): the light, the
 * ground that takes the shadows, and, unless `ring` is false, its two rings.
 */
export function clearingScene(paper: Paper, ring = true) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff8ec', '#b9a78a', 1.4));
  const sun = new THREE.DirectionalLight('#fff3dd', 2.1);
  sun.position.set(-5, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
  scene.add(sun);

  // the Clearing: the page's own paper shows through; only the shadows and the rings are drawn
  const shadow = new THREE.ShadowMaterial({ opacity: SHADOW[paper] });
  // wide enough for the parked row beyond the rim: parked dice keep their shadows
  const ground = new THREE.Mesh(new THREE.CircleGeometry(-PARK_Z + 1.5, 96), shadow);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const ringMaterials: THREE.LineBasicMaterial[] = [];
  const rings: THREE.LineLoop[] = [];
  if (ring) {
    for (const [r, opacity] of [[RIM_RADIUS, 0.9], [INNER_RADIUS, 0.25]] as const) {
      const material = new THREE.LineBasicMaterial({ color: paperInk(paper), transparent: true, opacity });
      ringMaterials.push(material);
      const loop = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * r, 0.002, Math.sin((i / 128) * Math.PI * 2) * r)),
        ),
        material,
      );
      rings.push(loop);
      scene.add(loop);
    }
  }
  return { scene, shadow, ringMaterials, rings };
}

export function createClearing(host: HTMLElement, paper: Paper = 'light', options: ClearingOptions = {}): Clearing {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // sized by its host, with no stylesheet needed
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(renderer.domElement);

  const { scene, shadow, ringMaterials } = clearingScene(paper, options.ring ?? true);
  const camera = new THREE.PerspectiveCamera(FRAMING_FOV, 1, 0.1, 100);
  camera.position.copy(CAMERA_AT);
  camera.lookAt(CAMERA_AIM);

  const cube = cubeMesh();
  const tetra = tetraMesh();
  const solid = cubeMesh(true);
  scene.add(cube.mesh, tetra.mesh, solid.mesh);
  const meshes: Record<Which, THREE.Mesh> = { cube: cube.mesh, tetra: tetra.mesh, solid: solid.mesh };

  const letterTextures = CUBE.map(letterTexture);
  const tetraTextures = new Map<string, THREE.CanvasTexture>();
  const solidTextures = SOLIDS.map(solidTexture);

  let cubeLabels = [...CUBE_BASE];
  let tetraLabels = [0, 1, 2, 3];
  let solidLabels = [...SOLID_BASE];

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
    solid.faceMaterials.forEach((m, f) => {
      m.map = solidTextures[solidLabels[f]];
      m.needsUpdate = true;
    });
  };

  // where each die is; the solid die begins off the table, not drawn
  const table = new DiceTable();
  const showOnTable = () => DICE.forEach((w) => (meshes[w].visible = table.place[w] !== 'off'));

  // at rest before the first throw: side by side in the middle of the Clearing
  const rest: Record<'cube' | 'tetra', Pose> = {
    cube: { p: new THREE.Vector3(-1.5, CUBE_HALF, 0.3), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, 0)) },
    tetra: { p: new THREE.Vector3(1.5, 0, -0.1), q: new THREE.Quaternion() },
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
  setPose('solid', { p: new THREE.Vector3(0, CUBE_HALF, 0), q: new THREE.Quaternion() });
  showOnTable();
  applyLabels();

  /** Where a die lay on the Clearing when it was parked: it goes back there, if that is clear. */
  const beforePark: Partial<Record<Which, THREE.Vector3>> = {};
  /** The positions of the dice on the Clearing, but for `except`. */
  const others = (except: readonly Which[]) => table.onTable().filter((w) => !except.includes(w)).map((w) => meshes[w].position.clone());

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = clearingFov(options.clearingSize, width, height);
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

  /** Read the named dice as they are drawn: the physical up faces, under their current labels. */
  const read = (which: Chosen): Landing => {
    const out: Landing = {};
    if (which.cube !== undefined) {
      out.cube = cubeLabels[cubeUp(meshes.cube.quaternion).face];
      out.cubeAt = toScreen(meshes.cube.position);
    }
    if (which.tetra !== undefined) {
      out.tetra = tetraLabels[tetraUp(meshes.tetra.quaternion).vertex];
      out.tetraAt = toScreen(meshes.tetra.position);
    }
    if (which.solid !== undefined) {
      out.solid = solidLabels[cubeUp(meshes.solid.quaternion).face];
      out.solidAt = toScreen(meshes.solid.position);
    }
    return out;
  };

  const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2); // in and out
  /** Run `pose(k)` from 0 to 1 over `ms` (at once for 0), then draw. */
  const animate = async (ms: number, pose: (k: number) => void, what: string) => {
    if (ms > 0) {
      await new Promise<void>((done) => {
        const start = performance.now();
        const tick = () => {
          const k = Math.min(1, (performance.now() - start) / ms);
          pose(k);
          if (k >= 1 || destroyed) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }
    if (destroyed) throw new Error(`The tray was destroyed during the ${what}`);
    pose(1);
    render();
  };

  /**
   * Move dice in place to new poses: a short eased rotation, lifting by what the
   * corners need to clear the floor. No physics, no impacts, no landing. `ms` 0
   * moves at once. A die already in its pose does not move.
   */
  const glide = async (targets: { w: Which; q1: THREE.Quaternion; y1: number }[], ms: number) => {
    const moves = targets
      .map((t) => ({ ...t, mesh: meshes[t.w], q0: meshes[t.w].quaternion.clone(), y0: meshes[t.w].position.y }))
      .filter((m) => m.q0.angleTo(m.q1) > 1e-3 || Math.abs(m.y0 - m.y1) > 1e-4);
    const LIFT: Record<Which, number> = { cube: CUBE_HALF * (Math.SQRT2 - 1) + 0.05, solid: CUBE_HALF * (Math.SQRT2 - 1) + 0.05, tetra: 0.2 };
    await animate(moves.length ? ms : 0, (k) => {
      const e = ease(k);
      for (const m of moves) {
        m.mesh.quaternion.copy(m.q0).slerp(m.q1, e);
        m.mesh.position.y = m.y0 + (m.y1 - m.y0) * e + LIFT[m.w] * Math.sin(Math.PI * e);
      }
    }, 'turn');
  };

  /** Carry dice to new places across the Clearing: lifted in an arc, still showing the same faces. */
  const carry = async (targets: { w: Which; to: THREE.Vector3 }[], ms: number) => {
    const moves = targets.map((t) => ({ ...t, mesh: meshes[t.w], from: meshes[t.w].position.clone() }));
    await animate(moves.length ? ms : 0, (k) => {
      const e = ease(k);
      for (const m of moves) {
        m.mesh.position.lerpVectors(m.from, m.to, e);
        m.mesh.position.y += 1.2 * Math.sin(Math.PI * e);
      }
    }, 'move');
  };

  /** Unpark the named dice (animated, `ms`), and put any off the table onto it at a clear spot (at once). */
  const bring = async (which: Which[], ms: number) => {
    const { unparked, appeared } = table.before(which);
    for (const w of appeared) {
      const spot = freeSpot(null, others([w]));
      meshes[w].position.set(spot.x, isSix(w) ? CUBE_HALF : tetraRestHeight(meshes[w].quaternion), spot.z);
    }
    showOnTable();
    await carry(unparked.map((w) => ({ w, to: backDown(w, unparked) })), ms);
  };
  /** Where a parked die comes back down: where it lay, if that is clear of the dice on the Clearing. */
  const backDown = (w: Which, moving: Which[]) => {
    const spot = freeSpot(beforePark[w] ?? null, others(moving));
    return new THREE.Vector3(spot.x, meshes[w].position.y, spot.z);
  };

  const exclusive = async <T>(work: () => Promise<T>): Promise<T> => {
    if (playing) throw new Error('The dice are already rolling');
    playing = true;
    try {
      return await work();
    } finally {
      playing = false;
    }
  };

  const clearing: Clearing = {
    table,
    setPaper(next) {
      // rings turned off stay off: there are none to recolour
      for (const m of ringMaterials) m.color.set(paperInk(next));
      shadow.opacity = SHADOW[next];
    },
    onImpact: () => {},
    onLand: () => {},
    destroy: () => {},

    async roll(chosen) {
      if (playing) throw new Error('The dice are already rolling');
      playing = true;
      const thrown = DICE.filter((w) => chosen[w] !== undefined);
      // a parked die is unparked first, a die off the table comes onto it: thrown in from the rim, both
      table.before(thrown);
      const resting: Partial<Record<Which, Pose>> = {};
      for (const w of table.onTable()) if (!thrown.includes(w)) resting[w] = { p: meshes[w].position.clone(), q: meshes[w].quaternion.clone() };

      // 2. simulate unseen until the dice rest squarely, near the middle and apart
      const sim = throwUnseen(thrown, resting);
      if (!sim) {
        playing = false;
        throw new Error(`No throw came to rest well in ${TRIES} tries`);
      }

      // 3. label the dice so the faces that came up carry the chosen results
      const final = (w: Which) => sim.final[DICE.indexOf(w)];
      if (chosen.cube !== undefined) cubeLabels = cubeLabelling(cubeUp(final('cube').q).face, chosen.cube);
      if (chosen.tetra !== undefined) tetraLabels = tetraLabelling(tetraUp(final('tetra').q).vertex, chosen.tetra);
      if (chosen.solid !== undefined) solidLabels = solidLabelling(cubeUp(final('solid').q).face, chosen.solid);
      applyLabels();

      // 4. play the recorded throw back, in real time, with its impacts
      const count = sim.frames[0].length / 7;
      const pa = new THREE.Vector3();
      const qa = new THREE.Quaternion();
      const qb = new THREE.Quaternion();
      const poseAt = (w: Which, f: number) => {
        const i = Math.floor(f);
        const j = Math.min(count - 1, i + 1);
        const k = f - i;
        const fr = sim.frames[DICE.indexOf(w)];
        pa.set(fr[i * 7], fr[i * 7 + 1], fr[i * 7 + 2]).lerp(new THREE.Vector3(fr[j * 7], fr[j * 7 + 1], fr[j * 7 + 2]), k);
        qa.set(fr[i * 7 + 3], fr[i * 7 + 4], fr[i * 7 + 5], fr[i * 7 + 6]);
        qb.set(fr[j * 7 + 3], fr[j * 7 + 4], fr[j * 7 + 5], fr[j * 7 + 6]);
        meshes[w].position.copy(pa);
        meshes[w].quaternion.copy(qa).slerp(qb, k);
      };
      thrown.forEach((w) => poseAt(w, 0));
      showOnTable();
      await new Promise<void>((done) => {
        const start = performance.now();
        let nextImpact = 0;
        const tick = () => {
          const t = (performance.now() - start) / 1000;
          const f = Math.min(count - 1, t * (1 / (STEP * RECORD_EVERY)));
          thrown.forEach((w) => poseAt(w, f));
          while (nextImpact < sim.impacts.length && sim.impacts[nextImpact].t <= t) clearing.onImpact(sim.impacts[nextImpact++]);
          if (f >= count - 1 || destroyed) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if (destroyed) throw new Error('The tray was destroyed during the throw');
      thrown.forEach((w) => setPose(w, final(w)));
      render();
      playing = false;
      clearing.onLand();

      // 5. what the dice show, read off the dice themselves
      return read(chosen);
    },

    async turn(chosen, ms) {
      const which = DICE.filter((w) => chosen[w] !== undefined);
      await exclusive(async () => {
        await bring(which, ms);
        await glide(
          which.map((w) => {
            const q = meshes[w].quaternion;
            if (w === 'tetra') {
              const q1 = tetraTurnTo(q, tetraLabels, chosen.tetra!);
              return { w, q1, y1: tetraRestHeight(q1) };
            }
            const q1 = cubeTurnTo(q, w === 'cube' ? cubeLabels : solidLabels, chosen[w]!);
            return { w, q1, y1: CUBE_HALF };
          }),
          ms,
        );
      });
      return read(chosen);
    },

    async unset(which, ms) {
      const named = DICE.filter((w) => which[w]);
      await exclusive(async () => {
        await bring(named, ms);
        await glide(
          named.map((w) => {
            const q = meshes[w].quaternion;
            return w === 'tetra' ? { w, q1: tetraUnsetTo(q), y1: TETRA_POINT_HEIGHT } : { w, q1: cubeUnsetTo(q), y1: CUBE_CORNER_HEIGHT };
          }),
          ms,
        );
      });
    },

    async park(which, ms) {
      await exclusive(async () => {
        const moved = table.park(which);
        for (const w of moved) beforePark[w] = meshes[w].position.clone();
        await carry(moved.map((w) => ({ w, to: new THREE.Vector3(PARK_X[w], meshes[w].position.y, PARK_Z) })), ms);
      });
    },

    async unpark(which, ms) {
      await exclusive(async () => {
        const moved = table.unpark(which ?? DICE);
        await carry(moved.map((w) => ({ w, to: backDown(w, moved) })), ms);
      });
    },

    place(chosen) {
      const which = DICE.filter((w) => chosen[w] !== undefined);
      // at once: a parked die comes straight back down, a die off the table appears
      const { unparked, appeared } = table.before(which);
      for (const w of unparked) meshes[w].position.copy(backDown(w, unparked));
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
      if (chosen.solid !== undefined) {
        solidLabels = [...SOLID_BASE];
        const face = SOLID_BASE.indexOf(chosen.solid);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...CUBE_FACES[face].n), new THREE.Vector3(0, 1, 0));
        // where it lies, or, just come onto the table, clear of the others
        const spot = appeared.includes('solid') ? freeSpot(null, others(['solid'])) : meshes.solid.position.clone();
        setPose('solid', { p: new THREE.Vector3(spot.x, CUBE_HALF, spot.z), q });
      }
      showOnTable();
      applyLabels();
      render();
      clearing.onLand();
      return read(chosen);
    },
  };
  clearing.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    const textures = new Set<THREE.Texture>([...letterTextures, ...tetraTextures.values(), ...solidTextures]);
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
