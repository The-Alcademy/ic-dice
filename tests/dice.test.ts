import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CUBE, TETRA } from '../src/faces';
import { CUBE_BASE, CUBE_FACES, cubeLabelling, tetraLabelling, cubeTurnTo, tetraTurnTo, tetraRestHeight, cubeShows, tetraShows, cubeUnsetTo, tetraUnsetTo, CUBE_CORNER_HEIGHT, TETRA_POINT_HEIGHT, lowestPoint, simulate, CUBE_HALF, throwUnseen, INNER_RADIUS, REST_WITHIN, REST_APART } from '../src/dice';

const letter = (i: number) => CUBE[i].facultyLetter;
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

describe('undeciding a die: balanced on a corner, showing nothing', () => {
  let seed = 777;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const randomQ = () => {
    const [u1, u2, u3] = [rand(), rand(), rand()];
    return new THREE.Quaternion(
      Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2), Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
      Math.sqrt(u1) * Math.sin(2 * Math.PI * u3), Math.sqrt(u1) * Math.cos(2 * Math.PI * u3),
    );
  };
  const DOWN = new THREE.Vector3(0, -1, 0);
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3(x, y, z).normalize())));

  it('stands the cube on a truncated corner, on the floor, with no face up', () => {
    for (let n = 0; n < 100; n++) {
      const q = cubeUnsetTo(randomQ());
      const lowest = Math.min(...corners.map((c) => c.clone().applyQuaternion(q).y));
      expect(lowest).toBeCloseTo(-1, 9);                                    // a corner points straight down
      expect(lowestPoint('cube', q, CUBE_CORNER_HEIGHT)).toBeCloseTo(0, 9); // and its facet rests on the floor
      expect(cubeShows(q, [...CUBE_BASE]).flat).toBeCloseTo(1 / Math.sqrt(3), 9); // no face is up
    }
  });

  it('stands the tetrahedron on its point, on the floor, with a face up and no apex', () => {
    for (let n = 0; n < 100; n++) {
      const q = tetraUnsetTo(randomQ());
      expect(lowestPoint('tetra', q, TETRA_POINT_HEIGHT)).toBeCloseTo(0, 9);
      expect(tetraShows(q, [0, 1, 2, 3]).flat).toBeCloseTo(1 / 3, 9);       // no vertex is up: nothing to read
    }
  });

  it('turns by the smallest rotation, and not at all when already balanced', () => {
    for (let n = 0; n < 50; n++) {
      const q = randomQ();
      const low = corners.map((c) => c.clone().applyQuaternion(q)).sort((a, b) => a.y - b.y)[0];
      expect(q.angleTo(cubeUnsetTo(q))).toBeCloseTo(low.angleTo(DOWN), 9);
      const once = cubeUnsetTo(q);
      expect(once.angleTo(cubeUnsetTo(once))).toBeCloseTo(0, 6); // an angle near 0 from acos is good to ~1e-8
    }
  });

  it('lets show() start from there: any face turns up and the die rests on it', () => {
    for (let n = 0; n < 50; n++) {
      const labels = cubeLabelling(n % 6, (n * 5) % 6);
      const chosen = n % 6;
      const q = cubeTurnTo(cubeUnsetTo(randomQ()), labels, chosen);
      expect(cubeShows(q, labels)).toEqual({ label: chosen, flat: expect.closeTo(1, 9) });
      expect(lowestPoint('cube', q, CUBE_HALF)).toBeCloseTo(0, 9);
      const t = tetraTurnTo(tetraUnsetTo(randomQ()), [0, 1, 2, 3], n % 4);
      expect(tetraShows(t, [0, 1, 2, 3])).toEqual({ label: n % 4, flat: expect.closeTo(1, 9) });
      expect(lowestPoint('tetra', t, tetraRestHeight(t))).toBeCloseTo(0, 9);
    }
  });

  it('lets roll() start from there: the thrown die settles squarely, and the balanced one stays put', () => {
    const cubeQ = cubeUnsetTo(randomQ());
    const cube = { p: new THREE.Vector3(-0.9, CUBE_CORNER_HEIGHT, 0.4), q: cubeQ };
    let settled = 0;
    for (let n = 0; n < 6; n++) {
      const sim = simulate(['tetra'], { cube });
      if (sim.settled) settled++;
      expect(sim.final[0].q.angleTo(cubeQ)).toBeCloseTo(0, 9);               // the undecided cube did not move
      expect(sim.final[0].p.distanceTo(cube.p)).toBeCloseTo(0, 9);
    }
    expect(settled).toBeGreaterThan(0);
    const tetraQ = tetraUnsetTo(randomQ());
    const tetra = { p: new THREE.Vector3(1, TETRA_POINT_HEIGHT, 0), q: tetraQ };
    let square = 0;
    for (let n = 0; n < 12 && !square; n++) {
      const sim = simulate(['cube'], { tetra });
      if (sim.settled && cubeShows(sim.final[0].q, [...CUBE_BASE]).flat > 0.97) square++;
      expect(sim.final[1].q.angleTo(tetraQ)).toBeCloseTo(0, 9);
    }
    expect(square).toBe(1);
  });
});

