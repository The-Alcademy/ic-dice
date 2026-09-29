// The two dice's faces: the single source of truth for the page, the Porter's
// line, and the tests. Nothing else in the app spells a School or a sub-room.

export type SchoolLetter = 'R' | 'P' | 'S' | 'I' | 'W' | 'A';

export interface School {
  /** The Faculty's initial, as it is lettered on the cube. */
  letter: SchoolLetter;
  faculty: string;
  colour: string;
  hex: string;
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
export const CUBE: readonly School[] = [
  {
    letter: 'R', faculty: 'REBIS', colour: 'Purple', hex: '#6A3C8C', domain: 'PsychoAlchemy',
    gloss: 'transmute belief — to hold opposites until a new whole forms',
    hall: 'the Looking Glass', title: 'the Hall of Reflection',
    prep: 'at', // PROVISIONAL
  },
  {
    letter: 'P', faculty: 'PILOT', colour: 'Red', hex: '#B23A2E', domain: 'PsychoNautics',
    gloss: 'steer your own consciousness',
    hall: 'the Lantern', title: 'the Hall of Perception',
    prep: 'in', // PROVISIONAL
  },
  {
    letter: 'S', faculty: 'SALVE', colour: 'Orange', hex: '#C45A1C', domain: 'PsychoTherapeutics',
    gloss: 'tend and restore wellbeing',
    hall: 'the Sensorium', title: 'the Hall of Sensing',
    prep: 'in', // PROVISIONAL
  },
  {
    letter: 'I', faculty: 'IMPRO', colour: 'Yellow', hex: '#D6A92A', domain: 'PsychoLudics',
    gloss: 'play in earnest — to improvise',
    hall: 'the Drawing Board', title: 'the Hall of Invention',
    prep: 'at', // settled
  },
  {
    letter: 'W', faculty: 'WEAVE', colour: 'Green', hex: '#4E8A3A', domain: 'PsychoTerranics',
    gloss: 'live woven into the web of life',
    hall: 'the Ramble', title: 'the Hall of Wandering',
    prep: 'on', // PROVISIONAL
  },
  {
    letter: 'A', faculty: 'ALIGN', colour: 'Blue', hex: '#2E64A0', domain: 'PsychoTechnics',
    gloss: 'test reality and name what is true',
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
export const WRITTEN = '#2B5468';

export function schoolByLetter(letter: SchoolLetter): School {
  const found = CUBE.find((s) => s.letter === letter);
  if (!found) throw new Error(`No School ${letter} on the cube`);
  return found;
}

export function subStanceByVerb(verb: string): SubStance {
  const found = TETRA.find((s) => s.verb === verb);
  if (!found) throw new Error(`No sub-stance "${verb}" on the tetrahedron`);
  return found;
}
