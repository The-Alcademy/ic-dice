// tumble: 'long' (0.13.1): the Platonid rolls for longer (a trial, Matthew,
// 25 Nov 2026; not ruled). Static: unseen throws, without WebGL.

import { describe, expect, it } from 'vitest';
import { CUBE_BASE, SOLID_BASE, TUMBLES, cubeReadPose, readingSpots, restsWell, throwUnseen, tumbleStyle, REST_WITHIN_THREE, type Pose, type Which } from '../src/dice';
import { PLATONID_CODES, platonidLanded, platonidModel, platonidTwist } from '../src/platonid';
import { rollTumble } from '../src/tray';

describe('the tumble option', () => {
  it("defaults to 'normal', takes 'long', and refuses anything else clearly", () => {
    expect(tumbleStyle(undefined)).toBe('normal');
    expect(tumbleStyle('normal')).toBe('normal');
    expect(tumbleStyle('long')).toBe('long');
    expect(() => tumbleStyle('slow')).toThrow(`No tumble "slow": it is 'normal' or 'long'`);
  });

  it("is for the Platonid's throw: the colour and solid dice keep theirs", async () => {
    expect(rollTumble({ platonid: 'random', tumble: 'long' })).toBe('long');
    expect(rollTumble({ skhool: 'random', solid: 'random' })).toBe('normal');
    expect(() => rollTumble({ skhool: 'random', tumble: 'long' })).toThrow("tumble: 'long' is for the Platonid's throw");
    const { readFileSync } = await import('node:fs');
    const tray = readFileSync(new URL('../src/tray.ts', import.meta.url), 'utf8');
    expect(tray).toContain('await clearing.roll(chosen, tumble)');
  });

  it("'normal' is the throw as it always was", () => {
    expect(TUMBLES.normal).toEqual({
      speed: [6.5, 2.5], spin: 15, damping: { linear: 0.25, angular: 0.15 }, nearAfter: 0, settleBy: 3, maxSeconds: 4,
      pull: 18, drag: 3.5, bounce: 0.4, height: 2.5, rise: -2, inset: 1,
    });
  });
});

describe("tumble: 'long'", () => {
  const spots = readingSpots(['cube', 'solid']);
  const resting: Partial<Record<Which, Pose>> = { cube: cubeReadPose(CUBE_BASE, 2, spots.cube!), solid: cubeReadPose(SOLID_BASE, 4, spots.solid!) };

  it('throws every solid onto the chosen face, at rest within the Clearing, and all of them longer than a normal throw', () => {
    const all: Record<'normal' | 'long', number[]> = { normal: [], long: [] };
    for (const code of PLATONID_CODES) {
      const n = platonidModel(code).faces.length;
      const durations: Record<'normal' | 'long', number[]> = { normal: [], long: [] };
      for (const tumble of ['normal', 'long'] as const) {
        for (let k = 0; k < 8; k++) {
          const sim = throwUnseen(['platonid'], resting, code, tumble);
          expect(sim, `${code} ${tumble}: a throw rests well`).not.toBeNull();
          expect(restsWell(sim!, ['platonid'])).toBe(true);
          durations[tumble].push(sim!.duration);
          const final = sim!.final[3];
          expect(Math.hypot(final.p.x, final.p.z)).toBeLessThanOrEqual(REST_WITHIN_THREE);
          const chosen = (k * 5 + 1) % n;
          const shown = final.q.clone().multiply(platonidTwist(code, platonidLanded(code, final.q).face, chosen));
          expect(platonidLanded(code, shown).face).toBe(chosen);
        }
      }
      all.normal.push(...durations.normal);
      all.long.push(...durations.long);
    }
    // a tetrahedron's throw is short either way, so the five solids are taken together: 40 throws of each tumble
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(all.long), `long ${mean(all.long).toFixed(2)} s vs normal ${mean(all.normal).toFixed(2)} s`).toBeGreaterThan(mean(all.normal) * 1.3);
  }, 300000);
});
