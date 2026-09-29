import { describe, expect, it } from 'vitest';
import { CUBE, TETRA } from '../src/faces';
import { CUBE_BASE, CUBE_FACES, cubeLabelling, tetraLabelling } from '../src/dice';

const letter = (i: number) => CUBE[i].letter;
/** Faces 0/1, 2/3 and 4/5 are opposite (+x/−x, +y/−y, +z/−z). */
const pairs = (labels: number[]) =>
  [0, 2, 4].map((f) => [letter(labels[f]), letter(labels[f + 1])].sort().join('/')).sort();

describe('the cube relabelling', () => {
  const OPPOSITE = ['I/R', 'P/W', 'A/S'].sort();

  it('starts from a die with R/I, P/W, S/A opposite', () => {
    expect(pairs(CUBE_BASE)).toEqual(OPPOSITE);
  });

  it('keeps R/I, P/W, S/A opposite for every chosen result, whichever face lands up', () => {
    for (let chosen = 0; chosen < CUBE.length; chosen++) {
      for (let up = 0; up < 6; up++) {
        const labels = cubeLabelling(up, chosen);
        expect(labels[up]).toBe(chosen);
        expect([...labels].sort()).toEqual([0, 1, 2, 3, 4, 5]);
        expect(pairs(labels)).toEqual(OPPOSITE);
      }
    }
  });

  it('only ever rotates the die, never mirrors it', () => {
    // where the base die's +x, +y and +z labels now sit, as a matrix: a
    // rotation has determinant +1, a mirror image −1
    const det = (m: number[][]) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    for (let chosen = 0; chosen < CUBE.length; chosen++) {
      for (let up = 0; up < 6; up++) {
        const labels = cubeLabelling(up, chosen);
        const columns = [0, 2, 4].map((baseFace) => CUBE_FACES[labels.indexOf(CUBE_BASE[baseFace])].n);
        const m = [0, 1, 2].map((r) => columns.map((c) => c[r]));
        expect(det(m)).toBe(1);
      }
    }
  });
});

describe('the tetrahedron relabelling', () => {
  it('puts the chosen sub-stance at the apex, by a rotation (an even permutation), for every case', () => {
    const parity = (p: number[]) => {
      let swaps = 0;
      const q = [...p];
      for (let i = 0; i < q.length; i++) {
        while (q[i] !== i) {
          const j = q[i];
          [q[i], q[j]] = [q[j], q[i]];
          swaps++;
        }
      }
      return swaps % 2;
    };
    for (let chosen = 0; chosen < TETRA.length; chosen++) {
      for (let up = 0; up < 4; up++) {
        const labels = tetraLabelling(up, chosen);
        expect(labels[up]).toBe(chosen);
        expect([...labels].sort()).toEqual([0, 1, 2, 3]);
        expect(parity(labels)).toBe(0);
      }
    }
  });
});
