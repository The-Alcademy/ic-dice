// The tray's display options (0.10.0): the Clearing's rings on or off, and how
// much of its element the Clearing fills. Static: the scene is built and
// inspected without WebGL; the framing is checked as numbers.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clampClearingSize, clearingFov, clearingScene, DEFAULT_CLEARING_SIZE } from '../src/dice';

const loops = (scene: THREE.Scene) => {
  const found: THREE.Object3D[] = [];
  scene.traverse((o) => { if (o instanceof THREE.Line) found.push(o); });
  return found;
};

describe('the options default to what the tray has always done', () => {
  it('rings on: the rim and the inner circle are in the scene', () => {
    const { scene, rings } = clearingScene('light');
    expect(rings).toHaveLength(2);
    expect(loops(scene)).toHaveLength(2);
  });

  it('the Clearing sized as it always was: 34° on a square or landscape element', () => {
    expect(DEFAULT_CLEARING_SIZE).toBeGreaterThan(0.98);
    expect(DEFAULT_CLEARING_SIZE).toBeLessThan(1);
    expect(clampClearingSize(undefined)).toBe(DEFAULT_CLEARING_SIZE);
    expect(clearingFov(undefined, 420, 420)).toBeCloseTo(34, 6);
    expect(clearingFov(undefined, 800, 400)).toBeCloseTo(34, 6);
    // a portrait element is now fitted by its width, the shorter side
    expect(clearingFov(undefined, 300, 600)).toBeGreaterThan(34);
  });
});

describe('clearingSize', () => {
  it('is clamped to 0.2–1', () => {
    expect(clampClearingSize(0.05)).toBe(0.2);
    expect(clampClearingSize(-3)).toBe(0.2);
    expect(clampClearingSize(1.7)).toBe(1);
    expect(clampClearingSize(0.6)).toBe(0.6);
    expect(clampClearingSize(Number.NaN)).toBe(DEFAULT_CLEARING_SIZE);
    expect(clearingFov(5, 400, 400)).toBeCloseTo(clearingFov(1, 400, 400), 9);
    expect(clearingFov(0, 400, 400)).toBeCloseTo(clearingFov(0.2, 400, 400), 9);
  });

  it('a smaller Clearing is a wider view: the rim spans that fraction of the shorter side', () => {
    const f = (fov: number) => 1 / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    // the rim's size on screen is proportional to the focal length, so half the size is half the focal length
    const whole = f(clearingFov(1, 400, 400));
    expect(f(clearingFov(0.5, 400, 400)) / whole).toBeCloseTo(0.5, 9);
    expect(f(clearingFov(DEFAULT_CLEARING_SIZE, 400, 400)) / whole).toBeCloseTo(DEFAULT_CLEARING_SIZE, 9);
  });

  it('at 1 the rim spans the whole shorter side, measured on the projected rim', () => {
    for (const [w, h] of [[400, 400], [800, 400], [300, 600]]) {
      const camera = new THREE.PerspectiveCamera(clearingFov(1, w, h), w / h, 0.1, 100);
      camera.position.set(0, 17.5, 6.2);
      camera.lookAt(0, 0, 0.3);
      camera.updateMatrixWorld();
      let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
      for (let i = 0; i < 720; i++) {
        const a = (i / 720) * Math.PI * 2;
        const v = new THREE.Vector3(Math.cos(a) * 5.6, 0.002, Math.sin(a) * 5.6).project(camera);
        [x0, x1, y0, y1] = [Math.min(x0, v.x), Math.max(x1, v.x), Math.min(y0, v.y), Math.max(y1, v.y)];
      }
      const span = Math.max(((x1 - x0) / 2) * w, ((y1 - y0) / 2) * h);
      expect(span / Math.min(w, h)).toBeCloseTo(1, 2);
    }
  });
});

describe('ring: false', () => {
  it('adds no ring objects to the scene, and leaves the ground that takes the shadows', () => {
    const { scene, rings, ringMaterials } = clearingScene('dark', false);
    expect(loops(scene)).toEqual([]);
    expect(rings).toEqual([]);
    expect(ringMaterials).toEqual([]); // so setPaper() has no ring to redraw
    const meshes: THREE.Object3D[] = [];
    scene.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
    expect(meshes).toHaveLength(1);
  });
});

describe('createClearing', () => {
  it('builds its scene with clearingScene, passing ring on, and sizes the view with clearingFov at every resize', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/dice.ts', import.meta.url), 'utf8');
    const body = src.slice(src.indexOf('export function createClearing('));
    expect(body).toContain("clearingScene(paper, options.ring ?? true)");
    expect(body).toContain('camera.fov = clearingFov(options.clearingSize, width, height);');
    const tray = readFileSync(new URL('../src/tray.ts', import.meta.url), 'utf8');
    expect(tray).toContain('createClearing(box, paper, { ring: opts.ring, clearingSize: opts.clearingSize })');
  });
});
