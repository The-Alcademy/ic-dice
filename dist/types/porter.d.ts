import { type School, type Solid, type SubStance } from './faces';
/** Who stands in the Clearing with the student. Left out: Sam, as always. `null` or empty: alone. */
export interface Company {
    with?: string | null;
}
/** "You stand in the Clearing with Sam, at the threshold of …" — or with someone else, or alone. */
export declare function thresholdLine(school: School, sub: SubStance, company?: Company): string;
/** What each slot of the orientation line reads once its die has landed. */
export declare function skhoolSlot(school: School): string;
export declare function subStanceSlot(sub: SubStance): string;
/** The orientation line, with either slot still open. */
export declare function orientationLine(school: School | null, sub: SubStance | null): string;
/**
 * Where the solid die sends the student, from the Skhool the cube chose:
 * "You are bound for GI, in the Mountains." The Sphere is the Clearing itself:
 * "You return to the Clearing, facing the gate of WEAVE." Hall names come from
 * the host later; for now the Hall is named by its geocode. The preposition is
 * the halls table's biome_prep: at the River, in every other ring.
 */
export declare function hallLine(school: School, solid: Solid): string;
