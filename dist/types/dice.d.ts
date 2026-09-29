import * as THREE from 'three';
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
interface Pose {
    p: THREE.Vector3;
    q: THREE.Quaternion;
}
interface Simulation {
    frames: Float32Array[];
    impacts: Impact[];
    duration: number;
    final: Pose[];
    /** Every thrown die was truly still when the recording ended. */
    settled: boolean;
}
type Which = 'cube' | 'tetra';
export declare function simulate(thrown: Which[], resting: Partial<Record<Which, Pose>>): Simulation;
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
    onImpact: (impact: Impact) => void;
    onLand: () => void;
    /** Stop drawing, and release the WebGL context and every GPU resource. */
    destroy(): void;
}
export declare function createClearing(host: HTMLElement): Clearing;
export type { School, SubStance };
