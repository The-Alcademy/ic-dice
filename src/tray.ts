// The dice tray: the whole roller, mountable in any element of any IC app.
//
//   const tray = mountDiceTray(el, { onChosen: (r) => daybook.log(r) });
//   const landed = await tray.roll({ skhool: 'random', subStance: 'random' });
//   await tray.park({ skhool: true, subStance: true });
//   const { solid } = await tray.roll({ solid: 'random' }); // the Hall's solid
//   tray.destroy();
//
// Framework-free, and it touches nothing outside `el`: it draws into a canvas
// inside it, rings its ripples inside it, and brings its own sounds and its own
// Jost (the cube's letters are drawn in it) inlined in the build, so a host
// copies no files. The one thing it adds outside `el` is that font, to
// document.fonts, and destroy() takes it away again.

import { CUBE, TETRA, SOLIDS, schoolByLetter, type Paper, type School, type SkhoolLetter, type SolidCode, type SubStance } from './faces';
import { PLATONID_CODES, platonidModel, type FaceImage, type PlatonidCode } from './platonid';
import { createClearing, faceStyle, solidWood, landingStyle, tumbleStyle, discLetterColour, paperInk, type Tumble, type Chosen, type FaceStyle, type SolidWood, type LandingStyle, type Clearing, type Impact, type Landing, type Which } from './dice';
import jostUrl from './fonts/jost-variable-latin.woff2?url';

