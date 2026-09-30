import { type Paper, type School, type SkhoolLetter, type SolidCode, type SubStance } from './faces';
import { type Chosen, type Which } from './dice';
export type { SkhoolLetter, SolidCode, SubStance };
/** Which dice to throw, and onto what. Leave a die out and it is not thrown. */
export interface RollPick {
    skhool?: SkhoolLetter | 'random';
    subStance?: SubStance | 'random';
    /** The solid die: the Hall's solid, or the Sphere for the Clearing. */
    solid?: SolidCode | 'random';
}
/** What was thrown: chosen before the throw, and shown by the dice after it. */
export interface RollResult {
    skhool?: SkhoolLetter;
    subStance?: SubStance;
    solid?: SolidCode;
}
/** Which dice to turn, and to which face. A face must be given: showing is not choosing. */
export interface ShowPick {
    skhool?: SkhoolLetter;
    subStance?: SubStance;
    solid?: SolidCode;
}
/** Which dice to undecide. */
export interface UnsetPick {
    skhool?: true;
    subStance?: true;
    solid?: true;
}
/** Which dice to park above the Clearing: the first two, so the solid die has the Clearing to itself. */
export interface ParkPick {
    skhool?: true;
    subStance?: true;
}
export interface DiceTrayOptions {
    /** Sound on or off to begin with. Default: on. */
    sound?: boolean;
    /** Place the dice on their result with no throw. Default: follow prefers-reduced-motion, checked at each roll. */
    reducedMotion?: boolean;
    /**
     * The paper the tray sits on: its ring, its shadows and its ripples are drawn
     * to show on it. Default: 'light'. Change it later with setPaper().
     */
    paper?: Paper;
    /**
     * Draw the Clearing's rings: the rim and the inner circle. Default: true.
     * Turn them off when the host draws its own ground beneath (a map showing
     * through). Only the drawing goes: the dice still rebound from the same rim.
     */
    ring?: boolean;
    /**
     * How much of the element the Clearing fills: the fraction of its shorter
     * side that the rim spans, from 0.2 to 1 (values outside are clamped).
     * Default: the framing the tray has always had, about 0.99 (the rim just inside the element).
     */
    clearingSize?: number;
    /** Called with the result once it is chosen, before a die moves, so a host can log it first. */
    onChosen?: (result: RollResult) => void;
}
export interface DiceTray {
    /** Throw the dice named in `pick`, landing on the faces given; resolves once visible motion stops. */
    roll(pick: RollPick): Promise<RollResult>;
    /**
     * Turn the named dice in place to show the given faces: for a result the
     * student set by hand. A short smooth rotation (at once under reduced motion)
     * — no throw, no sound, no ripple, and onChosen is not called: nothing was
     * chosen by the dice. Resolves with what the dice now show.
     */
    show(pick: ShowPick): Promise<RollResult>;
    /**
     * Undecide the named dice: each turns smoothly (at once under reduced
     * motion) to stand balanced on a corner — the cube on a truncated corner,
     * the tetrahedron on its point — showing nothing. No sound, no ripple, no
     * onChosen. A later roll() or show() starts from there. Undeciding the
     * Skhool takes its colour off the ripples: ink until another is thrown or set.
     */
    unset(pick: UnsetPick): Promise<void>;
    /**
     * Park the named dice: each lifts and moves smoothly (at once under reduced
     * motion) to a row just above the Clearing's rim, still showing its face, and
     * takes no part in the next throw. A later roll(), show() or unset() of a
     * parked die unparks it first. Nothing is chosen: no sound, no onChosen.
     */
    park(pick: ParkPick): Promise<void>;
    /** Bring every parked die back down onto the Clearing, clear of the dice there. */
    unpark(): Promise<void>;
    setSound(on: boolean): void;
    /** Redraw the ring, shadows and later ripples for this paper, e.g. when the page's light/dark setting changes. */
    setPaper(paper: Paper): void;
    /** Release WebGL, audio and listeners, and empty `el` of everything the tray put there. */
    destroy(): void;
}
/**
 * A roll's result, chosen before a die moves (random ones from the CSPRNG), and
 * which face of which die carries it. Throws on a face that is not on its die.
 */
export declare function chooseRoll(pick: RollPick): {
    chosen: Chosen;
    result: RollResult;
};
/** Which faces a show() turns to. Throws on a face that is not on its die. */
export declare function chooseShow(pick: ShowPick): Chosen;
/** Which dice an unset() undecides. Each is named with `true`; a face given instead is an error. */
export declare function chooseUnset(pick: UnsetPick): Partial<Record<Which, boolean>>;
/** An index in [0, n), from the platform's CSPRNG, without modulo bias. */
export declare function chooseIndex(n: number): number;
/**
 * The School now in the orientation, after the cube showed `cube` (an index into
 * CUBE) — whether it was thrown or set by hand and turned with show(). A step
 * that leaves the cube alone (`cube` undefined) keeps the School there was.
 */
export declare function nextSchool(current: School | null, cube: number | undefined): School | null;
/**
 * A landing ripple is the colour of the School in the orientation, ink until
 * there is one: its core on light paper, its glow on dark, as ic-house-style has it.
 */
export declare function rippleColour(school: School | null, paper?: Paper): string;
export declare function mountDiceTray(el: HTMLElement, opts?: DiceTrayOptions): DiceTray;
