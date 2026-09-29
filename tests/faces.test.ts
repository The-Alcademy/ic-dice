import { describe, expect, it } from 'vitest';
import { CUBE, TETRA } from '../src/faces';

describe('the MetaMind cube', () => {
  it('has exactly six faces, in mandala order: Purple at north, then clockwise', () => {
    expect(CUBE).toHaveLength(6);
    expect(CUBE.map((s) => s.letter)).toEqual(['R', 'P', 'S', 'I', 'W', 'A']);
    expect(CUBE.map((s) => s.faculty)).toEqual(['REBIS', 'PILOT', 'SALVE', 'IMPRO', 'WEAVE', 'ALIGN']);
    expect(CUBE.map((s) => s.colour)).toEqual(['Purple', 'Red', 'Orange', 'Yellow', 'Green', 'Blue']);
  });

  it('carries each School exactly as given', () => {
    expect(CUBE.map((s) => [s.hex, s.domain, s.hall, s.title, s.prep])).toEqual([
      ['#6A3C8C', 'PsychoAlchemy', 'the Looking Glass', 'the Hall of Reflection', 'at'],
      ['#B23A2E', 'PsychoNautics', 'the Lantern', 'the Hall of Perception', 'in'],
      ['#C45A1C', 'PsychoTherapeutics', 'the Sensorium', 'the Hall of Sensing', 'in'],
      ['#D6A92A', 'PsychoLudics', 'the Drawing Board', 'the Hall of Invention', 'at'],
      ['#4E8A3A', 'PsychoTerranics', 'the Ramble', 'the Hall of Wandering', 'on'],
      ['#2E64A0', 'PsychoTechnics', 'the Anomaly', 'the Hall of Asking', 'at'],
    ]);
  });

  it('has a Faculty initial for each face', () => {
    for (const s of CUBE) expect(s.faculty[0]).toBe(s.letter);
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
