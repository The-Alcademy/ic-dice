import { type Paper, type School, type SkhoolLetter, type SolidCode, type SubStance } from './faces';
import { type FaceImage, type PlatonidCode } from './platonid';
import { type Tumble, type Chosen, type FaceStyle, type SolidWood, type LandingStyle, type Landing, type Which } from './dice';
export type { SkhoolLetter, SolidCode, SubStance, PlatonidCode, FaceImage };
/** Which dice to throw, and onto what. Leave a die out and it is not thrown. */
export interface RollPick {
    skhool?: SkhoolLetter | 'random';
    subStance?: SubStance | 'random';
    /** The solid die: the Hall's solid, or the Sphere for the Clearing. */
    solid?: SolidCode | 'random';
    /** The Platonid on the Clearing (see place()): a face, 1 to n. It is thrown alone. */
    platonid?: number | 'random';
    /**
     * How the Platonid tumbles: 'normal' (the default), or 'long' (a trial, not
     * ruled), tossed higher and spinning harder so it rolls for about 1.5 times
     * as long before it settles. For the Platonid's throw only.
     */
    tumble?: Tumble;
}
/** What was thrown: chosen before the throw, and shown by the dice after it. */
export interface RollResult {
    skhool?: SkhoolLetter;
    subStance?: SubStance;
    solid?: SolidCode;
    /** The Platonid's face, 1 to n, numbered as ic-canon numbers it. */
    platonid?: number;
}
/** A Platonid to bring onto the Clearing. */
export interface PlacePick {
    platonid: {
        /** Its solid: T H O D I. */
        solid: PlatonidCode;
        /** Its Skhool, by the letter a roll's result gives (the Faculty's: REBIS is R): the die takes that Skhool's colour. */
        skhool: SkhoolLetter;
        /** Draws face n (1 to n) over its picture box; without it each face shows its number. */
        faceImage?: FaceImage;
    };
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
    /**
     * How the cube and the solid die are drawn. Default: 'default', the MetaMind
     * cube's Faculty letters and the solid die's drawings. 'geocode' (a trial
     * style, not ruled) draws them as a Hall's geocode reads (D-48): each cube
     * face a disc in its School's colour carrying the colour letter, and the
     * solid die's letters T H O D I, the Sphere keeping its drawing. Only the
     * drawings change: a result lands on the same face in either style.
     */
    faces?: FaceStyle;
    /**
     * The solid die's wood. Default: 'stained', darker than the cube so the two
     * are never confused. 'plain' (a trial, not ruled) makes it the same light
     * wood as the cube, grain, colour and corners: for faces: 'geocode', where the
     * faces already tell the two dice apart. Only the wood changes.
     */
    solidWood?: SolidWood;
    /**
     * What happens when the thrown dice come to rest. Default: 'ripple', a ripple
     * rings out from each die. 'arrange' (a trial, not ruled) rings none: the dice
     * glide to a row across the middle of the Clearing to be read, the colour die
     * on the left and the solid die on the right, each turned so the face it landed
     * on looks at the viewer, its letter upright. The result is the same either way.
     */
    landing?: LandingStyle;
    /** Dice this tray goes without: ['tetra'] leaves the tetrahedron out entirely, never drawn, parked or thrown. */
    without?: readonly 'tetra'[];
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
    /**
     * Bring a Platonid onto the Clearing, clear of the dice lying there (a trial,
     * not ruled): it settles (at once under reduced motion) and holds still on a
     * corner, showing no face, until a roll({ platonid }) throws it. Resolves once
     * it is down. A later roll or unset() of the colour or solid die takes it off.
     */
    place(pick: PlacePick): Promise<void>;
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
export declare function chooseRoll(pick: RollPick, platonidFaces?: number): {
    chosen: Chosen;
    result: RollResult;
};
/** Which faces a show() turns to. Throws on a face that is not on its die. */
export declare function chooseShow(pick: ShowPick): Chosen;
/** Which dice an unset() undecides. Each is named with `true`; a face given instead is an error. */
export declare function chooseUnset(pick: UnsetPick): Partial<Record<Which, boolean>>;
/** A Platonid's spec for the Clearing: its solid checked, its Skhool's colour, and its numbers in ink or white, whichever stands out. */
export declare function platonidSpec(pick: PlacePick['platonid']): {
    solid: PlatonidCode;
    colour: string;
    on: string;
    faceImage?: FaceImage;
};
/** A roll's tumble, checked: 'long' is for the Platonid's throw alone. */
export declare function rollTumble(pick: RollPick): Tumble;
/** A tray's dice to go without: only the tetrahedron can be left out. */
export declare function withoutDice(without: unknown): ('tetra')[];
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
/**
 * Where the landing ripples ring, and in what colour: one from each thrown die
 * (the School in the orientation colours them all), or none when the dice are
 * set out to be read instead.
 */
export declare function landingRipples(landing: LandingStyle, chosen: Chosen, landed: Landing, colour: string): {
    at: {
        x: number;
        y: number;
    };
    colour: string;
}[];
export declare function mountDiceTray(el: HTMLElement, opts?: DiceTrayOptions): DiceTray;
