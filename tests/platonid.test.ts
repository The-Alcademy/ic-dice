// The Platonid (0.13.0): a Hall's own solid as a die, thrown alone after the
// colour and solid dice (a trial, Matthew, 25 Nov 2026; not ruled). Its faces
// are numbered as ic-canon numbers them (generated/face_normals.json, D-63,
// D-65, D-66). Static: geometry, physics and poses as numbers, without WebGL.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FACE_NORMALS, FACE_NORMALS_STAMP } from '../src/face-normals';
import {
  PLATONID_CODES, platonidLanded, platonidModel, platonidRestHeight, platonidTurnTo, platonidTwist, platonidUnsetTo, platonidFacing, type PlatonidCode,
} from '../src/platonid';
import { CUBE_BASE, DiceTable, SOLID_BASE, cubeReadPose, platonidReadPose, readingSpots, restsWell, simulate, throwUnseen, REST_APART, type Pose, type Which } from '../src/dice';
import { CUBE } from '../src/faces';
import { chooseRoll, landingRipples, platonidSpec, withoutDice } from '../src/tray';

const EYE = new THREE.Vector3(0, 17.5, 6.2);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.copy(EYE);
camera.lookAt(0, 0, 0.3);
camera.updateMatrixWorld();
const screen = (p: THREE.Vector3) => p.clone().project(camera);

describe("face n is canon's face n", () => {
  it('copies face_normals.json with its stamp', () => {
    expect(FACE_NORMALS_STAMP).toEqual({ canon_version: 'canon-v0.8+untagged', canon_commit: '1842ec2', decisions: 'D-63, D-65, D-66' });
    expect(PLATONID_CODES.map((c) => FACE_NORMALS[c].length)).toEqual([4, 6, 8, 12, 20]);
  });

  it("numbers every solid's faces exactly as canon does, each face a whole polygon of the geometry", () => {
    const sides: Record<PlatonidCode, number> = { T: 3, H: 4, O: 3, D: 5, I: 3 };
    for (const code of PLATONID_CODES) {
      const model = platonidModel(code);
      expect(model.faces.map((f) => f.number)).toEqual(FACE_NORMALS[code].map((_, i) => i + 1));
      model.faces.forEach((f, i) => {
        // canon's normal i, to its 4 places
        f.normal.toArray().forEach((x, k) => expect(Math.abs(x - FACE_NORMALS[code][i][k])).toBeLessThanOrEqual(5e-5 + 1e-9));
        expect(f.points).toHaveLength(sides[code]);
        // every corner of face i lies on the plane canon's normal i defines, on the outside
        for (const p of f.points) expect(p.clone().sub(f.centre).dot(f.normal)).toBeCloseTo(0, 6);
        expect(f.centre.dot(f.normal)).toBeGreaterThan(0);
      });
      // and every triangle three.js draws belongs to one of them
      expect(new Set(model.triangles.map((t) => t.face)).size).toBe(FACE_NORMALS[code].length);
      // no part reaches past the cube's own corners by much: the 2.8 reading gap holds
      expect(model.reach).toBeLessThanOrEqual(1.2 + 1e-9);
    }
  });
});

