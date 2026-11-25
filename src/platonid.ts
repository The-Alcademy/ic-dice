// The Platonid: a Hall's own solid as a die (a trial, Matthew, 25 Nov 2026; not
// ruled). Any of the five solids, in its Skhool's colour, its faces numbered 1
// to n exactly as ic-canon numbers them (generated/face_normals.json, D-63,
// D-65, D-66: copied, with its stamp, into face-normals.ts).
//
// A cube can be relabelled so the face that came up carries the chosen School.
// A Platonid cannot: its numbering is canon's. Instead the recorded throw is
// played back turned by one of the solid's own symmetries, one that carries
// the chosen face to where the landed face lay. The solid looks exactly the
// same after such a turn, so the throw is unchanged and face n is still canon's
// face n. Its faces: a tetrahedron's landed face is the one it rests on; every
// other solid's is the one facing up.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FACE_NORMALS, type PlatonidCode } from './face-normals';

export type { PlatonidCode };
export const PLATONID_CODES: readonly PlatonidCode[] = ['T', 'H', 'O', 'D', 'I'];

/** Each solid's size on the Clearing: no part of it reaches much past the cube's own corners (1.19 from the centre). */
const SIZE: Record<PlatonidCode, number> = { T: 1.2, H: 1.36, O: 1.15, D: 1.1, I: 1.1 };

function geometry(code: PlatonidCode): THREE.BufferGeometry {
  const r = SIZE[code];
  switch (code) {
    case 'T': return new THREE.TetrahedronGeometry(r);
    case 'H': return new THREE.BoxGeometry(r, r, r);
    case 'O': return new THREE.OctahedronGeometry(r);
    case 'D': return new THREE.DodecahedronGeometry(r);
    case 'I': return new THREE.IcosahedronGeometry(r);
  }
}

export interface PlatonidFace {
  /** 1 to n, as canon numbers it. */
  number: number;
  /** The face's outward normal, in the die's own frame: canon's normal for this face, unrounded. */
  normal: THREE.Vector3;
  /** The face's corners, counter-clockwise seen from outside. */
  points: THREE.Vector3[];
  centre: THREE.Vector3;
  /** Which way is up on the face, as its picture is drawn: towards a corner (an edge, on the hexahedron). */
  up: THREE.Vector3;
  /** The face's right, as its picture is drawn. */
  right: THREE.Vector3;
}

export interface PlatonidModel {
  code: PlatonidCode;
  faces: PlatonidFace[];
  /** Every corner of the solid. */
  vertices: THREE.Vector3[];
  /** The triangles three.js draws, each with the face (index) it belongs to. */
  triangles: { face: number; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }[];
  /** The farthest any part reaches from the centre. */
  reach: number;
}

const models = new Map<PlatonidCode, PlatonidModel>();

/**
 * A solid as a die: three.js's own geometry, its triangles grouped into canon's
 * faces by their normals. Throws if any triangle matches no canon face, or any
 * face no triangle: the numbering is canon's or nothing.
 */
