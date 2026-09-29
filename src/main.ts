// The demo page: throw the dice in the Clearing, write the orientation line,
// and let the Head Porter speak the threshold form. The dice themselves are the
// package's tray (src/tray.ts), mounted exactly as a host app would mount it.

import { mountDiceTray, type RollPick, type RollResult } from './index';
import { schoolByLetter, type School, type SubStance } from './faces';
import { thresholdLine, skhoolSlot, subStanceSlot } from './porter';

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

let soundOn = true;
try {
  soundOn = localStorage.getItem('ic-dice-sound') !== 'off';
} catch {
  // storage unavailable: sound stays on
}

// ----------------------------------------------------------------- the tray --

const tray = mountDiceTray(clearingEl, {
  sound: soundOn,
  // the result is chosen before the throw; this is where a host logs it
  onChosen(chosen: RollResult) {
    if (chosen.skhool) record.school = schoolByLetter(chosen.skhool);
    if (chosen.subStance) record.sub = chosen.subStance;
    console.info('[ic-dice] chosen before the throw:', {
      school: chosen.skhool ? schoolByLetter(chosen.skhool).faculty : '(unchanged)',
      sub: chosen.subStance ? chosen.subStance.room : '(unchanged)',
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
  for (const b of [throwBtn, cubeBtn, tetraBtn]) b.disabled = on;
}

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

throwBtn.addEventListener('click', () => throwDice({ skhool: 'random', subStance: 'random' }));
cubeBtn.addEventListener('click', () => throwDice({ skhool: 'random' }));
tetraBtn.addEventListener('click', () => throwDice({ subStance: 'random' }));
