// The geocode face style (0.12.0): a trial, not ruled (Matthew's direction of
// 25 Nov 2026), drawing the cube and the solid die as a Hall's geocode reads
// (D-48). Static: the faces are drawn into a recording stand-in for a canvas,
// so no page and no WebGL are needed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CUBE, SOLIDS, INK, geocodeFor } from '../src/faces';
import { CUBE_BASE, SOLID_BASE, colourLetter, contrast, cubeLabelling, discLetterColour, faceStyle, faceTextures, solidLabelling } from '../src/dice';
import { chooseRoll } from '../src/tray';

/** A canvas that records what is drawn on it: fills (with their colour) and text. */
interface Drawn { fills: string[]; texts: { text: string; colour: string }[] }
const drawn = new Map<object, Drawn>();
function fakeCanvas() {
  const record: Drawn = { fills: [], texts: [] };
  const ctx: Record<string, unknown> = { fillStyle: '', strokeStyle: '', font: '', globalCompositeOperation: 'source-over' };
  const ignore = () => {};
  for (const name of ['fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'ellipse', 'translate', 'save', 'restore', 'rotate', 'scale', 'closePath', 'quadraticCurveTo']) ctx[name] = ignore;
  ctx.fill = () => record.fills.push(String(ctx.fillStyle));
  ctx.fillText = (text: string) => record.texts.push({ text, colour: String(ctx.fillStyle) });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  drawn.set(canvas, record);
  return canvas;
}
const record = (t: THREE.CanvasTexture) => drawn.get(t.image as object)!;

beforeEach(() => {
  drawn.clear();
  vi.stubGlobal('document', { createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas() : {}) });
});
afterEach(() => vi.unstubAllGlobals());

describe('the faces option', () => {
  it("defaults to 'default', takes 'geocode', and refuses anything else clearly", () => {
    expect(faceStyle(undefined)).toBe('default');
    expect(faceStyle('default')).toBe('default');
    expect(faceStyle('geocode')).toBe('geocode');
    expect(() => faceStyle('colour')).toThrow(`No face style "colour": it is 'default' or 'geocode'`);
  });

  it('the tray passes the style to the Clearing, which draws its faces from it', async () => {
    const { readFileSync } = await import('node:fs');
    const tray = readFileSync(new URL('../src/tray.ts', import.meta.url), 'utf8');
    expect(tray).toContain('const faces = faceStyle(opts.faces);');
    const dice = readFileSync(new URL('../src/dice.ts', import.meta.url), 'utf8');
    const body = dice.slice(dice.indexOf('export function createClearing('));
    expect(body).toContain('faceTextures(faceStyle(options.faces))');
    // the relabelling still picks a face's drawing by its School or solid, in either style
    expect(body).toContain('m.map = letterTextures[cubeLabels[f]];');
    expect(body).toContain('m.map = solidTextures[solidLabels[f]];');
  });
});

describe("faces: 'geocode'", () => {
  it('gives all six cube faces and all six solid faces a texture', () => {
    const { cube, solid } = faceTextures('geocode');
    expect(cube).toHaveLength(6);
    expect(solid).toHaveLength(6);
    for (const t of [...cube, ...solid]) {
      expect(t).toBeInstanceOf(THREE.CanvasTexture);
      expect(record(t)).toBeDefined();
    }
  });

  it("the cube: each School's face a disc in its core colour, carrying its colour letter at 3:1 or more", () => {
    const { cube } = faceTextures('geocode');
    expect(CUBE.map(colourLetter)).toEqual(['P', 'R', 'O', 'Y', 'G', 'B']);
    CUBE.forEach((school, i) => {
      const { fills, texts } = record(cube[i]);
      expect(fills).toEqual([school.core]);
      expect(texts).toHaveLength(1);
      expect(texts[0].text).toBe(colourLetter(school));
      expect(texts[0].colour).toBe(discLetterColour(school.core));
      expect(contrast(texts[0].colour, school.core)).toBeGreaterThanOrEqual(3);
    });
  });

  it('the solid die: T H O D I in ink, the Sphere keeping its drawing and no letter (D-07)', () => {
    const { solid } = faceTextures('geocode');
    SOLIDS.forEach((s, i) => {
      const { texts } = record(solid[i]);
      expect(texts).toEqual(s.code === 'S' ? [] : [{ text: s.code, colour: INK }]);
    });
  });
});

describe("faces: 'default' is as it was", () => {
  it('the cube shows Faculty letters, the solid die its drawings, no letters', () => {
    const { cube, solid } = faceTextures('default');
    CUBE.forEach((school, i) => expect(record(cube[i]).texts).toEqual([{ text: school.facultyLetter, colour: school.deep }]));
    for (const t of solid) expect(record(t).texts).toEqual([]);
  });
});

describe('a result is the same, and on the same face, in either style', () => {
  it('roll results and geocodeFor do not depend on the style', () => {
    for (const school of CUBE) for (const s of SOLIDS) {
      const { chosen, result } = chooseRoll({ skhool: school.facultyLetter, solid: s.code });
      expect(chosen).toEqual({ cube: CUBE.indexOf(school), solid: SOLIDS.indexOf(s) });
      expect(result).toEqual({ skhool: school.facultyLetter, solid: s.code });
      expect(geocodeFor(result.skhool!, result.solid!)).toBe(s.code === 'S' ? null : colourLetter(school) + s.code);
    }
    expect(geocodeFor('S', 'O')).toBe('OO'); // D-48: Orange and the Octahedron
  });

  it('every physical face draws the same School or solid in both styles', () => {
    const geocode = faceTextures('geocode');
    const plain = faceTextures('default');
    for (let up = 0; up < 6; up++) for (let chosen = 0; chosen < 6; chosen++) {
      const cubeLabels = cubeLabelling(up, chosen);
      const solidLabels = solidLabelling(up, chosen);
      for (let f = 0; f < 6; f++) {
        // the face's School, read from each style's drawing
        const school = CUBE[cubeLabels[f]];
        expect(record(geocode.cube[cubeLabels[f]]).fills).toEqual([school.core]);
        expect(record(plain.cube[cubeLabels[f]]).texts[0].text).toBe(school.facultyLetter);
        const solid = SOLIDS[solidLabels[f]];
        expect(record(geocode.solid[solidLabels[f]]).texts.map((t) => t.text)).toEqual(solid.code === 'S' ? [] : [solid.code]);
      }
    }
    expect(CUBE_BASE).toEqual([1, 4, 0, 3, 2, 5]);
    expect(SOLID_BASE).toEqual([0, 5, 1, 4, 2, 3]);
  });
});
