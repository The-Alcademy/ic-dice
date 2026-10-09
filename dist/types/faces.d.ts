export type SchoolLetter = 'R' | 'P' | 'S' | 'I' | 'W' | 'A';
/** The Skhool a MetaMind throw lands on, by its Faculty's initial (the IC apps' name for it). */
export type SkhoolLetter = SchoolLetter;
export interface School {
    /** The Faculty's initial, as it is lettered on the cube (not the colour's initial, which ic-house-style calls colourLetter). */
    facultyLetter: SchoolLetter;
    faculty: string;
    colour: string;
    /** The School's colour, from ic-house-style (school.core): fills and marks, such as the landing ripple. */
    core: string;
    /** Its colour on dark paper, from ic-house-style (school.glow): the landing ripple when the tray is on dark. */
    glow: string;
    /** Its colour as text on pale ground, from ic-house-style (school.deep): the letter on the wood face. */
    deep: string;
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
/** The sub-stance tetrahedron: the four Chambers of every Room (canon D-23, D-25). */
export declare const TETRA: readonly SubStance[];
/** The die's look. */
export declare const INK = "#1F2A33";
/** Ink on dark paper: ic-house-style's dark-paper text colour, so the Clearing's ring shows. */
export declare const INK_ON_DARK = "#eae2d0";
/** The page the tray sits on. Its paper shows through; the ring and ripples are drawn to be seen on it. */
export type Paper = 'light' | 'dark';
export declare const WRITTEN = "#2B5468";
export declare function schoolByLetter(letter: SchoolLetter): School;
/** A solid's letter, as it ends a Hall's geocode (GI: WEAVE's Icosahedron). */
export type SolidCode = 'S' | 'T' | 'H' | 'O' | 'D' | 'I';
export interface Solid {
    code: SolidCode;
    name: string;
    /** How many faces the solid has: none for the Sphere. */
    faces: number;
    /** Its ring outward from the Clearing: 0 for the Sphere, which is the Clearing. */
    ring: number;
    /** Where the ring lies: the Clearing, or its biome. */
    place: string;
}
/**
 * The solid die: a hexahedron whose six faces are the six places a Skhool leads
 * to, the Clearing (the Sphere) and the five Platonic solids, ring by ring.
 * Opposite faces sum to ring 5, as a real die's sum to 7: Sphere/Icosahedron,
 * Tetrahedron/Dodecahedron, Hexahedron/Octahedron.
 */
export declare const SOLIDS: readonly Solid[];
export declare function solidByCode(code: string): Solid;
/**
 * The Hall a Skhool and a solid lead to: its colour letter, then the solid's
 * letter (WEAVE + Icosahedron = GI, the Wilderness). The Sphere is the Clearing,
 * not a Hall: null.
 */
export declare function geocodeFor(facultyLetter: SchoolLetter, solidCode: SolidCode): string | null;
export declare function subStanceByVerb(verb: string): SubStance;
