// The Head Porter's line in the threshold form, and the student's orientation
// line, both built from the faces alone.

import { geocodeFor, type School, type Solid, type SubStance } from './faces';

/** Who stands in the Clearing with the student. Left out: Sam, as always. `null` or empty: alone. */
export interface Company {
  with?: string | null;
}

/** "You stand in the Clearing with Sam, at the threshold of …" — or with someone else, or alone. */
export function thresholdLine(school: School, sub: SubStance, company: Company = {}): string {
  const name = company.with === undefined ? 'Sam' : (company.with ?? '').trim();
  const standing = name ? `with ${name}` : 'alone';
  return (
    `You stand in the Clearing ${standing}, at the threshold of the ${school.colour} School of ${school.domain}, ` +
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

/**
 * Where the solid die sends the student, from the Skhool the cube chose:
 * "You are bound for GI, in the Mountains." The Sphere is the Clearing itself:
 * "You return to the Clearing, facing the gate of WEAVE." Hall names come from
 * the host later; for now the Hall is named by its geocode. The preposition is
 * the halls table's biome_prep: at the River, in every other ring.
 */
export function hallLine(school: School, solid: Solid): string {
  const geocode = geocodeFor(school.facultyLetter, solid.code);
  if (geocode === null) return `You return to the Clearing, facing the gate of ${school.faculty}.`;
  const prep = solid.place === 'River' ? 'at' : 'in';
  return `You are bound for ${geocode}, ${prep} the ${solid.place}.`;
}
