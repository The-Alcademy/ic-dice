import { type SkhoolLetter, type SubStance } from './faces';
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
export interface DiceTrayOptions {
    /** Sound on or off to begin with. Default: on. */
    sound?: boolean;
    /** Place the dice on their result with no throw. Default: follow prefers-reduced-motion, checked at each roll. */
    reducedMotion?: boolean;
    /** Called with the result once it is chosen, before a die moves, so a host can log it first. */
    onChosen?: (result: RollResult) => void;
}
export interface DiceTray {
    /** Throw the dice named in `pick`, landing on the faces given; resolves once visible motion stops. */
    roll(pick: RollPick): Promise<RollResult>;
    setSound(on: boolean): void;
    /** Release WebGL, audio and listeners, and empty `el` of everything the tray put there. */
    destroy(): void;
}
/** An index in [0, n), from the platform's CSPRNG, without modulo bias. */
export declare function chooseIndex(n: number): number;
export declare function mountDiceTray(el: HTMLElement, opts?: DiceTrayOptions): DiceTray;
