import { describe, expect, it } from 'vitest';
import { CUBE, TETRA } from '../src/faces';

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
  it('has exactly four faces: the four sub-rooms', () => {
    expect(TETRA).toHaveLength(4);
    expect(TETRA.map((s) => [s.room, s.verb, s.phrase, s.icon])).toEqual([
      ['Closet', 'acquire', 'acquiring it', 'key'],
      ['Chamber', 'practise', 'practising it', 'anvil'],
      ['Alcove', 'reflect', 'reflecting on it', 'lamp'],
      ['Parlour', 'encounter', 'encountering it', 'table'],
    ]);
  });
});

describe('the School colours', () => {
  it('are ic-house-style’s palette (tokens/tokens.json at 50548ff): core for marks, glow for them on dark, deep for letters', () => {
    expect(CUBE.map((s) => [s.facultyLetter, s.colour, s.core, s.glow, s.deep])).toEqual([
      ['R', 'Purple', '#a879e0', '#c6a3f0', '#8441d3'],
      ['P', 'Red', '#c14a55', '#e08a90', '#b43e49'],
      ['S', 'Orange', '#cf8331', '#e6a566', '#905b21'],
      ['I', 'Yellow', '#caa62c', '#ddc766', '#7a651b'],
      ['W', 'Green', '#5c9a55', '#88c081', '#43713e'],
      ['A', 'Blue', '#5285c4', '#82a8dc', '#3869a5'],
    ]);
  });

  it('has no field called just "letter" or "hex": the letter is the Faculty’s, the colours are named for their use', () => {
    for (const s of CUBE) {
      expect(s).not.toHaveProperty('letter');
      expect(s).not.toHaveProperty('hex');
    }
  });
});
