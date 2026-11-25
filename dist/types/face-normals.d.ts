export type PlatonidCode = 'T' | 'H' | 'O' | 'D' | 'I';
export declare const FACE_NORMALS_STAMP: {
    readonly canon_version: "canon-v0.8+untagged";
    readonly canon_commit: "1842ec2";
    readonly decisions: "D-63, D-65, D-66";
};
/** Each solid's outward face normals, faces 1 to n in order. */
export declare const FACE_NORMALS: Record<PlatonidCode, readonly (readonly [number, number, number])[]>;
