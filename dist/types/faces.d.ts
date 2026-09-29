export type SchoolLetter = 'R' | 'P' | 'S' | 'I' | 'W' | 'A';
/** The Skhool a MetaMind throw lands on, by its Faculty's initial (the IC apps' name for it). */
export type SkhoolLetter = SchoolLetter;
export interface School {
    /** The Faculty's initial, as it is lettered on the cube. */
    letter: SchoolLetter;
    faculty: string;
    colour: string;
    hex: string;
    domain: string;
    /** Completes "the ability to …". */
    gloss: string;
    /** The School's Forest Hall: where it is entered. */
    hall: string;
    title: string;
    /** How you stand in that Hall: "at the Drawing Board", "on the Ramble". */
    prep: string;
}
/**
 * The MetaMind cube, in mandala order: Purple at north, then clockwise. Only
 * "at the Drawing Board" is settled; every other preposition is PROVISIONAL.
 */
export declare const CUBE: readonly School[];
export type SubRoomIcon = 'key' | 'anvil' | 'lamp' | 'table';
export interface SubStance {
    room: string;
    /** What you will do there: "And there you will {verb}." */
    verb: string;
    /** How the orientation line says it: "and I am {phrase}". */
    phrase: string;
    icon: SubRoomIcon;
}
/** The sub-stance tetrahedron: the four sub-rooms of every Room. */
export declare const TETRA: readonly SubStance[];
/** The die's look. */
export declare const INK = "#1F2A33";
export declare const WRITTEN = "#2B5468";
export declare function schoolByLetter(letter: SchoolLetter): School;
export declare function subStanceByVerb(verb: string): SubStance;