export function platonidModel(code: PlatonidCode): PlatonidModel {
  const cached = models.get(code);
  if (cached) return cached;
  const src = geometry(code);
  const g = src.index ? src.toNonIndexed() : src;
  const pos = g.getAttribute('position');
  const normals = FACE_NORMALS[code].map((n) => new THREE.Vector3(...n));
  const triangles: PlatonidModel['triangles'] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k));
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const face = normals.findIndex((m) => m.dot(n) > 0.999);
    if (face < 0) throw new Error(`The ${code} geometry has a face canon does not number`);
    triangles.push({ face, a, b, c });
  }
  const near = (p: THREE.Vector3, q: THREE.Vector3) => p.distanceTo(q) < 1e-4;
  const vertices: THREE.Vector3[] = [];
  for (const t of triangles) for (const p of [t.a, t.b, t.c]) if (!vertices.some((v) => near(v, p))) vertices.push(p.clone());
  const faces = normals.map((canon, i) => {
    // canon's normal names the face (it is rounded to 4 places); the geometry's own, exact, is used for turning it
    const first = triangles.find((t) => t.face === i);
    if (!first) throw new Error(`Canon's face ${i + 1} of the ${code} is not on its geometry`);
    const normal = new THREE.Vector3().subVectors(first.b, first.a).cross(new THREE.Vector3().subVectors(first.c, first.a)).normalize();
    if (normal.dot(canon.clone().normalize()) < 0.9999) throw new Error(`Face ${i + 1} of the ${code} is not canon's face ${i + 1}`);
    const pts: THREE.Vector3[] = [];
    for (const t of triangles) if (t.face === i) for (const p of [t.a, t.b, t.c]) if (!pts.some((v) => near(v, p))) pts.push(p.clone());
    if (pts.length < 3) throw new Error(`Canon's face ${i + 1} of the ${code} is not on its geometry`);
    const centre = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pts.length);
    const flat = (w: THREE.Vector3) => w.clone().addScaledVector(normal, -w.dot(normal));
    // up on the face: towards the corner (the edge, on the hexahedron) nearest the world's up, as the page's glyph solids draw it
    let ref = flat(new THREE.Vector3(0, 1, 0));
    if (ref.length() < 0.1) ref = flat(new THREE.Vector3(0, 0, 1));
    ref.normalize();
    let cand = pts.map((p) => p.clone().sub(centre));
    if (code === 'H') {
      cand = [];
      for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
        if (pts[a].distanceTo(pts[b]) < SIZE.H * 1.2) cand.push(pts[a].clone().add(pts[b]).multiplyScalar(0.5).sub(centre));
      }
    }
    const up = cand.reduce((best, v) => (v.clone().normalize().dot(ref) > best.clone().normalize().dot(ref) ? v : best)).clone().normalize();
    const right = up.clone().cross(normal);
    // counter-clockwise seen from outside
    const sorted = [...pts].sort((p, q) => {
      const dp = p.clone().sub(centre);
      const dq = q.clone().sub(centre);
      return Math.atan2(dp.dot(up), dp.dot(right)) - Math.atan2(dq.dot(up), dq.dot(right));
    });
    return { number: i + 1, normal, points: sorted, centre, up, right };
  });
  const reach = Math.max(...vertices.map((v) => v.length()));
  const model = { code, faces, vertices, triangles, reach };
  models.set(code, model);
  return model;
}

/** Where a point on a face lies in its picture, a 160 × 160 box (y down), as the page's facet tiles (GG.image(…, {frame: 'facet'})) are drawn. */
export function facePicturePoint(face: PlatonidFace, p: THREE.Vector3): [number, number] {
  const xs = face.points.map((v) => v.clone().sub(face.centre).dot(face.right));
  const ys = face.points.map((v) => v.clone().sub(face.centre).dot(face.up));
  const k = 154 / (Math.max(...xs) - Math.min(...xs));
  const d = p.clone().sub(face.centre);
  return [80 + d.dot(face.right) * k, 157 - (d.dot(face.up) - Math.min(...ys)) * k];
}

/** The solid as a physical body: a convex polyhedron of the same corners and faces. */
export function platonidShape(code: PlatonidCode): CANNON.ConvexPolyhedron {
  const { vertices, faces } = platonidModel(code);
  const index = (p: THREE.Vector3) => vertices.findIndex((v) => v.distanceTo(p) < 1e-4);
  return new CANNON.ConvexPolyhedron({
    vertices: vertices.map((v) => new CANNON.Vec3(v.x, v.y, v.z)),
    faces: faces.map((f) => f.points.map(index)),
  });
}

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

/** The face that has landed, and how squarely (1 = flat): the one a tetrahedron rests on; the one facing up on every other solid. */
export function platonidLanded(code: PlatonidCode, q: THREE.Quaternion): { face: number; flat: number } {
  const want = code === 'T' ? DOWN : UP;
  let best = { face: -1, flat: -2 };
  platonidModel(code).faces.forEach((f, i) => {
    const d = f.normal.clone().applyQuaternion(q).dot(want);
    if (d > best.flat) best = { face: i, flat: d };
  });
  return best;
}

