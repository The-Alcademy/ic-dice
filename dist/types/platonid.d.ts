import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { type PlatonidCode } from './face-normals';
export type { PlatonidCode };
export declare const PLATONID_CODES: readonly PlatonidCode[];
export interface PlatonidFace {
    /** 1 to n, as canon numbers it. */
    number: number;
    /** The face's outward normal, in the die's own frame: canon's normal for this face, unrounded. */
    normal: THREE.Vector3;
    /** The face's corners, counter-clockwise seen from outside. */
    points: THREE.Vector3[];
    centre: THREE.Vector3;
    /** Which way is up on the face, as its picture is drawn: towards a corner (an edge, on the hexahedron). */
    up: THREE.Vector3;
    /** The face's right, as its picture is drawn. */
    right: THREE.Vector3;
}
export interface PlatonidModel {
    code: PlatonidCode;
    faces: PlatonidFace[];
    /** Every corner of the solid. */
    vertices: THREE.Vector3[];
    /** The triangles three.js draws, each with the face (index) it belongs to. */
    triangles: {
        face: number;
        a: THREE.Vector3;
        b: THREE.Vector3;
        c: THREE.Vector3;
    }[];
    /** The farthest any part reaches from the centre. */
    reach: number;
}
/**
 * A solid as a die: three.js's own geometry, its triangles grouped into canon's
 * faces by their normals. Throws if any triangle matches no canon face, or any
 * face no triangle: the numbering is canon's or nothing.
 */
export declare function platonidModel(code: PlatonidCode): PlatonidModel;
/** Where a point on a face lies in its picture, a 160 × 160 box (y down), as the page's facet tiles (GG.image(…, {frame: 'facet'})) are drawn. */
export declare function facePicturePoint(face: PlatonidFace, p: THREE.Vector3): [number, number];
/** The solid as a physical body: a convex polyhedron of the same corners and faces. */
export declare function platonidShape(code: PlatonidCode): CANNON.ConvexPolyhedron;
/** The face that has landed, and how squarely (1 = flat): the one a tetrahedron rests on; the one facing up on every other solid. */
export declare function platonidLanded(code: PlatonidCode, q: THREE.Quaternion): {
    face: number;
    flat: number;
};
/** The face looking most nearly along `toEye`: what a Platonid set out to be read shows. */
export declare function platonidFacing(code: PlatonidCode, q: THREE.Quaternion, toEye: THREE.Vector3): number;
/**
 * One of the solid's own rotations (in its frame) that carries face `chosen`
 * to where face `landed` is. The solid occupies exactly the same space after
 * it, so a throw played back turned by it lands the same, showing `chosen`.
 */
export declare function platonidTwist(code: PlatonidCode, landed: number, chosen: number): THREE.Quaternion;
/** How high the solid's centre sits when its lowest point touches the floor. */
export declare function platonidRestHeight(code: PlatonidCode, q: THREE.Quaternion): number;
/** The solid at rest on the chosen face: on it (the tetrahedron) or showing it up (every other solid), by the smallest turn from `q`. */
export declare function platonidTurnTo(code: PlatonidCode, q: THREE.Quaternion, chosen: number): THREE.Quaternion;
/** Holding still, undecided: balanced on its lowest corner, which turns straight down, so no face has landed. */
export declare function platonidUnsetTo(code: PlatonidCode, q: THREE.Quaternion): THREE.Quaternion;
/** What a host may draw on each face: an image for face n (1 to n), drawn over the face's 160 × 160 picture box. */
export type FaceImage = (n: number) => CanvasImageSource | Promise<CanvasImageSource>;
/**
 * Face n's picture: the Skhool's colour, and on it either the host's image or
 * the face's number in the Skhool's `on` colour, centred on the face.
 */
export declare function platonidFaceCanvas(face: PlatonidFace, colour: string, on: string, size?: number): HTMLCanvasElement;
