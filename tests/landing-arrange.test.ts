// landing: 'arrange' (0.12.3): a trial, Matthew, 25 Nov 2026 (not ruled). No
// ripples; the dice are set out side by side to be read, each landed face
// looking at the camera, letter upright, the result unchanged. Static: poses
// and ripples are checked as numbers, without WebGL.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  CUBE_FACES, CUBE_REACH, READ_GAP, READ_Z, cubeLabelling, cubeReadPose, cubeRestHeight, cubeShows, landingStyle, readingSpots, solidLabelling, type Which,
} from '../src/dice';
import { landingRipples } from '../src/tray';

// the tray's camera, as createClearing sets it
const EYE = new THREE.Vector3(0, 17.5, 6.2);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.copy(EYE);
camera.lookAt(0, 0, 0.3);
camera.updateMatrixWorld();
const screen = (p: THREE.Vector3) => p.clone().project(camera); // y up, x right

describe('the landing option', () => {
  it("defaults to 'ripple', takes 'arrange', and refuses anything else clearly", () => {
    expect(landingStyle(undefined)).toBe('ripple');
    expect(landingStyle('ripple')).toBe('ripple');
    expect(landingStyle('arrange')).toBe('arrange');
    expect(() => landingStyle('stack')).toThrow(`No landing "stack": it is 'ripple' or 'arrange'`);
  });

  it("'arrange' rings no ripple; 'ripple' rings one from each thrown die, as before", () => {
    const landed = { cube: 1, tetra: 2, solid: 3, cubeAt: { x: 10, y: 20 }, tetraAt: { x: 30, y: 40 }, solidAt: { x: 50, y: 60 } };
    expect(landingRipples('arrange', { cube: 1, tetra: 2, solid: 3 }, landed, '#264792')).toEqual([]);
    expect(landingRipples('ripple', { cube: 1, tetra: 2, solid: 3 }, landed, '#264792')).toEqual([
      { at: { x: 10, y: 20 }, colour: '#264792' },
      { at: { x: 30, y: 40 }, colour: '#264792' },
      { at: { x: 50, y: 60 }, colour: '#264792' },
    ]);
    // only the dice thrown ring
    expect(landingRipples('ripple', { solid: 3 }, landed, '#264792')).toEqual([{ at: { x: 50, y: 60 }, colour: '#264792' }]);
  });

  it('the tray validates it at mount, and sets the dice out only when asked', async () => {
    const { readFileSync } = await import('node:fs');
    const tray = readFileSync(new URL('../src/tray.ts', import.meta.url), 'utf8');
    expect(tray).toContain('const landing = landingStyle(opts.landing);');
    const roll = tray.slice(tray.indexOf('async roll(pick)'), tray.indexOf('async show(pick)'));
    expect(roll).toContain("if (landing === 'arrange') {");
    expect(roll).toContain('await clearing.arrange(chosen, isReduced() ? 0 : SHOW_MS)');
    expect(roll).toContain('landingRipples(landing, chosen, landed, rippleColour(school, paper))');
    expect(roll).not.toMatch(/ripple\(landed\./); // every ripple goes through landingRipples
  });
});

describe('the reading row', () => {
  it('puts one, two or three dice in a row across the middle, colour die left, solid die right', () => {
    expect(readingSpots(['cube'])).toEqual({ cube: new THREE.Vector3(0, 0, READ_Z) });
    const two = readingSpots(['solid', 'cube']);
    expect(two.cube).toEqual(new THREE.Vector3(-READ_GAP / 2, 0, READ_Z));
    expect(two.solid).toEqual(new THREE.Vector3(READ_GAP / 2, 0, READ_Z));
    const three = readingSpots(['cube', 'tetra', 'solid']);
    expect([three.cube!.x, three.tetra!.x, three.solid!.x]).toEqual([-READ_GAP, 0, READ_GAP]);
    // on screen too: the colour die left of the solid die
    expect(screen(two.cube!).x).toBeLessThan(screen(two.solid!).x);
  });

  it('keeps every die inside the Clearing, clear of its neighbour', () => {
    for (const row of [['cube'], ['cube', 'solid'], ['cube', 'tetra', 'solid']] as Which[][]) {
      const spots = Object.values(readingSpots(row));
      for (const p of spots) expect(Math.hypot(p!.x, p!.z) + CUBE_REACH).toBeLessThan(5.2); // the whole die inside the rim
    }
    expect(CUBE_REACH).toBeCloseTo(1.187, 3);
    // neighbours never touch, however they are turned, with room to spare when both are undecided on a corner
    expect(READ_GAP - 2 * CUBE_REACH).toBeGreaterThan(0.4);
  });
});

describe('a die set out to be read', () => {
  const rows: Which[][] = [['cube'], ['cube', 'solid'], ['cube', 'tetra', 'solid']];

  it('shows the same face it landed on, for every result, every labelling and every place in the row', () => {
    for (const row of rows) for (const [w, at] of Object.entries(readingSpots(row)) as [Which, THREE.Vector3][]) {
      if (w === 'tetra') continue;
      const labelling = w === 'cube' ? cubeLabelling : solidLabelling;
      for (let up = 0; up < 6; up++) for (let chosen = 0; chosen < 6; chosen++) {
        const labels = labelling(up, chosen);
        const { p, q } = cubeReadPose(labels, chosen, at);
        // the result read off the die is the chosen one, and the die is tilted well under 45°
        const shows = cubeShows(q, labels);
        expect(shows.label).toBe(chosen);
        expect(shows.flat).toBeGreaterThan(Math.cos(THREE.MathUtils.degToRad(30)));
        // the face looks straight at the camera
        const face = CUBE_FACES[labels.indexOf(chosen)];
        const n = new THREE.Vector3(...face.n).applyQuaternion(q);
        expect(n.dot(new THREE.Vector3().subVectors(EYE, p).normalize())).toBeCloseTo(1, 6);
        // its letter upright: the face's up runs up the screen, not sideways
        const top = screen(p.clone().addScaledVector(new THREE.Vector3(...face.up).applyQuaternion(q), 0.5));
        const mid = screen(p);
        expect(top.y - mid.y).toBeGreaterThan(0);
        expect(Math.abs(top.x - mid.x)).toBeLessThan((top.y - mid.y) * 0.05);
        // standing on the floor, at its place in the row
        expect(p.y).toBeCloseTo(cubeRestHeight(q), 9);
        expect([p.x, p.z]).toEqual([at.x, at.z]);
      }
    }
  });
});
