import type { School, SubStance } from './faces';
/** "You stand in the Clearing with Sam, at the threshold of …" */
export declare function thresholdLine(school: School, sub: SubStance): string;
/** What each slot of the orientation line reads once its die has landed. */
export declare function skhoolSlot(school: School): string;
export declare function subStanceSlot(sub: SubStance): string;
/** The orientation line, with either slot still open. */
export declare function orientationLine(school: School | null, sub: SubStance | null): string;
