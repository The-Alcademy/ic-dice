// The demo page: throw the dice in the Clearing, write the orientation line,
// and let the Head Porter speak the threshold form; then the full sequence:
// park the first two dice above the Clearing and throw the solid die, which
// chooses the solid of the Hall to be inspected. The dice themselves are the
// package's tray (src/tray.ts), mounted exactly as a host app would mount it.

import { mountDiceTray, type RollPick, type RollResult } from './index';
import { schoolByLetter, solidByCode, type School, type Solid, type SubStance } from './faces';
import { hallLine, thresholdLine, skhoolSlot, subStanceSlot } from './porter';

// ------------------------------------------------------------------- state --

interface Record {
  school: School | null;
  sub: SubStance | null;
  solid: Solid | null;
}

/** What has been thrown, chosen before each throw: the Daybook's copy. */
const record: Record = { school: null, sub: null, solid: null };
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

// the third die's controls, added here beside the others
const button = (id: string, text: string) => {
  const b = document.createElement('button');
  b.id = id;
  b.textContent = text;
  return b;
};
const solidBtn = button('throw-solid', 'Park them, throw the solid die');
const unparkBtn = button('unpark', 'Bring them back');
unparkBtn.className = 'small';
const hallEl = document.createElement('p');
hallEl.id = 'hall';
hallEl.setAttribute('aria-live', 'polite');
hallEl.style.cssText = 'margin:0;text-align:center;font-style:italic;min-height:1.5em';
throwBtn.after(solidBtn, unparkBtn);
porterEl.after(hallEl);

let soundOn = true;
try {
  soundOn = localStorage.getItem('ic-dice-sound') !== 'off';
} catch {
  // storage unavailable: sound stays on
}

// ----------------------------------------------------------------- the tray --

const tray = mountDiceTray(clearingEl, {
  sound: soundOn,
  // room above the rim for the parked row
  clearingSize: 0.6,
  // the result is chosen before the throw; this is where a host logs it
  onChosen(chosen: RollResult) {
    if (chosen.skhool) record.school = schoolByLetter(chosen.skhool);
    if (chosen.subStance) record.sub = chosen.subStance;
    if (chosen.solid) record.solid = solidByCode(chosen.solid);
    console.info('[ic-dice] chosen before the throw:', {
      school: chosen.skhool ? schoolByLetter(chosen.skhool).faculty : '(unchanged)',
      sub: chosen.subStance ? chosen.subStance.room : '(unchanged)',
      solid: chosen.solid ? solidByCode(chosen.solid).name : '(unchanged)',
    });
  },
});

function showSound() {
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
}
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  tray.setSound(soundOn);
  try {
    localStorage.setItem('ic-dice-sound', soundOn ? 'on' : 'off');
  } catch {
    // not remembered; still toggled
  }
  showSound();
});
showSound();

// ------------------------------------------------------------------- page --

/** A slot writes itself in, in the hand. */
function write(slot: HTMLElement, text: string) {
  slot.textContent = text;
  slot.classList.remove('open', 'writing');
  void slot.offsetWidth; // restart the reveal
  slot.classList.add('writing');
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

function busy(on: boolean) {
  for (const b of [throwBtn, cubeBtn, tetraBtn, solidBtn, unparkBtn]) b.disabled = on;
  // the solid die follows a Skhool: it chooses which of that Skhool's places
  if (!on) solidBtn.disabled = !record.school;
}
busy(false);

async function throwDice(pick: RollPick) {
  busy(true);
  try {
    const landed = await tray.roll(pick);
    if (landed.skhool && record.school) write(skhoolEl, skhoolSlot(record.school));
    if (landed.subStance && record.sub) write(subEl, subStanceSlot(record.sub));
    speakPorter();
  } finally {
    busy(false);
  }
}

/** The full sequence's last step: the first two dice park above the Clearing, and the solid die is thrown alone. */
async function throwSolid() {
  busy(true);
  try {
    await tray.park({ skhool: true, subStance: true });
    await tray.roll({ solid: 'random' });
    if (record.school && record.solid) hallEl.textContent = hallLine(record.school, record.solid);
  } finally {
    busy(false);
  }
}

async function unpark() {
  busy(true);
  try {
    await tray.unpark();
  } finally {
    busy(false);
  }
}

// throwing the first two again unparks them first: the tray does it
throwBtn.addEventListener('click', () => throwDice({ skhool: 'random', subStance: 'random' }));
solidBtn.addEventListener('click', throwSolid);
unparkBtn.addEventListener('click', unpark);
cubeBtn.addEventListener('click', () => throwDice({ skhool: 'random' }));
tetraBtn.addEventListener('click', () => throwDice({ subStance: 'random' }));