describe('where the dice come to rest', () => {
  const out = (p: THREE.Vector3) => Math.hypot(p.x, p.z);
  const apart = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

  it('30 throws in a row, as a student makes them: each die near the middle, around the inner circle, apart, and on the chosen face', () => {
    // at rest before the first throw, as createClearing places them
    let resting = {
      cube: { p: new THREE.Vector3(-1.5, CUBE_HALF, 0.3), q: new THREE.Quaternion() },
      tetra: { p: new THREE.Vector3(1.5, tetraRestHeight(new THREE.Quaternion()), -0.1), q: new THREE.Quaternion() },
    };
    expect(apart(resting.cube.p, resting.tetra.p)).toBeGreaterThanOrEqual(REST_APART);
    const kinds = [['cube', 'tetra'], ['cube'], ['tetra']] as const;
    for (let n = 0; n < 30; n++) {
      const thrown = [...kinds[n % 3]];
      const sim = throwUnseen(thrown, resting);
      expect(sim, `throw ${n}`).not.toBeNull();
      const [cube, tetra] = sim!.final;
      expect(sim!.settled).toBe(true);
      expect(sim!.touching, `throw ${n}: the dice touch`).toBe(false);
      for (const [name, p] of [['cube', cube.p], ['tetra', tetra.p]] as const) {
        expect(out(p), `throw ${n}: the ${name} is ${out(p).toFixed(2)} from the middle`).toBeLessThanOrEqual(REST_WITHIN);
      }
      expect(apart(cube.p, tetra.p), `throw ${n}: the dice are ${apart(cube.p, tetra.p).toFixed(2)} apart`).toBeGreaterThanOrEqual(REST_APART);
      // "around the inner circle": between them the two dice straddle it
      expect(out(cube.p) + out(tetra.p)).toBeGreaterThanOrEqual(2 * INNER_RADIUS);
      // a die left out of the throw has not moved
      if (!thrown.includes('cube')) expect(cube.p.distanceTo(resting.cube.p)).toBeCloseTo(0, 9);
      if (!thrown.includes('tetra')) expect(tetra.p.distanceTo(resting.tetra.p)).toBeCloseTo(0, 9);
      // the chosen-face guarantee: relabelled, the face that came up is the chosen one
      if (thrown.includes('cube')) {
        const chosen = n % 6;
        const labels = cubeLabelling(cubeShows(cube.q, [0, 1, 2, 3, 4, 5]).label, chosen);
        expect(cubeShows(cube.q, labels)).toEqual({ label: chosen, flat: expect.any(Number) });
        expect(cubeShows(cube.q, labels).flat).toBeGreaterThan(0.97);
      }
      if (thrown.includes('tetra')) {
        const chosen = n % 4;
        const labels = tetraLabelling(tetraShows(tetra.q, [0, 1, 2, 3]).label, chosen);
        expect(tetraShows(tetra.q, labels).label).toBe(chosen);
        expect(tetraShows(tetra.q, labels).flat).toBeGreaterThan(0.97);
      }
      resting = { cube: { p: cube.p.clone(), q: cube.q.clone() }, tetra: { p: tetra.p.clone(), q: tetra.q.clone() } };
    }
  }, 60000);
});
