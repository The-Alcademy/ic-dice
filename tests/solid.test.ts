// The solid die (0.11.0): the six places a Skhool leads to, the Hall a Skhool
// and a solid make, the Porter's line for it, a solid die labelled like a real
// die, three dice on the Clearing, and parking the first two while it is thrown.
// Static: no WebGL.

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SOLIDS, CUBE, geocodeFor, schoolByLetter, solidByCode, type SchoolLetter, type SolidCode } from '../src/faces';
import { hallLine } from '../src/porter';
import { CUBE_FACES, DICE, DiceTable, SOLID_BASE, freeSpot, restsWell, simulate, solidDrawing, solidLabelling, throwUnseen, REST_APART, type Pose } from '../src/dice';
import { chooseRoll, chooseShow, chooseUnset, mountDiceTray } from '../src/tray';

describe('SOLIDS', () => {
  it('is the table, exactly, in order', () => {
    expect(SOLIDS.map((s) => [s.code, s.name, s.faces, s.ring, s.place])).toEqual([
      ['S', 'Sphere', 0, 0, 'the Clearing'],
      ['T', 'Tetrahedron', 4, 1, 'Forest'],
      ['H', 'Hexahedron', 6, 2, 'Meadowland'],
      ['O', 'Octahedron', 8, 3, 'River'],
      ['D', 'Dodecahedron', 12, 4, 'Foothills'],
      ['I', 'Icosahedron', 20, 5, 'Mountains'],
    ]);
  });

  it('opposite faces of the solid die sum to ring 5, as a real die sums to 7', () => {
    // CUBE_FACES pairs its opposite faces: 0/1, 2/3, 4/5
    const pairs = [[0, 1], [2, 3], [4, 5]].map(([a, b]) => [SOLIDS[SOLID_BASE[a]], SOLIDS[SOLID_BASE[b]]]);
    for (const [a, b] of pairs) {
      expect(new THREE.Vector3(...CUBE_FACES[SOLID_BASE.indexOf(SOLIDS.indexOf(a))].n).dot(new THREE.Vector3(...CUBE_FACES[SOLID_BASE.indexOf(SOLIDS.indexOf(b))].n))).toBe(-1);
      expect(a.ring + b.ring).toBe(5);
    }
    expect(pairs.map(([a, b]) => `${a.name}/${b.name}`).sort()).toEqual(['Hexahedron/Octahedron', 'Sphere/Icosahedron', 'Tetrahedron/Dodecahedron']);
  });

  it('keeps opposite faces summing to 5 whatever face a throw brings up (a turned labelling, never a free one)', () => {
    for (let up = 0; up < 6; up++) for (let chosen = 0; chosen < 6; chosen++) {
      const labels = solidLabelling(up, chosen);
      expect(labels[up]).toBe(chosen);
      expect([...labels].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      for (const [a, b] of [[0, 1], [2, 3], [4, 5]]) expect(SOLIDS[labels[a]].ring + SOLIDS[labels[b]].ring).toBe(5);
    }
  });

  it('solidByCode finds each, and refuses anything else clearly', () => {
    for (const s of SOLIDS) expect(solidByCode(s.code)).toBe(s);
    expect(() => solidByCode('X')).toThrow('No solid "X" on the solid die: it is one of S, T, H, O, D, I');
  });
});

describe('geocodeFor', () => {
  it("is the Faculty's colour letter, then the solid's", () => {
    expect(geocodeFor('W', 'I')).toBe('GI');
    expect(geocodeFor('S', 'O')).toBe('OO');
    expect(geocodeFor('A', 'D')).toBe('BD');
    expect(geocodeFor('P', 'T')).toBe('RT');
    expect(geocodeFor('I', 'H')).toBe('YH');
    expect(geocodeFor('R', 'T')).toBe('PT');
  });

  it('is null for the Sphere, from every Faculty: that is the Clearing, not a Hall', () => {
    for (const s of CUBE) expect(geocodeFor(s.facultyLetter, 'S')).toBeNull();
  });
});

describe('hallLine', () => {
  const w = schoolByLetter('W');
  it('names the Hall by its geocode and its ring, as the halls table has the preposition', () => {
    expect(hallLine(w, solidByCode('I'))).toBe('You are bound for GI, in the Mountains.');
    expect(hallLine(schoolByLetter('S'), solidByCode('O'))).toBe('You are bound for OO, at the River.');
    expect(hallLine(schoolByLetter('A'), solidByCode('T'))).toBe('You are bound for BT, in the Forest.');
  });
  it('for the Sphere, returns to the Clearing, facing the Skhool’s gate', () => {
    expect(hallLine(w, solidByCode('S'))).toBe('You return to the Clearing, facing the gate of WEAVE.');
  });
});

describe('the solid die’s drawings', () => {
  it('draws each solid by the edges of its faces turned towards the viewer, fitted to a unit box', () => {
    const counts = Object.fromEntries((['T', 'H', 'O', 'D', 'I'] as SolidCode[]).map((c) => [c, solidDrawing(c).length]));
    // seen a little from above and to one side: every edge of the tetrahedron, the cube's three near faces (9 edges), and so on
    expect(counts).toEqual({ T: 6, H: 9, O: 9, D: 20, I: 18 });
    for (const c of ['T', 'H', 'O', 'D', 'I'] as SolidCode[]) for (const seg of solidDrawing(c)) for (const v of seg) expect(Math.abs(v)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(solidDrawing('S')).toEqual([]); // the Sphere is drawn as a circle and a great circle
  });
});

describe('choosing, before a die moves', () => {
  it('rolls the solid onto a named face or a random one, and refuses an unknown code clearly', () => {
    expect(chooseRoll({ solid: 'D' })).toEqual({ chosen: { solid: 4 }, result: { solid: 'D' } });
    const random = chooseRoll({ solid: 'random' });
    expect(SOLIDS.map((s) => s.code)).toContain(random.result.solid);
    expect(() => chooseRoll({ solid: 'X' as SolidCode })).toThrow('No solid "X" on the solid die: it is one of S, T, H, O, D, I');
    expect(() => chooseShow({ solid: 'Q' as SolidCode })).toThrow('No solid "Q" on the solid die');
    expect(chooseShow({ solid: 'S' })).toEqual({ solid: 0 });
    expect(chooseUnset({ solid: true })).toEqual({ cube: false, tetra: false, solid: true });
    expect(() => chooseUnset({ solid: 'X' as unknown as true })).toThrow('No solid "X" on the solid die');
    expect(() => chooseUnset({ solid: 'T' as unknown as true })).toThrow('unset() takes solid: true');
  });
});

describe('the tray refuses an unknown solid code, before it waits for anything', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('roll, show and unset reject with a clear error', async () => {
    // just enough page for mountDiceTray; the font never loads, so no WebGL is ever asked for
    const node = () => ({ style: {}, appendChild() {}, remove() {} });
    vi.stubGlobal('document', { createElement: node, fonts: { add() {}, delete() {} } });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('FontFace', class { load() { return new Promise(() => {}); } });
    const tray = mountDiceTray(node() as unknown as HTMLElement);
    await expect(tray.roll({ solid: 'X' as SolidCode })).rejects.toThrow('No solid "X" on the solid die: it is one of S, T, H, O, D, I');
    await expect(tray.show({ solid: 'Z' as SolidCode })).rejects.toThrow('No solid "Z" on the solid die');
    await expect(tray.unset({ solid: 'X' as unknown as true })).rejects.toThrow('No solid "X" on the solid die');
  });
});

describe('the table: where each die is', () => {
  it('begins with the first two on the Clearing and the solid die off the table', () => {
    const t = new DiceTable();
    expect(t.place).toEqual({ cube: 'table', tetra: 'table', solid: 'off' });
    expect(t.onTable()).toEqual(['cube', 'tetra']);
  });

  it('parks the first two, which then take no part in a throw', () => {
    const t = new DiceTable();
    expect(t.park(['cube', 'tetra'])).toEqual(['cube', 'tetra']);
    expect(t.onTable()).toEqual([]);
    // the solid die comes onto the table to be thrown, alone
    expect(t.before(['solid'])).toEqual({ unparked: [], appeared: ['solid'] });
    expect(t.onTable()).toEqual(['solid']);
  });

  it('park then roll({ skhool: "random" }) unparks the cube before throwing', () => {
    const t = new DiceTable();
    t.park(['cube', 'tetra']);
    const thrown = DICE.filter((w) => chooseRoll({ skhool: 'random' }).chosen[w] !== undefined);
    expect(thrown).toEqual(['cube']);
    expect(t.before(thrown)).toEqual({ unparked: ['cube'], appeared: [] });
    expect(t.place).toEqual({ cube: 'table', tetra: 'parked', solid: 'off' });
  });

  it('a die off the table cannot be parked; unpark brings back only parked dice', () => {
    const t = new DiceTable();
    expect(t.park(['solid'])).toEqual([]);
    t.park(['tetra']);
    expect(t.unpark()).toEqual(['tetra']);
    expect(t.unpark()).toEqual([]);
  });

  it('finds a clear spot for a die coming back, away from the dice there', () => {
    const lying = [new THREE.Vector3(0, 0, 0)];
    const back = freeSpot(new THREE.Vector3(0.5, 0, 0), lying);
    expect(Math.hypot(back.x, back.z)).toBeGreaterThanOrEqual(REST_APART - 1e-9);
    const clear = new THREE.Vector3(-2.6, 0, 1.8);
    expect(freeSpot(clear, lying)).toEqual(clear); // where it lay, when that is clear
  });
});

describe('three dice on the Clearing', () => {
  const lying = (x: number, z: number, y = 0.74): Pose => ({ p: new THREE.Vector3(x, y, z), q: new THREE.Quaternion() });

  it('throws the solid die alone once the first two are parked (not on the Clearing), and it rests near the middle', () => {
    const sim = throwUnseen(['solid'], {});
    expect(sim).not.toBeNull();
    expect(sim!.present).toEqual(['solid']);
    expect(restsWell(sim!, ['solid'])).toBe(true);
  });

  it('throws the solid die among the other two lying there, apart from both', () => {
    const resting = { cube: lying(-1.69, 0), tetra: lying(1.69, 0, 0.26) };
    const sim = throwUnseen(['solid'], resting);
    expect(sim).not.toBeNull();
    expect(sim!.present).toEqual(['cube', 'tetra', 'solid']);
    const s = sim!.final[DICE.indexOf('solid')].p;
    for (const o of [resting.cube.p, resting.tetra.p]) expect(Math.hypot(s.x - o.x, s.z - o.z)).toBeGreaterThanOrEqual(REST_APART);
  });

  it('records the three dice in order, the absent ones unmoved', () => {
    const sim = simulate(['solid'], {});
    expect(sim.frames).toHaveLength(3);
    expect(sim.final).toHaveLength(3);
  });
});
