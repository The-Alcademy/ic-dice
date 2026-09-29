import type { School, SubStance } from './faces';
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
