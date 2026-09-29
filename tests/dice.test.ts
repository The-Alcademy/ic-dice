import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CUBE, TETRA } from '../src/faces';
import { CUBE_BASE, CUBE_FACES, cubeLabelling, tetraLabelling, cubeTurnTo, tetraTurnTo, tetraRestHeight, cubeShows, tetraShows } from '../src/dice';

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

describe('turning a die by hand to a face the student set', () => {
  // deterministic "random" orientations, so a failure can be reproduced
  let seed = 12345;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const randomQ = () => {
    const [u1, u2, u3] = [rand(), rand(), rand()];
    return new THREE.Quaternion(
      Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2), Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
      Math.sqrt(u1) * Math.sin(2 * Math.PI * u3), Math.sqrt(u1) * Math.cos(2 * Math.PI * u3),
    );
  };
  const UP = new THREE.Vector3(0, 1, 0);

  it('brings the cube face carrying the chosen School straight up, under any labelling, from any orientation', () => {
    for (let n = 0; n < 200; n++) {
      const q = randomQ();
      const labels = cubeLabelling(n % 6, (n * 7) % 6);
      for (let chosen = 0; chosen < CUBE.length; chosen++) {
        const shows = cubeShows(cubeTurnTo(q, labels, chosen), labels);
        expect(shows.label).toBe(chosen);
        expect(shows.flat).toBeCloseTo(1, 9);
      }
    }
  });

  it('brings the tetrahedron vertex carrying the chosen sub-stance to the apex', () => {
    for (let n = 0; n < 200; n++) {
      const q = randomQ();
      const labels = tetraLabelling(n % 4, (n * 3) % 4);
      for (let chosen = 0; chosen < TETRA.length; chosen++) {
        const shows = tetraShows(tetraTurnTo(q, labels, chosen), labels);
        expect(shows.label).toBe(chosen);
        expect(shows.flat).toBeCloseTo(1, 9);
      }
    }
  });

  it('turns by the smallest rotation, and not at all when the face is already up', () => {
    for (let n = 0; n < 50; n++) {
      const q = randomQ();
      const labels = [...CUBE_BASE];
      const chosen = n % 6;
      const face = labels.indexOf(chosen);
      const normal = new THREE.Vector3(...CUBE_FACES[face].n).applyQuaternion(q);
      expect(q.angleTo(cubeTurnTo(q, labels, chosen))).toBeCloseTo(normal.angleTo(UP), 9);
    }
    const flat = cubeTurnTo(new THREE.Quaternion(), [...CUBE_BASE], CUBE_BASE[2]); // +y already carries it
    expect(flat.angleTo(new THREE.Quaternion())).toBeCloseTo(0, 9);
  });

  it('rests a turned tetrahedron on its base: its centre at the inradius', () => {
    const labels = [0, 1, 2, 3];
    const inradius = tetraRestHeight(tetraTurnTo(randomQ(), labels, 0));
    for (let n = 0; n < 50; n++) {
      expect(tetraRestHeight(tetraTurnTo(randomQ(), labels, n % 4))).toBeCloseTo(inradius, 9);
    }
    expect(inradius).toBeGreaterThan(0);
  });
});
