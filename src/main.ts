// The page: throw the dice in the Clearing, write the orientation line, and let
// the Head Porter speak the threshold form.

import { CUBE, TETRA, type School, type SubStance } from './faces';
import { thresholdLine, skhoolSlot, subStanceSlot } from './porter';
import { createClearing, type Impact, type Landing } from './dice';

// ------------------------------------------------------------------ choice --

/** An index in [0, n), from the platform's CSPRNG, without modulo bias. */
function choose(n: number): number {
  const limit = Math.floor(2 ** 32 / n) * n;
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a);
  while (a[0] >= limit);
  return a[0] % n;
}

// ------------------------------------------------------------------- sound --

const SOUNDS = {
  clack: Array.from({ length: 12 }, (_, i) => `/sounds/dicehit_wood${i + 1}.mp3`),
  tray: Array.from({ length: 7 }, (_, i) => `/sounds/surface_wood_tray${i + 1}.mp3`),
  land: Array.from({ length: 7 }, (_, i) => `/sounds/surface_wood_table${i + 1}.mp3`),
};

let soundOn = true;
try {
  soundOn = localStorage.getItem('ic-dice-sound') !== 'off';
} catch {
  // storage unavailable: sound stays on
}
let lastSound = 0;

function play(set: keyof typeof SOUNDS, volume: number) {
  if (!soundOn) return;
  const now = performance.now();
  if (now - lastSound < 35) return; // a burst of contacts is one clack
  lastSound = now;
  const files = SOUNDS[set];
  const audio = new Audio(files[choose(files.length)]);
  audio.volume = Math.max(0.05, Math.min(1, volume));
  audio.play().catch(() => {});
}

// ------------------------------------------------------------------- state --

interface Record {
  school: School | null;
  sub: SubStance | null;
}

/** What has been thrown, chosen before each throw: the Daybook's copy. */
const record: Record = { school: null, sub: null };
(window as unknown as { icDiceRecord: Record }).icDiceRecord = record;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const clearingEl = $('clearing');
const skhoolEl = $('slot-skhool');
const subEl = $('slot-sub');
const porterEl = $('porter');
const throwBtn = $<HTMLButtonElement>('throw');
const cubeBtn = $<HTMLButtonElement>('throw-cube');
const tetraBtn = $<HTMLButtonElement>('throw-tetra');
const soundBtn = $<HTMLButtonElement>('sound');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function showSound() {
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
}
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  try {
    localStorage.setItem('ic-dice-sound', soundOn ? 'on' : 'off');
  } catch {
    // not remembered; still toggled
  }
  showSound();
});
showSound();

/** A slot writes itself in, in the hand. */
function write(slot: HTMLElement, text: string) {
  slot.textContent = text;
  slot.classList.remove('open', 'writing');
  void slot.offsetWidth; // restart the reveal
  slot.classList.add('writing');
}

function ripple(at: { x: number; y: number }, colour: string) {
  if (reduced.matches) return;
  const ring = document.createElement('div');
  ring.className = 'ripple';
  ring.style.left = `${at.x}px`;
  ring.style.top = `${at.y}px`;
  ring.style.borderColor = colour;
  clearingEl.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove());
}

function speakPorter() {
  if (!record.school || !record.sub) {
    porterEl.textContent = '';
    porterEl.classList.remove('shown');
    return;
  }
  porterEl.textContent = thresholdLine(record.school, record.sub);
  porterEl.classList.remove('shown');
  void porterEl.offsetWidth;
  porterEl.classList.add('shown');
}

// ----------------------------------------------------------------- the box --

// the cube's letters are drawn into canvases once, so Jost has to be here first
await document.fonts.load('600 150px Jost').catch(() => {});
const clearing = createClearing(clearingEl);
clearing.onImpact = (hit: Impact) => play(hit.kind === 'die' ? 'clack' : 'tray', hit.speed / 9);
clearing.onLand = () => play('land', 0.8);

function busy(on: boolean) {
  for (const b of [throwBtn, cubeBtn, tetraBtn]) b.disabled = on;
}

async function throwDice(which: { cube: boolean; tetra: boolean }) {
  // the result first, so it can be logged before a die leaves the hand
  const chosen = {
    ...(which.cube ? { cube: choose(CUBE.length) } : {}),
    ...(which.tetra ? { tetra: choose(TETRA.length) } : {}),
  };
  if (chosen.cube !== undefined) record.school = CUBE[chosen.cube];
  if (chosen.tetra !== undefined) record.sub = TETRA[chosen.tetra];
  console.info('[ic-dice] chosen before the throw:', {
    school: chosen.cube !== undefined ? CUBE[chosen.cube].faculty : '(unchanged)',
    sub: chosen.tetra !== undefined ? TETRA[chosen.tetra].room : '(unchanged)',
  });

  busy(true);
  let landed: Landing;
  try {
    landed = reduced.matches ? clearing.place(chosen) : await clearing.roll(chosen);
  } catch (e) {
    console.error('[ic-dice] the throw failed; showing the chosen result', e);
    landed = clearing.place(chosen);
  } finally {
    busy(false);
  }

  // the dice as they physically lie, against the record; the record wins
  if (chosen.cube !== undefined && landed.cube !== chosen.cube) {
    console.warn(`[ic-dice] the cube shows ${landed.cube === undefined ? 'nothing' : CUBE[landed.cube].letter} but ${CUBE[chosen.cube].letter} was chosen; keeping ${CUBE[chosen.cube].letter}`);
  }
  if (chosen.tetra !== undefined && landed.tetra !== chosen.tetra) {
    console.warn(`[ic-dice] the tetrahedron shows ${landed.tetra === undefined ? 'nothing' : TETRA[landed.tetra].room} but ${TETRA[chosen.tetra].room} was chosen; keeping ${TETRA[chosen.tetra].room}`);
  }

  if (chosen.cube !== undefined && record.school) {
    if (landed.cubeAt) ripple(landed.cubeAt, record.school.hex);
    write(skhoolEl, skhoolSlot(record.school));
  }
  if (chosen.tetra !== undefined && record.sub) {
    if (landed.tetraAt) ripple(landed.tetraAt, record.school?.hex ?? '#1F2A33');
    write(subEl, subStanceSlot(record.sub));
  }
  speakPorter();
}

throwBtn.addEventListener('click', () => throwDice({ cube: true, tetra: true }));
cubeBtn.addEventListener('click', () => throwDice({ cube: true, tetra: false }));
tetraBtn.addEventListener('click', () => throwDice({ cube: false, tetra: true }));
