// The solid die's wood (0.12.2): 'stained' by default; 'plain' (a trial,
// Matthew, 25 Nov 2026; not ruled) is the colour die's own light wood. Static:
// the faces are drawn into a recording stand-in for a canvas.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CUBE, SOLIDS } from '../src/faces';
import { cornerColour, faceTextures, solidWood, type FaceStyle } from '../src/dice';

/** Every rectangle filled on a canvas: its colour and how it was blended. */
const fills = new Map<object, { colour: string; blend: string }[]>();
function fakeCanvas() {
  const record: { colour: string; blend: string }[] = [];
  const ctx: Record<string, unknown> = { fillStyle: '', strokeStyle: '', font: '', globalCompositeOperation: 'source-over' };
  const ignore = () => {};
  for (const name of ['beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'ellipse', 'translate', 'save', 'restore', 'rotate', 'scale', 'closePath', 'quadraticCurveTo', 'fill', 'fillText']) ctx[name] = ignore;
  ctx.fillRect = () => record.push({ colour: String(ctx.fillStyle), blend: String(ctx.globalCompositeOperation) });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  fills.set(canvas, record);
  return canvas;
}
const ground = (t: THREE.CanvasTexture) => fills.get(t.image as object)!;

beforeEach(() => {
  fills.clear();
  vi.stubGlobal('document', { createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas() : {}) });
});
afterEach(() => vi.unstubAllGlobals());

describe('the solidWood option', () => {
  it("defaults to 'stained', takes 'plain', and refuses anything else clearly", () => {
    expect(solidWood(undefined)).toBe('stained');
    expect(solidWood('stained')).toBe('stained');
    expect(solidWood('plain')).toBe('plain');
    expect(() => solidWood('oak')).toThrow(`No solid wood "oak": it is 'stained' or 'plain'`);
  });

  it('the tray passes it to the Clearing, which builds the solid die and its faces from it', async () => {
    const { readFileSync } = await import('node:fs');
    const tray = readFileSync(new URL('../src/tray.ts', import.meta.url), 'utf8');
    expect(tray).toContain('const wood = solidWood(opts.solidWood);');
    const dice = readFileSync(new URL('../src/dice.ts', import.meta.url), 'utf8');
    const body = dice.slice(dice.indexOf('export function createClearing('));
    expect(body).toContain("const solid = cubeMesh(wood === 'stained');");
    expect(body).toContain('faceTextures(faceStyle(options.faces), wood)');
    expect(body).toContain('const cube = cubeMesh();'); // the colour die is never stained
  });
});

describe("solidWood: 'plain' gives the solid die the colour die's wood", () => {
  for (const style of ['geocode', 'default'] as FaceStyle[]) {
    it(`every solid face, with faces: '${style}', is on the cube's ground, unstained`, () => {
      const { cube, solid } = faceTextures(style, 'plain');
      const cubeGround = ground(cube[0])[0];
      expect(cubeGround.blend).toBe('source-over');
      expect(solid).toHaveLength(SOLIDS.length);
      for (const t of solid) expect(ground(t)).toEqual([cubeGround]); // the wood's base, and nothing multiplied over it
    });
  }

  it('its corners are the cube’s corners', () => {
    expect(cornerColour(false).getHexString()).toBe(new THREE.Color('#E6D2AE').getHexString());
  });
});

describe('the default is unchanged: the solid die stained', () => {
  it('every solid face is the wood with the stain multiplied over it, in both face styles', () => {
    for (const style of ['geocode', 'default'] as FaceStyle[]) {
      const { cube, solid } = faceTextures(style); // solidWood left out
      const wood = ground(cube[0])[0];
      for (const t of solid) expect(ground(t)).toEqual([wood, { colour: '#8A6844', blend: 'multiply' }]);
      for (let i = 0; i < CUBE.length; i++) expect(ground(cube[i])).toEqual([wood]); // the colour die is never stained
    }
  });

  it('its corners are the wood multiplied by the stain, as they always were', () => {
    const expected = new THREE.Color('#E6D2AE').multiply(new THREE.Color('#8A6844'));
    expect(cornerColour(true).equals(expected)).toBe(true);
    expect(cornerColour(true).getHexString()).not.toBe(cornerColour(false).getHexString());
  });
});
