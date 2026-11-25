import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CUBE, TETRA } from '../src/faces';
import { contrast } from '../src/dice';

describe('the MetaMind cube', () => {
  it('has exactly six faces, in mandala order: Purple at north, then clockwise', () => {
    expect(CUBE).toHaveLength(6);
    expect(CUBE.map((s) => s.facultyLetter)).toEqual(['R', 'P', 'S', 'I', 'W', 'A']);
    expect(CUBE.map((s) => s.faculty)).toEqual(['REBIS', 'PILOT', 'SALVE', 'IMPRO', 'WEAVE', 'ALIGN']);
    expect(CUBE.map((s) => s.colour)).toEqual(['Purple', 'Red', 'Orange', 'Yellow', 'Green', 'Blue']);
  });

  it('carries each School exactly as given', () => {
    expect(CUBE.map((s) => [s.domain, s.hall, s.title, s.prep])).toEqual([
      ['PsychoAlchemy', 'the Looking Glass', 'the Hall of Reflection', 'at'],
      ['PsychoNautics', 'the Lantern', 'the Hall of Perception', 'in'],
      ['PsychoTherapeutics', 'the Sensorium', 'the Hall of Sensing', 'in'],
      ['PsychoLudics', 'the Drawing Board', 'the Hall of Invention', 'at'],
      ['PsychoTerranics', 'the Ramble', 'the Hall of Wandering', 'on'],
      ['PsychoTechnics', 'the Anomaly', 'the Hall of Asking', 'at'],
    ]);
  });

  it('has a Faculty initial for each face', () => {
    for (const s of CUBE) expect(s.faculty[0]).toBe(s.facultyLetter);
  });
});

describe('the sub-stance tetrahedron', () => {
  it('has exactly four faces: the four Chambers', () => {
    expect(TETRA).toHaveLength(4);
    expect(TETRA.map((s) => [s.room, s.verb, s.phrase, s.icon])).toEqual([
      ['Closet', 'acquire', 'acquiring it', 'key'],
      ['Workshop', 'practise', 'practising it', 'anvil'],
      ['Alcove', 'reflect', 'reflecting on it', 'lamp'],
      ['Parlour', 'encounter', 'encountering it', 'table'],
    ]);
  });
});

describe('the School colours', () => {
  it('are ic-house-style’s palette (tokens/tokens.json 1.5.0 at 0c22ece: D-179, D-180): core for marks, glow for them on dark, deep for letters', () => {
    expect(CUBE.map((s) => [s.facultyLetter, s.colour, s.core, s.glow, s.deep])).toEqual([
      ['R', 'Purple', '#8659a3', '#c8a5df', '#66248e'],
      ['P', 'Red', '#cc2f2a', '#f28176', '#b9191a'],
      ['S', 'Orange', '#ec8a1c', '#ffae5f', '#995705'],
      ['I', 'Yellow', '#f5cc1f', '#ffe968', '#7a6500'],
      ['W', 'Green', '#3f8148', '#84c08a', '#295930'],
      ['A', 'Blue', '#264792', '#92a2e7', '#022e74'],
    ]);
  });

  it("glosses each Faculty exactly as the College's faculties table does (checked 30 September 2026)", () => {
    // the canon: public.faculties.gloss. "The ability to …" completes each.
    expect(CUBE.map((s) => [s.facultyLetter, s.gloss])).toEqual([
      ['R', 'transmute belief — hold opposites until a new whole forms'],
      ['P', 'steer your own consciousness'],
      ['S', 'tend and restore wellbeing'],
      ['I', 'play in earnest — to improvise'],
      ['W', 'live woven into the web of life'],
      ['A', "test reality and name what's true"],
    ]);
  });

  it('has no field called just "letter" or "hex": the letter is the Faculty’s, the colours are named for their use', () => {
    for (const s of CUBE) {
      expect(s).not.toHaveProperty('letter');
      expect(s).not.toHaveProperty('hex');
    }
  });
});

describe('the Faculty letters on the default cube (D-179, D-180)', () => {
  it("each School's deep reaches at least 3:1 on the cube's pale wood", () => {
    // the wood the cube's faces are drawn on, read from dice.ts so the check follows it
    const wood = readFileSync(new URL('../src/dice.ts', import.meta.url), 'utf8').match(/const WOOD_BASE = '(#[0-9A-Fa-f]{6})'/)![1];
    expect(wood).toBe('#E6D2AE');
    for (const s of CUBE) expect(contrast(s.deep, wood), `${s.facultyLetter} ${s.deep} on ${wood}`).toBeGreaterThanOrEqual(3);
  });
});
