import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    expect((given.subStance as SubStance).room).toBe('Workshop');
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
    const set = nextSchool(null, CUBE.findIndex((s) => s.facultyLetter === 'W'));
    expect(rippleColour(set)).toBe('#5c9a55'); // WEAVE's core
    expect(rippleColour(null)).toBe(INK);
  });
});

describe('the landing ripple', () => {
  const { CUBE, INK, nextSchool, rippleColour } = pkg;
  const at = (letter: string) => CUBE.findIndex((s) => s.facultyLetter === letter);

  it('is ink until a School is in the orientation', () => {
    expect(rippleColour(null)).toBe(INK);
    expect(rippleColour(nextSchool(null, undefined))).toBe(INK); // the tetrahedron alone sets no School
  });

  it('takes the School in the orientation, whether thrown or set by hand with show()', () => {
    // set ALIGN by hand, then throw only the tetrahedron: its ripple is ALIGN's blue
    let school = nextSchool(null, at('A'));
    school = nextSchool(school, undefined);
    expect(rippleColour(school)).toBe('#5285c4'); // ALIGN's core
    // throw the cube onto PILOT: from then on it is PILOT's red
    school = nextSchool(school, at('P'));
    expect(rippleColour(nextSchool(school, undefined))).toBe('#c14a55'); // PILOT's core
    // set REBIS by hand after that: REBIS's purple
    expect(rippleColour(nextSchool(school, at('R')))).toBe('#a879e0'); // REBIS's core
  });
});

describe('the paper', () => {
  const { CUBE, INK, INK_ON_DARK, rippleColour, schoolByLetter } = pkg;

  it('is light unless the host says otherwise: the ripples keep their light-paper colours', () => {
    expect(rippleColour(null)).toBe(INK);
    expect(rippleColour(schoolByLetter('W'))).toBe('#5c9a55');
  });

  it('on dark, draws in light ink, and each School ripples in its glow', () => {
    expect(INK_ON_DARK).toBe('#eae2d0'); // ic-house-style's dark-paper text
    expect(rippleColour(null, 'dark')).toBe(INK_ON_DARK);
    for (const s of CUBE) expect(rippleColour(s, 'dark')).toBe(s.glow);
    expect(rippleColour(schoolByLetter('R'), 'dark')).toBe('#c6a3f0'); // REBIS's glow
  });

  it('is an option of the tray, and can be changed once it is mounted', () => {
    expectTypeOf<pkg.DiceTrayOptions['paper']>().toEqualTypeOf<pkg.Paper | undefined>();
    expectTypeOf<DiceTray['setPaper']>().parameter(0).toEqualTypeOf<pkg.Paper>();
  });
});

describe('ic-dice/faces, the faces alone', () => {
  it('is its own entry, with its own types', () => {
    expect(manifest.exports['./faces']).toEqual({ types: './dist/types/faces.d.ts', import: './dist/faces.js' });
    expect(existsSync(at('dist/faces.js'))).toBe(true);
    expect(existsSync(at('dist/types/faces.d.ts'))).toBe(true);
  });

  it('imports nothing, and touches no browser object', () => {
    const js = readFileSync(at('dist/faces.js'), 'utf8');
    expect(js).not.toMatch(/\bimport\b|\brequire\(/);
    expect(js).not.toMatch(/\b(document|window|navigator|Audio|FontFace|WebGL)\b/);
    expect(js).not.toMatch(/data:/);
  });

  it('imports cleanly in Node with no three or cannon-es installed, where the whole package cannot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ic-dice-faces-'));
    try {
      const pkgDir = join(dir, 'node_modules', 'ic-dice');
      cpSync(at('dist'), join(pkgDir, 'dist'), { recursive: true });
      cpSync(at('package.json'), join(pkgDir, 'package.json'));
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
      const run = (code: string) => execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
      const out = run(`import { CUBE, TETRA, schoolByLetter } from 'ic-dice/faces';
        console.log(JSON.stringify({ cube: CUBE.map((s) => s.facultyLetter + ':' + s.faculty), tetra: TETRA.map((t) => t.room), r: schoolByLetter('R').faculty }));`);
      expect(JSON.parse(out)).toEqual({
        cube: ['R:REBIS', 'P:PILOT', 'S:SALVE', 'I:IMPRO', 'W:WEAVE', 'A:ALIGN'],
        tetra: ['Closet', 'Workshop', 'Alcove', 'Parlour'],
        r: 'REBIS',
      });
      // three really is absent there: the whole package fails to load
      expect(() => run(`await import('ic-dice');`)).toThrow(/three|cannon-es/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
