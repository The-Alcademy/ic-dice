import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as pkg from '../src/index';
import type { DiceTray, RollPick, ShowPick, SkhoolLetter, SubStance, UnsetPick } from '../src/index';

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

describe('showing a face set by hand', () => {
  it('takes a given face for either die, never "random": showing is not choosing', () => {
    // checked by tsc as part of npm run build; a no-op at run time
    expectTypeOf<ShowPick['skhool']>().toEqualTypeOf<SkhoolLetter | undefined>();
    expectTypeOf<ShowPick['subStance']>().toEqualTypeOf<SubStance | undefined>();
    expectTypeOf<DiceTray['show']>().parameter(0).toEqualTypeOf<ShowPick>();
    const pick: ShowPick = { skhool: 'R', subStance: pkg.TETRA[0] };
    expect(pick.skhool).toBe('R');
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

describe('undeciding a die', () => {
  it('names which dice to undecide, and nothing else', () => {
    // checked by tsc as part of npm run build; a no-op at run time
    expectTypeOf<UnsetPick>().toEqualTypeOf<{ skhool?: true; subStance?: true }>();
    expectTypeOf<DiceTray['unset']>().parameter(0).toEqualTypeOf<UnsetPick>();
    expectTypeOf<DiceTray['unset']>().returns.toEqualTypeOf<Promise<void>>();
  });

  it('takes the Skhool off the ripples: ink again until one is thrown or set', () => {
    const { CUBE, INK, nextSchool, rippleColour } = pkg;
    // unset() sets the orientation's School to null; the rule it hands to the ripple
    const set = nextSchool(null, CUBE.findIndex((s) => s.letter === 'W'));
    expect(rippleColour(set)).toBe('#4E8A3A');
    expect(rippleColour(null)).toBe(INK);
  });
});

describe('the landing ripple', () => {
  const { CUBE, INK, nextSchool, rippleColour } = pkg;
  const at = (letter: string) => CUBE.findIndex((s) => s.letter === letter);

  it('is ink until a School is in the orientation', () => {
    expect(rippleColour(null)).toBe(INK);
    expect(rippleColour(nextSchool(null, undefined))).toBe(INK); // the tetrahedron alone sets no School
  });

  it('takes the School in the orientation, whether thrown or set by hand with show()', () => {
    // set ALIGN by hand, then throw only the tetrahedron: its ripple is ALIGN's blue
    let school = nextSchool(null, at('A'));
    school = nextSchool(school, undefined);
    expect(rippleColour(school)).toBe('#2E64A0');
    // throw the cube onto PILOT: from then on it is PILOT's red
    school = nextSchool(school, at('P'));
    expect(rippleColour(nextSchool(school, undefined))).toBe('#B23A2E');
    // set REBIS by hand after that: REBIS's purple
    expect(rippleColour(nextSchool(school, at('R')))).toBe('#6A3C8C');
  });
});
