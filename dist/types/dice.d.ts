import * as THREE from 'three';
import { type Paper, type School, type SubStance } from './faces';
type V3 = [number, number, number];
export declare const CUBE_HALF = 0.74;
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
/** The inner circle drawn on the Clearing. */
export declare const INNER_RADIUS: number;
/** Every die rests with its centre this close to the middle. */
export declare const REST_WITHIN = 2.8;
/** The two dice rest with their centres at least this far apart (touching needs 2.4 at most: the cube's corner and the tetrahedron's point; 3 leaves a clear gap). */
export declare const REST_APART = 3;
export interface Impact {
    t: number;
    speed: number;
    kind: 'die' | 'floor';
}
export interface Pose {
    p: THREE.Vector3;
    q: THREE.Quaternion;
}
export interface Simulation {
    frames: Float32Array[];
    impacts: Impact[];
    duration: number;
    final: Pose[];
    /** Every thrown die was truly still when the recording ended. */
    settled: boolean;
    /** The two dice were in contact at the end: one leaning on, or lying against, the other. */
    touching: boolean;
}
export type Which = 'cube' | 'tetra';
export declare function simulate(thrown: Which[], resting: Partial<Record<Which, Pose>>): Simulation;
/**
 * A throw worth showing: every thrown die still and squarely on a face, every
 * die resting near the middle, and the two apart, neither touching nor leaning
 * on the other. The faces that came up are then relabelled to the chosen ones.
 */
export declare function restsWell(sim: Simulation, thrown: Which[]): boolean;
/** How many unseen throws to try before giving up. */
export declare const TRIES = 40;
/** Throw unseen until one rests well (see restsWell), or null after TRIES. */
export declare function throwUnseen(thrown: Which[], resting: Partial<Record<Which, Pose>>): Simulation | null;
/**
 * The orientation that brings the cube face carrying School `chosen` up, by the
 * smallest rotation from `q`. The labels stay where they are: the die is turned
 * to its own face, as a hand would turn a real one.
 */
export declare function cubeTurnTo(q: THREE.Quaternion, labels: number[], chosen: number): THREE.Quaternion;
/** The orientation that brings the tetrahedron's vertex carrying `chosen` to the apex, by the smallest rotation from `q`. */
export declare function tetraTurnTo(q: THREE.Quaternion, labels: number[], chosen: number): THREE.Quaternion;
/** How high the tetrahedron's centre sits when it rests on the floor in orientation `q`. */
export declare function tetraRestHeight(q: THREE.Quaternion): number;
/**
 * Undecided: the cube balanced on a truncated corner. The corner lowest in `q`
 * turns straight down, by the smallest rotation; no face is then up, so the die
 * shows no School.
 */
export declare function cubeUnsetTo(q: THREE.Quaternion): THREE.Quaternion;
/** How high the cube's centre sits when it stands on a corner facet: that facet's distance from the centre. */
export declare const CUBE_CORNER_HEIGHT: number;
/** Undecided: the tetrahedron balanced on its point. The vertex lowest in `q` turns straight down; a face is then up, so it shows no sub-stance. */
export declare function tetraUnsetTo(q: THREE.Quaternion): THREE.Quaternion;
/** How high the tetrahedron's centre sits when it stands on its point: the distance to a vertex. */
export declare const TETRA_POINT_HEIGHT: number;
/** The lowest point of a die in orientation `q` with its centre at height `y`: 0 when it stands on the floor. */
export declare function lowestPoint(which: 'cube' | 'tetra', q: THREE.Quaternion, y: number): number;
/** What a turned die shows: for the tests, and for reading back after a turn. */
export declare function cubeShows(q: THREE.Quaternion, labels: number[]): {
    label: number;
    flat: number;
};
export declare function tetraShows(q: THREE.Quaternion, labels: number[]): {
    label: number;
    flat: number;
};
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
    /**
     * Turn the named dice in place to show the given faces: a short, smooth
     * rotation, lifting just clear of the floor. No throw, no sound, no landing.
     * `ms` 0 turns at once. Resolves when they are still.
     */
    turn(chosen: {
        cube?: number;
        tetra?: number;
    }, ms: number): Promise<Landing>;
    /**
     * Undecide the named dice: turn each to stand balanced on a corner (the cube
     * on a truncated corner, the tetrahedron on its point), showing nothing. The
     * same short, smooth motion as turn(): no sound, no landing. `ms` 0 is at once.
     */
    unset(which: {
        cube?: boolean;
        tetra?: boolean;
    }, ms: number): Promise<void>;
    /** Draw the ring and the shadows for this paper. */
    setPaper(paper: Paper): void;
    onImpact: (impact: Impact) => void;
    onLand: () => void;
    /** Stop drawing, and release the WebGL context and every GPU resource. */
    destroy(): void;
}
/** The ink the ring is drawn in on each paper. */
export declare const paperInk: (paper: Paper) => string;
/** How the Clearing is shown in its element (see DiceTrayOptions). */
export interface ClearingOptions {
    /** Draw the Clearing's rings (the rim and the inner circle). Default true. The dice rebound from the rim either way. */
    ring?: boolean;
    /** The fraction of the element's shorter side the Clearing's rim spans, clamped to 0.2–1. Default DEFAULT_CLEARING_SIZE. */
    clearingSize?: number;
}
/** The current framing: the fraction of a square element the rim spans at the tray's usual field of view (about 0.99). */
export declare const DEFAULT_CLEARING_SIZE: number;
/** A Clearing size in 0.2–1; anything else not a number is the default. */
export declare function clampClearingSize(size: number | undefined): number;
/**
 * The vertical field of view (degrees) at which the rim spans `size` of the
 * element's shorter side. At the default size, a square or landscape element is
 * framed exactly as it always was; a portrait one now fits its width.
 */
export declare function clearingFov(size: number | undefined, width: number, height: number): number;
/**
 * The Clearing's scene without its renderer (no page needed): the light, the
 * ground that takes the shadows, and, unless `ring` is false, its two rings.
 */
export declare function clearingScene(paper: Paper, ring?: boolean): {
    scene: THREE.Scene<THREE.Object3DEventMap>;
    shadow: THREE.ShadowMaterial;
    ringMaterials: THREE.LineBasicMaterial[];
    rings: THREE.LineLoop<THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>, THREE.Material<THREE.MaterialEventMap>[] | THREE.Material<THREE.MaterialEventMap>, THREE.Object3DEventMap>[];
};
export declare function createClearing(host: HTMLElement, paper?: Paper, options?: ClearingOptions): Clearing;
export type { School, SubStance };
