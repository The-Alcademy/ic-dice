import { type School, type SubStance } from './faces';
type V3 = [number, number, number];
/** Cube faces by index: the local normal of each, and which way is "up" on it. */
export declare const CUBE_FACES: {
    n: V3;
    up: V3;
}[];
/**
 * The cube's base labelling: which School (index into CUBE) is on which face.
 * Opposite spokes of the mandala are opposite faces: R/I, P/W, S/A.
 */
export declare const CUBE_BASE: number[];
/** A labelling of the cube's faces that puts School `chosen` on face `up`: the base labelling turned by one of the cube's 24 rotations, never permuted freely, so R/I, P/W and S/A stay opposite on every throw. */
export declare function cubeLabelling(up: number, chosen: number): number[];
/** A labelling of the tetrahedron's vertices that puts sub-stance `chosen` on vertex `up`: a half-turn about an edge axis, so an even permutation — a rotation, not a mirror image. */
export declare function tetraLabelling(up: number, chosen: number): number[];
export interface Impact {
    t: number;
    speed: number;
    kind: 'die' | 'floor';
}
export interface Landing {
    /** Index into CUBE / TETRA, as read off the die at rest. */
    cube?: number;
    tetra?: number;
    /** Where the cube came to rest, in page pixels relative to the canvas. */
    cubeAt?: {
        x: number;
        y: number;
    };
    tetraAt?: {
        x: number;
        y: number;
    };
}
export interface Clearing {
    /** Throw the named dice so they land on the chosen results. */
    roll(chosen: {
        cube?: number;
        tetra?: number;
    }): Promise<Landing>;
    /** Put the dice at rest on the chosen results, with no throw (reduced motion). */
    place(chosen: {
        cube?: number;
        tetra?: number;
    }): Landing;
    onImpact: (impact: Impact) => void;
    onLand: () => void;
    /** Stop drawing, and release the WebGL context and every GPU resource. */
    destroy(): void;
}
export declare function createClearing(host: HTMLElement): Clearing;
export type { School, SubStance };