describe('landing on a chosen face', () => {
  it("one of the solid's own symmetries carries any face to any other, leaving the solid where it was", () => {
    for (const code of PLATONID_CODES) {
      const { faces, vertices } = platonidModel(code);
      for (let landed = 0; landed < faces.length; landed++) for (let chosen = 0; chosen < faces.length; chosen++) {
        const q = platonidTwist(code, landed, chosen);
        expect(faces[chosen].normal.clone().applyQuaternion(q).dot(faces[landed].normal)).toBeCloseTo(1, 6);
        for (const v of vertices) expect(vertices.some((w) => v.clone().applyQuaternion(q).distanceTo(w) < 1e-3)).toBe(true);
      }
    }
  });

  it('a tetrahedron lands on the face it rests on; every other solid on the face that is up', () => {
    for (const code of PLATONID_CODES) {
      platonidModel(code).faces.forEach((_, chosen) => {
        const q = platonidTurnTo(code, new THREE.Quaternion(), chosen);
        expect(platonidLanded(code, q)).toEqual({ face: chosen, flat: expect.closeTo(1, 6) as unknown as number });
        const n = platonidModel(code).faces[chosen].normal.clone().applyQuaternion(q);
        expect(n.y).toBeCloseTo(code === 'T' ? -1 : 1, 6);
      });
    }
  });

  it('every solid is thrown alone among the dice lying in the reading row, and lands on the face chosen', () => {
    const spots = readingSpots(['cube', 'solid']);
    const resting: Partial<Record<Which, Pose>> = { cube: cubeReadPose(CUBE_BASE, 2, spots.cube!), solid: cubeReadPose(SOLID_BASE, 4, spots.solid!) };
    for (const code of PLATONID_CODES) {
      const n = platonidModel(code).faces.length;
      for (let k = 0; k < 6; k++) {
        const sim = throwUnseen(['platonid'], resting, code);
        expect(sim, `${code}: a throw rests well within the tries`).not.toBeNull();
        expect(restsWell(sim!, ['platonid'])).toBe(true);
        const final = sim!.final[3];
        const chosen = (k * 7) % n;
        const shown = final.q.clone().multiply(platonidTwist(code, platonidLanded(code, final.q).face, chosen));
        expect(platonidLanded(code, shown).face).toBe(chosen);
        expect(platonidLanded(code, shown).flat).toBeGreaterThan(0.97);
        // clear of both dice lying there
        for (const w of ['cube', 'solid'] as const) expect(Math.hypot(final.p.x - resting[w]!.p.x, final.p.z - resting[w]!.p.z)).toBeGreaterThanOrEqual(REST_APART);
      }
    }
  }, 120000);

  it('records the Platonid among the others, and leaves the dice lying there unmoved', () => {
    const resting = { cube: { p: new THREE.Vector3(-1.4, 0.74, 0.3), q: new THREE.Quaternion() } };
    const sim = simulate(['platonid'], resting, 'D');
    expect(sim.platonid).toBe('D');
    expect(sim.present).toEqual(['cube', 'platonid']);
    expect(sim.final[0].p.toArray()).toEqual(resting.cube.p.toArray());
  });
});

describe('a Platonid holding still, and set out to be read', () => {
  it('holds still on a corner before its throw: no face squarely landed', () => {
    for (const code of PLATONID_CODES) {
      const q = platonidUnsetTo(code, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 1.1, 0.2)));
      expect(platonidLanded(code, q).flat).toBeLessThan(0.97);
      expect(platonidRestHeight(code, q)).toBeCloseTo(platonidModel(code).reach, 6);
    }
  });

  it('turns the face it landed on to look at the camera, upright, standing on the floor', () => {
    const row = readingSpots(['cube', 'solid', 'platonid']);
    for (const code of PLATONID_CODES) {
      platonidModel(code).faces.forEach((face, chosen) => {
        const { p, q } = platonidReadPose(code, chosen, row.platonid!);
        const toEye = new THREE.Vector3().subVectors(EYE, p).normalize();
        expect(face.normal.clone().applyQuaternion(q).dot(toEye)).toBeCloseTo(1, 6);
        expect(platonidFacing(code, q, toEye)).toBe(chosen);
        const top = screen(p.clone().addScaledVector(face.up.clone().applyQuaternion(q), 0.5));
        const mid = screen(p);
        expect(top.y - mid.y).toBeGreaterThan(0);
        expect(Math.abs(top.x - mid.x)).toBeLessThan((top.y - mid.y) * 0.05);
        expect(p.y).toBeCloseTo(platonidRestHeight(code, q), 9);
      });
    }
  });

  it('runs colour die, solid die, Platonid, left to right, so the row reads as a Room geocode (PD, then R3)', () => {
    const row = readingSpots(['platonid', 'solid', 'cube']);
    const xs = [row.cube!, row.solid!, row.platonid!].map((v) => screen(v).x);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    expect(row.platonid!.x - row.solid!.x).toBeCloseTo(2.8, 9); // the reading gap kept
    // four in a row (a tray with its tetrahedron) close up to stay inside the rim
    const four = readingSpots(['cube', 'tetra', 'solid', 'platonid']);
    for (const v of Object.values(four)) expect(Math.abs(v!.x) + 1.2).toBeLessThanOrEqual(5.2);
  });
});

