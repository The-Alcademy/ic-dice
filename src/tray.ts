// The dice tray: the whole roller, mountable in any element of any IC app.
//
//   const tray = mountDiceTray(el, { onChosen: (r) => daybook.log(r) });
//   const landed = await tray.roll({ skhool: 'random', subStance: 'random' });
//   tray.destroy();
//
// Framework-free, and it touches nothing outside `el`: it draws into a canvas
// inside it, rings its ripples inside it, and brings its own sounds and its own
// Jost (the cube's letters are drawn in it) inlined in the build, so a host
// copies no files. The one thing it adds outside `el` is that font, to
// document.fonts, and destroy() takes it away again.

import { CUBE, TETRA, INK, type School, type SkhoolLetter, type SubStance } from './faces';
import { createClearing, type Clearing, type Impact, type Landing } from './dice';
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

export type { SkhoolLetter, SubStance };

/** Which dice to throw, and onto what. Leave a die out and it is not thrown. */
export interface RollPick {
  skhool?: SkhoolLetter | 'random';
  subStance?: SubStance | 'random';
}

/** What was thrown: chosen before the throw, and shown by the dice after it. */
export interface RollResult {
  skhool?: SkhoolLetter;
  subStance?: SubStance;
}

/** Which dice to turn, and to which face. A face must be given: showing is not choosing. */
export interface ShowPick {
  skhool?: SkhoolLetter;
  subStance?: SubStance;
}

/** Which dice to undecide. */
export interface UnsetPick {
  skhool?: true;
  subStance?: true;
}

export interface DiceTrayOptions {
  /** Sound on or off to begin with. Default: on. */
  sound?: boolean;
  /** Place the dice on their result with no throw. Default: follow prefers-reduced-motion, checked at each roll. */
  reducedMotion?: boolean;
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
  setSound(on: boolean): void;
  /** Release WebGL, audio and listeners, and empty `el` of everything the tray put there. */
  destroy(): void;
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

/** A landing ripple is the colour of the School in the orientation; ink until there is one. */
export function rippleColour(school: School | null): string {
  return school?.core ?? INK;
}

/** How long a die takes to turn to a face set by hand. */
const SHOW_MS = 450;

export function mountDiceTray(el: HTMLElement, opts: DiceTrayOptions = {}): DiceTray {
  let soundOn = opts.sound ?? true;
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
    clearing = createClearing(box);
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
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');

      // the result first, so a host can log it before a die leaves the hand
      const chosen: { cube?: number; tetra?: number } = {};
      if (pick.skhool !== undefined) {
        chosen.cube = pick.skhool === 'random' ? chooseIndex(CUBE.length) : CUBE.findIndex((s) => s.facultyLetter === pick.skhool);
        if (chosen.cube < 0) throw new Error(`No School ${String(pick.skhool)} on the cube`);
      }
      if (pick.subStance !== undefined) {
        const sub = pick.subStance;
        chosen.tetra = sub === 'random' ? chooseIndex(TETRA.length) : TETRA.findIndex((t) => t === sub || t.room === sub.room);
        if (chosen.tetra < 0) throw new Error(`No sub-stance ${sub === 'random' ? sub : sub.room} on the tetrahedron`);
      }
      const result: RollResult = {
        ...(chosen.cube !== undefined ? { skhool: CUBE[chosen.cube].facultyLetter } : {}),
        ...(chosen.tetra !== undefined ? { subStance: TETRA[chosen.tetra] } : {}),
      };
      opts.onChosen?.(result);

      let landed: Landing;
      try {
        landed = isReduced() ? clearing.place(chosen) : await clearing.roll(chosen);
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

      // the landing: a ripple in the landed School's colour
      if (chosen.cube !== undefined) {
        school = nextSchool(school, chosen.cube);
        if (landed.cubeAt) ripple(landed.cubeAt, rippleColour(school));
      }
      if (chosen.tetra !== undefined && landed.tetraAt) ripple(landed.tetraAt, rippleColour(school));
      return result;
    },

    /** Turning sound off silences the next sound, not one already ringing, as the page always has. */
    async show(pick) {
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      const chosen: { cube?: number; tetra?: number } = {};
      if (pick.skhool !== undefined) {
        chosen.cube = CUBE.findIndex((s) => s.facultyLetter === pick.skhool);
        if (chosen.cube < 0) throw new Error(`No School ${String(pick.skhool)} on the cube`);
      }
      if (pick.subStance !== undefined) {
        const sub = pick.subStance;
        chosen.tetra = TETRA.findIndex((t) => t === sub || t.room === sub.room);
        if (chosen.tetra < 0) throw new Error(`No sub-stance ${sub.room} on the tetrahedron`);
      }
      const shown = await clearing.turn(chosen, isReduced() ? 0 : SHOW_MS);
      // a School set by hand is the orientation's School too: the next ripple takes its colour
      school = nextSchool(school, shown.cube);
      return {
        ...(shown.cube !== undefined ? { skhool: CUBE[shown.cube].facultyLetter } : {}),
        ...(shown.tetra !== undefined ? { subStance: TETRA[shown.tetra] } : {}),
      };
    },

    async unset(pick) {
      await ready;
      if (destroyed || !clearing) throw new Error('The dice tray has been destroyed');
      await clearing.unset({ cube: pick.skhool === true, tetra: pick.subStance === true }, isReduced() ? 0 : SHOW_MS);
      if (pick.skhool) school = null;
    },

    setSound(on) {
      soundOn = on;
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