// The sounds, one module each, inlined by the build (see src/sounds/ATTRIBUTION.md).
const clacks = import.meta.glob('./sounds/dicehit_wood*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const trays = import.meta.glob('./sounds/surface_wood_tray*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const knocks = import.meta.glob('./sounds/surface_wood_table*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byNumber = (files: Record<string, string>) =>
  Object.entries(files)
    .sort(([a], [b]) => Number(a.match(/(\d+)\.mp3$/)![1]) - Number(b.match(/(\d+)\.mp3$/)![1]))
    .map(([, url]) => url);
const SOUNDS = { clack: byNumber(clacks), tray: byNumber(trays), land: byNumber(knocks) };

export type { SkhoolLetter, SolidCode, SubStance, PlatonidCode, FaceImage };

/** Which dice to throw, and onto what. Leave a die out and it is not thrown. */
export interface RollPick {
  skhool?: SkhoolLetter | 'random';
  subStance?: SubStance | 'random';
  /** The solid die: the Hall's solid, or the Sphere for the Clearing. */
  solid?: SolidCode | 'random';
  /** The Platonid on the Clearing (see place()): a face, 1 to n. It is thrown alone. */
  platonid?: number | 'random';
  /**
   * How the Platonid tumbles: 'normal' (the default), or 'long' (a trial, not
   * ruled), tossed higher and spinning harder so it rolls for about 1.5 times
   * as long before it settles. For the Platonid's throw only.
   */
  tumble?: Tumble;
}

/** What was thrown: chosen before the throw, and shown by the dice after it. */
export interface RollResult {
  skhool?: SkhoolLetter;
  subStance?: SubStance;
  solid?: SolidCode;
  /** The Platonid's face, 1 to n, numbered as ic-canon numbers it. */
  platonid?: number;
}

/** A Platonid to bring onto the Clearing. */
export interface PlacePick {
  platonid: {
    /** Its solid: T H O D I. */
    solid: PlatonidCode;
    /** Its Skhool, by the letter a roll's result gives (the Faculty's: REBIS is R): the die takes that Skhool's colour. */
    skhool: SkhoolLetter;
    /** Draws face n (1 to n) over its picture box; without it each face shows its number. */
    faceImage?: FaceImage;
  };
}

/** Which dice to turn, and to which face. A face must be given: showing is not choosing. */
export interface ShowPick {
  skhool?: SkhoolLetter;
  subStance?: SubStance;
  solid?: SolidCode;
}

/** Which dice to undecide. */
export interface UnsetPick {
  skhool?: true;
  subStance?: true;
  solid?: true;
}

/** Which dice to park above the Clearing: the first two, so the solid die has the Clearing to itself. */
export interface ParkPick {
  skhool?: true;
  subStance?: true;
}

export interface DiceTrayOptions {
  /** Sound on or off to begin with. Default: on. */
  sound?: boolean;
  /** Place the dice on their result with no throw. Default: follow prefers-reduced-motion, checked at each roll. */
  reducedMotion?: boolean;
  /**
   * The paper the tray sits on: its ring, its shadows and its ripples are drawn
   * to show on it. Default: 'light'. Change it later with setPaper().
   */
  paper?: Paper;
  /**
   * Draw the Clearing's rings: the rim and the inner circle. Default: true.
   * Turn them off when the host draws its own ground beneath (a map showing
   * through). Only the drawing goes: the dice still rebound from the same rim.
   */
  ring?: boolean;
  /**
   * How much of the element the Clearing fills: the fraction of its shorter
   * side that the rim spans, from 0.2 to 1 (values outside are clamped).
   * Default: the framing the tray has always had, about 0.99 (the rim just inside the element).
   */
  clearingSize?: number;
  /**
   * How the cube and the solid die are drawn. Default: 'default', the MetaMind
   * cube's Faculty letters and the solid die's drawings. 'geocode' (a trial
   * style, not ruled) draws them as a Hall's geocode reads (D-48): each cube
   * face a disc in its School's colour carrying the colour letter, and the
   * solid die's letters T H O D I, the Sphere keeping its drawing. Only the
   * drawings change: a result lands on the same face in either style.
   */
  faces?: FaceStyle;
  /**
   * The solid die's wood. Default: 'stained', darker than the cube so the two
   * are never confused. 'plain' (a trial, not ruled) makes it the same light
   * wood as the cube, grain, colour and corners: for faces: 'geocode', where the
   * faces already tell the two dice apart. Only the wood changes.
   */
  solidWood?: SolidWood;
  /**
   * What happens when the thrown dice come to rest. Default: 'ripple', a ripple
   * rings out from each die. 'arrange' (a trial, not ruled) rings none: the dice
   * glide to a row across the middle of the Clearing to be read, the colour die
   * on the left and the solid die on the right, each turned so the face it landed
   * on looks at the viewer, its letter upright. The result is the same either way.
   */
  landing?: LandingStyle;
  /** Dice this tray goes without: ['tetra'] leaves the tetrahedron out entirely, never drawn, parked or thrown. */
  without?: readonly 'tetra'[];
  /** Called with the result once it is chosen, before a die moves, so a host can log it first. */
  onChosen?: (result: RollResult) => void;
}

export interface DiceTray {
  /** Throw the dice named in `pick`, landing on the faces given; resolves once visible motion stops. */
  roll(pick: RollPick): Promise<RollResult>;
  /**
   * Turn the named dice in place to show the given faces: for a result the
   * student set by hand. A short smooth rotation (at once under reduced motion)
   * — no throw, no sound, no ripple, and onChosen is not called: nothing was
   * chosen by the dice. Resolves with what the dice now show.
   */
  show(pick: ShowPick): Promise<RollResult>;
  /**
   * Undecide the named dice: each turns smoothly (at once under reduced
   * motion) to stand balanced on a corner — the cube on a truncated corner,
   * the tetrahedron on its point — showing nothing. No sound, no ripple, no
   * onChosen. A later roll() or show() starts from there. Undeciding the
   * Skhool takes its colour off the ripples: ink until another is thrown or set.
   */
  unset(pick: UnsetPick): Promise<void>;
  /**
   * Park the named dice: each lifts and moves smoothly (at once under reduced
   * motion) to a row just above the Clearing's rim, still showing its face, and
   * takes no part in the next throw. A later roll(), show() or unset() of a
   * parked die unparks it first. Nothing is chosen: no sound, no onChosen.
   */
  park(pick: ParkPick): Promise<void>;
  /** Bring every parked die back down onto the Clearing, clear of the dice there. */
  unpark(): Promise<void>;
  /**
   * Bring a Platonid onto the Clearing, clear of the dice lying there (a trial,
   * not ruled): it settles (at once under reduced motion) and holds still on a
   * corner, showing no face, until a roll({ platonid }) throws it. Resolves once
   * it is down. A later roll or unset() of the colour or solid die takes it off.
   */
  place(pick: PlacePick): Promise<void>;
  setSound(on: boolean): void;
  /** Redraw the ring, shadows and later ripples for this paper, e.g. when the page's light/dark setting changes. */
  setPaper(paper: Paper): void;
  /** Release WebGL, audio and listeners, and empty `el` of everything the tray put there. */
  destroy(): void;
}

/** The index of a solid on the solid die, or a clear error for a code that is not one. */
function solidIndex(code: unknown): number {
  const i = SOLIDS.findIndex((s) => s.code === code);
  if (i < 0) throw new Error(`No solid ${JSON.stringify(code)} on the solid die: it is one of ${SOLIDS.map((s) => s.code).join(', ')}`);
  return i;
}

/**
 * A roll's result, chosen before a die moves (random ones from the CSPRNG), and
 * which face of which die carries it. Throws on a face that is not on its die.
 */
export function chooseRoll(pick: RollPick, platonidFaces?: number): { chosen: Chosen; result: RollResult } {
  const chosen: Chosen = {};
  if (pick.platonid !== undefined) {
    if (!platonidFaces) throw new Error('There is no Platonid on the Clearing: place one first');
    if (pick.skhool !== undefined || pick.subStance !== undefined || pick.solid !== undefined) throw new Error('The Platonid is thrown alone');
    const n = pick.platonid;
    if (n !== 'random' && !(Number.isInteger(n) && n >= 1 && n <= platonidFaces)) throw new Error(`No face ${JSON.stringify(n)} on the Platonid: it has faces 1 to ${platonidFaces}`);
    chosen.platonid = n === 'random' ? chooseIndex(platonidFaces) : n - 1;
  }
  if (pick.skhool !== undefined) {
    chosen.cube = pick.skhool === 'random' ? chooseIndex(CUBE.length) : CUBE.findIndex((s) => s.facultyLetter === pick.skhool);
    if (chosen.cube < 0) throw new Error(`No School ${String(pick.skhool)} on the cube`);
  }
  if (pick.subStance !== undefined) {
    const sub = pick.subStance;
    chosen.tetra = sub === 'random' ? chooseIndex(TETRA.length) : TETRA.findIndex((t) => t === sub || t.room === sub.room);
    if (chosen.tetra < 0) throw new Error(`No sub-stance ${sub === 'random' ? sub : sub.room} on the tetrahedron`);
  }
  if (pick.solid !== undefined) chosen.solid = pick.solid === 'random' ? chooseIndex(SOLIDS.length) : solidIndex(pick.solid);
  return { chosen, result: resultOf(chosen) };
}

/** Which faces a show() turns to. Throws on a face that is not on its die. */
export function chooseShow(pick: ShowPick): Chosen {
  const chosen: Chosen = {};
  if (pick.skhool !== undefined) {
    chosen.cube = CUBE.findIndex((s) => s.facultyLetter === pick.skhool);
    if (chosen.cube < 0) throw new Error(`No School ${String(pick.skhool)} on the cube`);
  }
  if (pick.subStance !== undefined) {
    const sub = pick.subStance;
    chosen.tetra = TETRA.findIndex((t) => t === sub || t.room === sub.room);
    if (chosen.tetra < 0) throw new Error(`No sub-stance ${sub.room} on the tetrahedron`);
  }
  if (pick.solid !== undefined) chosen.solid = solidIndex(pick.solid);
  return chosen;
}

/** Which dice an unset() undecides. Each is named with `true`; a face given instead is an error. */
export function chooseUnset(pick: UnsetPick): Partial<Record<Which, boolean>> {
  for (const [key, value] of Object.entries(pick)) {
    if (value !== undefined && value !== true) {
      if (key === 'solid') solidIndex(value); // an unknown code says so first
      throw new Error(`unset() takes ${key}: true, not ${JSON.stringify(value)}: undeciding a die names no face`);
    }
  }
  return { cube: pick.skhool === true, tetra: pick.subStance === true, solid: pick.solid === true };
}

/** What the dice show, as the tray reports it. */
function resultOf(shown: { cube?: number; tetra?: number; solid?: number; platonid?: number }): RollResult {
  return {
    ...(shown.cube !== undefined ? { skhool: CUBE[shown.cube].facultyLetter } : {}),
    ...(shown.tetra !== undefined ? { subStance: TETRA[shown.tetra] } : {}),
    ...(shown.solid !== undefined ? { solid: SOLIDS[shown.solid].code } : {}),
    ...(shown.platonid !== undefined ? { platonid: shown.platonid + 1 } : {}),
  };
}

/** A Platonid's spec for the Clearing: its solid checked, its Skhool's colour, and its numbers in ink or white, whichever stands out. */
export function platonidSpec(pick: PlacePick['platonid']): { solid: PlatonidCode; colour: string; on: string; faceImage?: FaceImage } {
  if (!pick || !PLATONID_CODES.includes(pick.solid)) throw new Error(`No Platonid ${JSON.stringify(pick?.solid)}: it is one of ${PLATONID_CODES.join(', ')}`);
  const colour = schoolByLetter(pick.skhool).core;
  return { solid: pick.solid, colour, on: discLetterColour(colour), ...(pick.faceImage ? { faceImage: pick.faceImage } : {}) };
}

/** A roll's tumble, checked: 'long' is for the Platonid's throw alone. */
export function rollTumble(pick: RollPick): Tumble {
  const tumble = tumbleStyle(pick.tumble);
  if (tumble === 'long' && pick.platonid === undefined) throw new Error("tumble: 'long' is for the Platonid's throw; the colour and solid dice keep theirs");
  return tumble;
}

/** A tray's dice to go without: only the tetrahedron can be left out. */
export function withoutDice(without: unknown): ('tetra')[] {
  if (without === undefined) return [];
  if (!Array.isArray(without) || without.some((w) => w !== 'tetra')) throw new Error(`without takes ['tetra'], not ${JSON.stringify(without)}`);
  return without.length ? ['tetra'] : [];
}

/** An index in [0, n), from the platform's CSPRNG, without modulo bias. */
export function chooseIndex(n: number): number {
  const limit = Math.floor(2 ** 32 / n) * n;
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a);
  while (a[0] >= limit);
  return a[0] % n;
}

// Jost, shared by every tray on the page and removed with the last one.
let jost: FontFace | null = null;
let jostUsers = 0;
function acquireJost(): Promise<unknown> {
  jostUsers++;
  if (!jost) {
    jost = new FontFace('Jost', `url(${jostUrl}) format('woff2')`, { weight: '100 900' });
    document.fonts.add(jost);
  }
  return jost.load().catch(() => {});
}
function releaseJost() {
  jostUsers--;
  if (jostUsers === 0 && jost) {
    document.fonts.delete(jost);
    jost = null;
  }
}

/**
 * The School now in the orientation, after the cube showed `cube` (an index into
 * CUBE) — whether it was thrown or set by hand and turned with show(). A step
 * that leaves the cube alone (`cube` undefined) keeps the School there was.
 */
export function nextSchool(current: School | null, cube: number | undefined): School | null {
  return cube === undefined ? current : CUBE[cube];
}

/**
 * A landing ripple is the colour of the School in the orientation, ink until
 * there is one: its core on light paper, its glow on dark, as ic-house-style has it.
 */
export function rippleColour(school: School | null, paper: Paper = 'light'): string {
  if (!school) return paperInk(paper);
  return paper === 'dark' ? school.glow : school.core;
}

/**
 * Where the landing ripples ring, and in what colour: one from each thrown die
 * (the School in the orientation colours them all), or none when the dice are
 * set out to be read instead.
 */
export function landingRipples(
  landing: LandingStyle,
  chosen: Chosen,
  landed: Landing,
  colour: string,
): { at: { x: number; y: number }; colour: string }[] {
  if (landing === 'arrange') return [];
  const at = [
    chosen.cube !== undefined && landed.cubeAt,
    chosen.tetra !== undefined && landed.tetraAt,
    chosen.solid !== undefined && landed.solidAt,
    chosen.platonid !== undefined && landed.platonidAt,
  ];
  return at.filter((p): p is { x: number; y: number } => !!p).map((p) => ({ at: p, colour }));
}

/** How long a die takes to turn to a face set by hand. */
const SHOW_MS = 450;

export function mountDiceTray(el: HTMLElement, opts: DiceTrayOptions = {}): DiceTray {
  let soundOn = opts.sound ?? true;
  let paper: Paper = opts.paper ?? 'light';
  const faces = faceStyle(opts.faces); // an unknown style is refused here, at mount
  const wood = solidWood(opts.solidWood); // and so is an unknown wood
  const landing = landingStyle(opts.landing); // and an unknown landing
  const without = withoutDice(opts.without); // and a die it cannot go without
  const noTetra = (named: boolean) => {
    if (named && without.includes('tetra')) throw new Error('This tray has no tetrahedron');
  };
  /** The Platonid on the Clearing: its number of faces, or 0 for none. */
  let platonidFaces = 0;
  let destroyed = false;
  let lastSound = 0;
  const playing = new Set<HTMLAudioElement>();

  const play = (set: keyof typeof SOUNDS, volume: number) => {
    if (!soundOn || destroyed) return;
    const now = performance.now();
    // a burst of contacts is one clack; the landing knock is never merged away
    if (set !== 'land' && now - lastSound < 35) return;
    lastSound = now;
    const files = SOUNDS[set];
    const audio = new Audio(files[chooseIndex(files.length)]);
    audio.volume = Math.max(0.05, Math.min(1, volume));
    playing.add(audio);
    audio.addEventListener('ended', () => playing.delete(audio), { once: true });
    audio.play().catch(() => playing.delete(audio));
  };

  // everything the tray draws lives in this one box, inside el
  const box = document.createElement('div');
  box.style.cssText = 'position:relative;width:100%;height:100%';
  el.appendChild(box);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => opts.reducedMotion ?? reduced.matches;

  let clearing: Clearing | null = null;
  // the cube's letters are drawn into canvases once, so Jost has to be here first
  const ready = acquireJost().then(() => {
    if (destroyed) return;
    clearing = createClearing(box, paper, { ring: opts.ring, clearingSize: opts.clearingSize, faces, solidWood: wood, without });
    clearing.onImpact = (hit: Impact) => play(hit.kind === 'die' ? 'clack' : 'tray', hit.speed / 9);
    clearing.onLand = () => play('land', 0.8);
  });

  /** The School in the orientation, thrown or set by hand: it colours every landing ripple. */
  let school: School | null = null;

  const ripple = (at: { x: number; y: number }, colour: string) => {
    if (isReduced()) return;
    const ring = document.createElement('div');
    ring.style.cssText =
      `position:absolute;left:${at.x}px;top:${at.y}px;width:0;height:0;border:3px solid ${colour};` +
      'border-radius:50%;transform:translate(-50%,-50%);pointer-events:none';
    box.appendChild(ring);
    ring
      .animate(
        [
          { width: '0px', height: '0px', opacity: 0.9 },
          { width: '320px', height: '190px', opacity: 0 },
        ],
        { duration: 1400, easing: 'ease-out', fill: 'forwards' },
      )
      .finished.then(() => ring.remove(), () => ring.remove());
  };

  const tray: DiceTray = {
    async roll(pick) {
      // the result first, so a host can log it before a die leaves the hand; a face not on its die is refused at once
      noTetra(pick.subStance !== undefined);
      const tumble = rollTumble(pick);
      const { chosen, result } = chooseRoll(pick, platonidFaces);
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      opts.onChosen?.(result);

      let landed: Landing;
      try {
        landed = isReduced() ? clearing.place(chosen) : await clearing.roll(chosen, tumble);
      } catch (e) {
        if (destroyed) throw e;
        console.error('[ic-dice] the throw failed; showing the chosen result', e);
        landed = clearing.place(chosen);
      }

      // the dice as they physically lie, against the record; the record wins
      if (chosen.cube !== undefined && landed.cube !== chosen.cube) {
        console.warn(`[ic-dice] the cube shows ${landed.cube === undefined ? 'nothing' : CUBE[landed.cube].facultyLetter} but ${CUBE[chosen.cube].facultyLetter} was chosen; keeping ${CUBE[chosen.cube].facultyLetter}`);
      }
      if (chosen.tetra !== undefined && landed.tetra !== chosen.tetra) {
        console.warn(`[ic-dice] the tetrahedron shows ${landed.tetra === undefined ? 'nothing' : TETRA[landed.tetra].room} but ${TETRA[chosen.tetra].room} was chosen; keeping ${TETRA[chosen.tetra].room}`);
      }
      if (chosen.platonid !== undefined && landed.platonid !== chosen.platonid) {
        console.warn(`[ic-dice] the Platonid shows ${landed.platonid === undefined ? 'nothing' : `face ${landed.platonid + 1}`} but face ${chosen.platonid + 1} was chosen; keeping face ${chosen.platonid + 1}`);
      }
      // a new Hall: the Platonid has left the table
      if (chosen.cube !== undefined || chosen.solid !== undefined) platonidFaces = 0;
      if (chosen.solid !== undefined && landed.solid !== chosen.solid) {
        console.warn(`[ic-dice] the solid die shows ${landed.solid === undefined ? 'nothing' : SOLIDS[landed.solid].name} but ${SOLIDS[chosen.solid].name} was chosen; keeping ${SOLIDS[chosen.solid].name}`);
      }

      if (chosen.cube !== undefined) school = nextSchool(school, chosen.cube);
      if (landing === 'arrange') {
        // set out to be read: the same faces, now looking at the viewer; read again, and the record still wins
        const shown = await clearing.arrange(chosen, isReduced() ? 0 : SHOW_MS);
        for (const w of ['cube', 'tetra', 'solid', 'platonid'] as const) {
          if (chosen[w] !== undefined && shown[w] !== chosen[w]) console.warn(`[ic-dice] set out to be read, the ${w} shows ${shown[w]} but ${chosen[w]} was chosen; keeping ${chosen[w]}`);
        }
      }
      // the landing: a ripple in the landed School's colour, unless the dice are set out to be read
      for (const r of landingRipples(landing, chosen, landed, rippleColour(school, paper))) ripple(r.at, r.colour);
      return result;
    },

    /** Turning sound off silences the next sound, not one already ringing, as the page always has. */
    async show(pick) {
      const chosen = chooseShow(pick);
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      const shown = await clearing.turn(chosen, isReduced() ? 0 : SHOW_MS);
      // a School set by hand is the orientation's School too: the next ripple takes its colour
      school = nextSchool(school, shown.cube);
      return resultOf(shown);
    },

    async unset(pick) {
      noTetra(pick.subStance !== undefined);
      const which = chooseUnset(pick);
      if (which.cube || which.solid) platonidFaces = 0;
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      await clearing.unset(which, isReduced() ? 0 : SHOW_MS);
      if (pick.skhool) school = null;
    },

    async park(pick) {
      const which: Which[] = [...(pick.skhool ? (['cube'] as const) : []), ...(pick.subStance ? (['tetra'] as const) : [])];
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      await clearing.park(which, isReduced() ? 0 : SHOW_MS);
    },

    async place(pick) {
      const spec = platonidSpec(pick?.platonid);
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      await clearing.placePlatonid(spec, isReduced() ? 0 : SHOW_MS);
      platonidFaces = platonidModel(spec.solid).faces.length;
    },

    async unpark() {
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      await clearing.unpark(undefined, isReduced() ? 0 : SHOW_MS);
    },

    setSound(on) {
      soundOn = on;
    },

    setPaper(next) {
      paper = next;
      clearing?.setPaper(next);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearing?.destroy();
      playing.forEach((a) => {
        a.pause();
        a.removeAttribute('src');
        a.load();
      });
      playing.clear();
      box.remove();
      releaseJost();
    },
  };
  return tray;
}
