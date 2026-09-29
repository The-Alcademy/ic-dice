import { describe, expect, it } from 'vitest';
import { CUBE, TETRA, schoolByLetter, subStanceByVerb } from '../src/faces';
import { orientationLine, thresholdLine } from '../src/porter';

describe("the Head Porter's threshold line", () => {
  it('is a complete sentence for every School and sub-stance, with nothing undefined', () => {
    for (const school of CUBE) {
      for (const sub of TETRA) {
        const line = thresholdLine(school, sub);
        expect(line).not.toMatch(/undefined|null|NaN|\{|\}/);
        expect(line).toMatch(/^You stand in the Clearing with Sam, at the threshold of the /);
        expect(line).toContain(`the ${school.colour} School of ${school.domain}`);
        expect(line).toContain(`the Faculty of ${school.faculty} — the ability to ${school.gloss}.`);
        expect(line).toContain(`You will enter in the Forest, ${school.prep} ${school.hall}, ${school.title}.`);
        expect(line.endsWith(`And there you will ${sub.verb}.`)).toBe(true);
      }
    }
  });

  it('reads exactly as written for the Green School and practise', () => {
    expect(thresholdLine(schoolByLetter('W'), subStanceByVerb('practise'))).toBe(
      'You stand in the Clearing with Sam, at the threshold of the Green School of PsychoTerranics, ' +
        'where you will develop the Faculty of WEAVE — the ability to live woven into the web of life. ' +
        'You will enter in the Forest, on the Ramble, the Hall of Wandering. And there you will practise.',
    );
  });
});

describe('the orientation line', () => {
  it('shows its open slots before a throw, and fills them after', () => {
    expect(orientationLine(null, null)).toBe(
      'My stance towards the Clearing is that of a Reader in the Library of Thyngs, through [Skhool], and I am [sub-stance], with Sam.',
    );
    expect(orientationLine(schoolByLetter('W'), subStanceByVerb('practise'))).toBe(
      'My stance towards the Clearing is that of a Reader in the Library of Thyngs, through WEAVE, and I am practising it, with Sam.',
    );
  });

  it('names the Faculty in the Skhool slot: through WEAVE', () => {
    expect(orientationLine(schoolByLetter('W'), null)).toContain('through WEAVE,');
    expect(orientationLine(schoolByLetter('W'), null)).not.toContain('Green School');
  });
});