/** The face looking most nearly along `toEye`: what a Platonid set out to be read shows. */
export function platonidFacing(code: PlatonidCode, q: THREE.Quaternion, toEye: THREE.Vector3): number {
  let best = { face: -1, d: -2 };
  platonidModel(code).faces.forEach((f, i) => {
    const d = f.normal.clone().applyQuaternion(q).dot(toEye);
    if (d > best.d) best = { face: i, d };
  });
  return best.face;
}

const twists = new Map<string, THREE.Quaternion>();

/**
 * One of the solid's own rotations (in its frame) that carries face `chosen`
 * to where face `landed` is. The solid occupies exactly the same space after
 * it, so a throw played back turned by it lands the same, showing `chosen`.
 */
export function platonidTwist(code: PlatonidCode, landed: number, chosen: number): THREE.Quaternion {
  const key = `${code}${landed}:${chosen}`;
  const cached = twists.get(key);
  if (cached) return cached.clone();
  const normals = platonidModel(code).faces.map((f) => f.normal);
  const u = normals[chosen];
  const v = normals[landed];
  const w = normals.find((n) => Math.abs(n.dot(u)) < 0.99)!;
  const basis = (a: THREE.Vector3, b: THREE.Vector3) => {
    const b2 = b.clone().addScaledVector(a, -b.dot(a)).normalize();
    return new THREE.Matrix4().makeBasis(a, b2, new THREE.Vector3().crossVectors(a, b2));
  };
  const from = basis(u, w).transpose();
  for (const w2 of normals) {
    if (Math.abs(w2.dot(v) - w.dot(u)) > 1e-3) continue;
    const m = basis(v, w2).multiply(from);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    if (normals.every((n) => normals.some((o) => n.clone().applyQuaternion(q).dot(o) > 0.999))) {
      twists.set(key, q.clone());
      return q;
    }
  }
  throw new Error(`No symmetry of the ${code} carries face ${chosen + 1} to face ${landed + 1}`);
}

/** How high the solid's centre sits when its lowest point touches the floor. */
export function platonidRestHeight(code: PlatonidCode, q: THREE.Quaternion): number {
  return -Math.min(...platonidModel(code).vertices.map((v) => v.clone().applyQuaternion(q).y));
}

/** The solid at rest on the chosen face: on it (the tetrahedron) or showing it up (every other solid), by the smallest turn from `q`. */
export function platonidTurnTo(code: PlatonidCode, q: THREE.Quaternion, chosen: number): THREE.Quaternion {
  const n = platonidModel(code).faces[chosen].normal.clone().applyQuaternion(q);
  return new THREE.Quaternion().setFromUnitVectors(n, code === 'T' ? DOWN : UP).multiply(q);
}

/** Holding still, undecided: balanced on its lowest corner, which turns straight down, so no face has landed. */
export function platonidUnsetTo(code: PlatonidCode, q: THREE.Quaternion): THREE.Quaternion {
  let low = new THREE.Vector3(0, Infinity, 0);
  for (const v of platonidModel(code).vertices) {
    const d = v.clone().normalize().applyQuaternion(q);
    if (d.y < low.y) low = d;
  }
  return new THREE.Quaternion().setFromUnitVectors(low, DOWN).multiply(q);
}

/** What a host may draw on each face: an image for face n (1 to n), drawn over the face's 160 × 160 picture box. */
export type FaceImage = (n: number) => CanvasImageSource | Promise<CanvasImageSource>;

/**
 * Face n's picture: the Skhool's colour, and on it either the host's image or
 * the face's number in the Skhool's `on` colour, centred on the face.
 */
export function platonidFaceCanvas(face: PlatonidFace, colour: string, on: string, size = 256): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = colour;
  g.fillRect(0, 0, size, size);
  const [x, y] = facePicturePoint(face, face.centre);
  const k = size / 160;
  g.fillStyle = on;
  g.font = `600 ${Math.round(46 * k)}px Jost, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(face.number), x * k, y * k);
  return c;
}
