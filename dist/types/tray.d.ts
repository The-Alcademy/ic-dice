import { type Paper, type School, type SkhoolLetter, type SubStance } from './faces';
export type { SkhoolLetter, SubStance };
/** Which dice to throw, and onto what. Leave a die out and it is not thrown. */
export interface RollPick {
    skhool?: SkhoolLetter | 'random';
    subStance?: SubStance | 'random';
}
/** What was thrown: chosen before the throw, and shown by the dice after it. */
export interface RollResult {
    skhool?: SkhoolLetter;
    subStance?: SubStance;
}
/** Which dice to turn, and to which face. A face must be given: showing is not choosing. */
export interface ShowPick {
    skhool?: SkhoolLetter;
    subStance?: SubStance;
}
/** Which dice to undecide. */
export interface UnsetPick {
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
    setSound(on: boolean): void;
    /** Redraw the ring, shadows and later ripples for this paper, e.g. when the page's light/dark setting changes. */
    setPaper(paper: Paper): void;
    /** Release WebGL, audio and listeners, and empty `el` of everything the tray put there. */
    destroy(): void;
}
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
