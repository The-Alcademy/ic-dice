// The Head Porter's line in the threshold form, and the student's orientation
// line, both built from the faces alone.

import type { School, SubStance } from './faces';

/** "You stand in the Clearing with Sam, at the threshold of …" */
export function thresholdLine(school: School, sub: SubStance): string {
  return (
    `You stand in the Clearing with Sam, at the threshold of the ${school.colour} School of ${school.domain}, ` +
    `where you will develop the Faculty of ${school.faculty} — the ability to ${school.gloss}. ` +
    `You will enter in the Forest, ${school.prep} ${school.hall}, ${school.title}. ` +
    `And there you will ${sub.verb}.`
  );
}

/** What each slot of the orientation line reads once its die has landed. */
export function skhoolSlot(school: School): string {
  // the Faculty's name, as the Daybook writes it: "through WEAVE"
  return school.faculty;
}

export function subStanceSlot(sub: SubStance): string {
  return sub.phrase;
}

/** The orientation line, with either slot still open. */
export function orientationLine(school: School | null, sub: SubStance | null): string {
  return (
    'My stance towards the Clearing is that of a Reader in the Library of Thyngs, ' +
    `through ${school ? skhoolSlot(school) : '[Skhool]'}, and I am ${sub ? subStanceSlot(sub) : '[sub-stance]'}, with Sam.`
  );
}