describe('the tray', () => {
  it('throws the Platonid alone, onto a face 1 to n, and reports it so', () => {
    expect(chooseRoll({ platonid: 3 }, 12)).toEqual({ chosen: { platonid: 2 }, result: { platonid: 3 } });
    const r = chooseRoll({ platonid: 'random' }, 20).result.platonid!;
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(20);
    expect(() => chooseRoll({ platonid: 1 })).toThrow('There is no Platonid on the Clearing: place one first');
    expect(() => chooseRoll({ platonid: 13 }, 12)).toThrow('No face 13 on the Platonid: it has faces 1 to 12');
    expect(() => chooseRoll({ platonid: 1, skhool: 'R' }, 12)).toThrow('The Platonid is thrown alone');
    expect(landingRipples('ripple', { platonid: 2 }, { platonid: 2, platonidAt: { x: 1, y: 2 } }, '#8659a3')).toEqual([{ at: { x: 1, y: 2 }, colour: '#8659a3' }]);
  });

  it("takes its Skhool's colour, and draws its numbers in ink or white, whichever stands out", () => {
    const rebis = CUBE.find((s) => s.facultyLetter === 'R')!;
    expect(platonidSpec({ solid: 'D', skhool: 'R' })).toEqual({ solid: 'D', colour: rebis.core, on: '#ffffff' });
    expect(() => platonidSpec({ solid: 'S' as PlatonidCode, skhool: 'R' })).toThrow('No Platonid "S": it is one of T, H, O, D, I');
  });

  it("without: ['tetra'] leaves the tetrahedron out entirely", async () => {
    expect(withoutDice(undefined)).toEqual([]);
    expect(withoutDice(['tetra'])).toEqual(['tetra']);
    expect(() => withoutDice(['cube'])).toThrow(`without takes ['tetra'], not ["cube"]`);
    const t = new DiceTable(['tetra']);
    expect(t.place.tetra).toBe('off');
    expect(t.onTable()).toEqual(['cube']);
    expect(t.park(['cube', 'tetra'])).toEqual(['cube']); // never parked
    expect(() => t.before(['tetra'])).toThrow('This tray has no tetrahedron'); // never thrown
    const { readFileSync } = await import('node:fs');
    const dice = readFileSync(new URL('../src/dice.ts', import.meta.url), 'utf8');
    expect(dice).toContain("if (!without.includes('tetra')) scene.add(tetra.mesh);"); // never drawn
    const tray = readFileSync(new URL('../src/tray.ts', import.meta.url), 'utf8');
    expect(tray).toContain("noTetra(pick.subStance !== undefined);");
  });

  it('a new Hall takes the Platonid off: a roll or unset() of the colour or solid die', async () => {
    const t = new DiceTable();
    t.before(['platonid']);
    expect(t.remove(['platonid'])).toEqual(['platonid']);
    expect(t.place.platonid).toBe('off');
    const { readFileSync } = await import('node:fs');
    const dice = readFileSync(new URL('../src/dice.ts', import.meta.url), 'utf8');
    expect(dice).toContain("if (thrown.includes('cube') || thrown.includes('solid')) dismissPlatonid();");
    expect(dice).toContain("if (named.includes('cube') || named.includes('solid')) dismissPlatonid();");
  });
});
