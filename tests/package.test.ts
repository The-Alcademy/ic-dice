import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as pkg from '../src/index';
import type { RollPick, SkhoolLetter, SubStance } from '../src/index';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const at = (p: string) => new URL(`../${p.replace(/^\.\//, '')}`, import.meta.url);

describe('the package entry', () => {
  it('exports the tray, the faces and the porter', () => {
    expect(typeof pkg.mountDiceTray).toBe('function');
    expect(pkg.CUBE).toHaveLength(6);
    expect(pkg.TETRA).toHaveLength(4);
    expect(typeof pkg.thresholdLine).toBe('function');
    expect(typeof pkg.orientationLine).toBe('function');
    expect(typeof pkg.schoolByLetter).toBe('function');
  });
});

describe('the built package', () => {
  it('has dist/ic-dice.js and its type declarations where package.json says', () => {
    expect(existsSync(at('dist/ic-dice.js'))).toBe(true);
    expect(manifest.exports['.'].import).toBe('./dist/ic-dice.js');
    expect(existsSync(at(manifest.exports['.'].types))).toBe(true);
    expect(existsSync(at(manifest.types))).toBe(true);
  });

  it('carries its sounds and its font inside it, so a host copies no files', () => {
    const js = readFileSync(at('dist/ic-dice.js'), 'utf8');
    expect(js.match(/data:audio\/mpeg;base64,/g)?.length).toBe(26);
    expect(js).toContain('data:font/woff2;base64,');
    expect(js).not.toMatch(/["']\/sounds\//);
  });

  it('leaves three to the host, and does not bundle it', () => {
    const js = readFileSync(at('dist/ic-dice.js'), 'utf8');
    expect(js).toMatch(/from ["']three["']/);
    expect(manifest.peerDependencies.three).toBeDefined();
    expect(manifest.dependencies?.three).toBeUndefined();
  });
});

describe('the roll pick', () => {
  it('accepts "random" for either die, or a given face', () => {
    // checked by tsc as part of npm run build; a no-op at run time
    expectTypeOf<RollPick['skhool']>().toEqualTypeOf<SkhoolLetter | 'random' | undefined>();
    expectTypeOf<RollPick['subStance']>().toEqualTypeOf<SubStance | 'random' | undefined>();
    const both: RollPick = { skhool: 'random', subStance: 'random' };
    const given: RollPick = { skhool: 'W', subStance: pkg.TETRA[1] };
    expect(both.skhool).toBe('random');
    expect((given.subStance as SubStance).room).toBe('Chamber');
  });
});
