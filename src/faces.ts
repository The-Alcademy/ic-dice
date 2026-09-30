// The two dice's faces: the single source of truth for the page, the Porter's
// line, and the tests. Nothing else in the app spells a School or a sub-room.

export type SchoolLetter = 'R' | 'P' | 'S' | 'I' | 'W' | 'A';
/** The Skhool a MetaMind throw lands on, by its Faculty's initial (the IC apps' name for it). */
export type SkhoolLetter = SchoolLetter;

export interface School {
  /** The Faculty's initial, as it is lettered on the cube (not the colour's initial, which ic-house-style calls colourLetter). */
  facultyLetter: SchoolLetter;
  faculty: string;
  colour: string;
  /** The School's colour, from ic-house-style (school.core): fills and marks, such as the landing ripple. */
  core: string;
  /** Its colour on dark paper, from ic-house-style (school.glow): the landing ripple when the tray is on dark. */
  glow: string;
  /** Its colour as text on pale ground, from ic-house-style (school.deep): the letter on the wood face. */
  deep: string;
  domain: string;
  /** Completes "the ability to …". */
  gloss: string;
  /** The School's Forest Hall: where it is entered. */
  hall: string;
  title: string;
  /** How you stand in that Hall: "at the Drawing Board", "on the Ramble". */
  prep: string;
}

/**
 * The MetaMind cube, in mandala order: Purple at north, then clockwise. Only
 * "at the Drawing Board" is settled; every other preposition is PROVISIONAL.
 */
// The colours are ic-house-style's School palette (tokens/tokens.json at 50548ff),
// the canonical one: `core` for fills and marks, `glow` for them on dark paper, `deep` for text on pale ground.
// ic-dice cannot depend on ic-house-style (a private repo), so they are copied
// here, and tests/faces.test.ts pins them to those values.
export const CUBE: readonly School[] = [
  {
    facultyLetter: 'R', faculty: 'REBIS', colour: 'Purple', core: '#a879e0', glow: '#c6a3f0', deep: '#8441d3', domain: 'PsychoAlchemy',
    gloss: 'transmute belief — hold opposites until a new whole forms',
    hall: 'the Looking Glass', title: 'the Hall of Reflection',
    prep: 'at', // PROVISIONAL
  },
  {
    facultyLetter: 'P', faculty: 'PILOT', colour: 'Red', core: '#c14a55', glow: '#e08a90', deep: '#b43e49', domain: 'PsychoNautics',
    gloss: 'steer your own consciousness',
    hall: 'the Lantern', title: 'the Hall of Perception',
    prep: 'in', // PROVISIONAL
  },
  {
    facultyLetter: 'S', faculty: 'SALVE', colour: 'Orange', core: '#cf8331', glow: '#e6a566', deep: '#905b21', domain: 'PsychoTherapeutics',
    gloss: 'tend and restore wellbeing',
    hall: 'the Sensorium', title: 'the Hall of Sensing',
    prep: 'in', // PROVISIONAL
  },
  {
    facultyLetter: 'I', faculty: 'IMPRO', colour: 'Yellow', core: '#caa62c', glow: '#ddc766', deep: '#7a651b', domain: 'PsychoLudics',
    gloss: 'play in earnest — to improvise',
    hall: 'the Drawing Board', title: 'the Hall of Invention',
    prep: 'at', // settled
  },
  {
    facultyLetter: 'W', faculty: 'WEAVE', colour: 'Green', core: '#5c9a55', glow: '#88c081', deep: '#43713e', domain: 'PsychoTerranics',
    gloss: 'live woven into the web of life',
    hall: 'the Ramble', title: 'the Hall of Wandering',
    prep: 'on', // PROVISIONAL
  },
  {
    facultyLetter: 'A', faculty: 'ALIGN', colour: 'Blue', core: '#5285c4', glow: '#82a8dc', deep: '#3869a5', domain: 'PsychoTechnics',
    gloss: "test reality and name what's true",
    hall: 'the Anomaly', title: 'the Hall of Asking',
    prep: 'at', // PROVISIONAL
  },
];

export type SubRoomIcon = 'key' | 'anvil' | 'lamp' | 'table';

export interface SubStance {
  room: string;
  /** What you will do there: "And there you will {verb}." */
  verb: string;
  /** How the orientation line says it: "and I am {phrase}". */
  phrase: string;
  icon: SubRoomIcon;
}

/** The sub-stance tetrahedron: the four sub-rooms of every Room. */
export const TETRA: readonly SubStance[] = [
  { room: 'Closet', verb: 'acquire', phrase: 'acquiring it', icon: 'key' },
  { room: 'Chamber', verb: 'practise', phrase: 'practising it', icon: 'anvil' },
  { room: 'Alcove', verb: 'reflect', phrase: 'reflecting on it', icon: 'lamp' },
  { room: 'Parlour', verb: 'encounter', phrase: 'encountering it', icon: 'table' },
];

/** The die's look. */
export const INK = '#1F2A33';
/** Ink on dark paper: ic-house-style's dark-paper text colour, so the Clearing's ring shows. */
export const INK_ON_DARK = '#eae2d0';

/** The page the tray sits on. Its paper shows through; the ring and ripples are drawn to be seen on it. */
export type Paper = 'light' | 'dark';
export const WRITTEN = '#2B5468';

export function schoolByLetter(letter: SchoolLetter): School {
  const found = CUBE.find((s) => s.facultyLetter === letter);
  if (!found) throw new Error(`No School ${letter} on the cube`);
  return found;
}

export function subStanceByVerb(verb: string): SubStance {
  const found = TETRA.find((s) => s.verb === verb);
  if (!found) throw new Error(`No sub-stance "${verb}" on the tetrahedron`);
  return found;
}
