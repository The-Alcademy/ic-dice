# ic-dice — the dice roll in the Clearing

A one-page prototype of the Invysible College orientation roll. In the Clearing,
the centre of the BedePlex mandala, the student throws two dice:

- the **MetaMind cube**, which chooses the School gate they face (R P S I W A,
  in mandala order: Purple at north, then clockwise);
- the **sub-stance tetrahedron**, which chooses the sub-room: Closet, Chamber,
  Alcove or Parlour.

When they land, the orientation line writes itself in, naming the Faculty as
the Daybook does: "…through WEAVE, and I am practising it, with Sam."

The result is chosen **first**, with `crypto.getRandomValues`, so it can be
logged (to the Daybook, later) before a die leaves the hand. The dice then land
on it, with real 3D physics and sound. The record and the animation never
disagree: after every throw the page reads the up faces off the dice themselves
and checks them against the record.

```
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: faces and the Porter's line, no WebGL
npm run build    # type-check; the library into dist/; the demo into site/
```

The demo page deploys to Vercel from `site/` (`vercel.json`).

## Using the tray

The roller is a module any IC app can mount: framework-free, drawing only
inside the element it is given. The sounds and the Jost for the cube's letters
are inlined in `dist/ic-dice.js`, so a host copies no files. `three` is a peer
dependency; `cannon-es` comes with the package. `dist/` is committed, so the
package installs straight from git with no build step:

```
npm install github:The-Alcademy/ic-dice three
```

```ts
import { mountDiceTray, schoolByLetter, thresholdLine } from 'ic-dice';

const tray = mountDiceTray(document.getElementById('tray')!, {
  sound: true,
  paper: 'light', // or 'dark': the ring, shadows and ripples are drawn to show on it
  // called with the result before a die moves, so it can be logged first
  onChosen: (result) => daybook.log(result),
});

// throw both dice, each onto a random face; or name a face, or leave a die out
const { skhool, subStance } = await tray.roll({ skhool: 'random', subStance: 'random' });
const line = thresholdLine(schoolByLetter(skhool!), subStance!, { with: 'Ada' }); // or { with: null } for alone; left out, it is Sam

// the student set a face by hand: turn that die to it — no throw, no sound, no onChosen
await tray.show({ skhool: 'R' });

// the student reset a slot: that die stands balanced on a corner, undecided
await tray.unset({ skhool: true });

tray.setSound(false);
tray.setPaper('dark'); // e.g. when the page's light/dark setting changes
tray.destroy(); // releases WebGL, audio and listeners, and empties the element
```

- `roll()` throws only the dice named in the pick, and resolves once visible
  motion stops. Give `'random'` to have the tray choose, with
  `crypto.getRandomValues`, or a face (`skhool: 'W'`,
  `subStance: TETRA[1]`) to land on that one.
- The tray fills its element and follows it when it is resized. Give the
  element a size; a square suits the Clearing.
- `show()` turns the named dice in place to faces the student set by hand: a
  short smooth rotation (about 450 ms; at once under reduced motion), lifting
  just clear of the Clearing. There is no throw, no sound and no ripple, and
  `onChosen` is not called, since the dice chose nothing. It takes a face, never
  `'random'`.
- `unset()` undecides the named dice: each turns the same short, smooth way to
  stand balanced on a corner — the cube on a truncated corner, the tetrahedron
  on its point — showing nothing. No sound, no ripple, no `onChosen`. A later
  `roll()` or `show()` starts from that pose. Undeciding the Skhool returns the
  ripples to ink.
- A landing ripple takes the colour of the School in the orientation, whether it
  was thrown or set by hand with `show()`, and is ink until there is one.
- The tray draws no background: the page's paper shows through. `paper`
  (default `'light'`) says which paper that is. On dark, the Clearing's ring is
  in `INK_ON_DARK` (ic-house-style's dark-paper text colour) rather than `INK`,
  the dice's shadows are stronger, and ripples take each School's `glow`, not its
  `core`. The tray does not follow `prefers-color-scheme` itself; a host that
  does calls `setPaper()` when it changes.
- Motion follows `prefers-reduced-motion` unless `reducedMotion` is passed.
- `ring` (default `true`) draws the Clearing's rings: the rim and the inner
  circle. Pass `false` when the host draws its own ground beneath the tray, such
  as a map that should show through. Only the drawing goes: the dice still
  rebound from the same rim, and `setPaper()` draws no rings back.

  ```ts
  // the dice over the Study's ring map: the map's own rings show through
  mountDiceTray(el, { paper: 'dark', ring: false });
  ```

- `clearingSize` is how much of the element the Clearing fills: the fraction
  of its shorter side that the rim spans, from `0.2` to `1` (values outside are
  clamped). The default, about `0.99`, is the framing the tray has always had:
  a square or landscape element looks exactly as before; a portrait one is now
  fitted by its width. The dice still land near the middle, so a smaller
  Clearing brings them into a smaller circle at the element's centre.

  ```ts
  // the Clearing over the map's centre circle, which spans 40% of the element
  mountDiceTray(el, { ring: false, clearingSize: 0.4 });
  ```

- The one thing it adds outside its element is the Jost face, in
  `document.fonts`; the last tray's `destroy()` removes it.
- The sounds and the font are `data:` URLs. A host with a Content Security
  Policy needs `media-src data:` and `font-src data:`.

The package also exports the faces (`CUBE`, `TETRA`, `schoolByLetter`, the
`SkhoolLetter` and `SubStance` types) and the Porter's lines
(`thresholdLine`, `orientationLine`).

The faces alone are `ic-dice/faces` (`dist/faces.js`, about 2.5 kB): `CUBE`,
`TETRA`, `schoolByLetter` and their types, as plain data with no imports, no
three.js, no cannon-es and no browser code, so a server function can read the
Schools and sub-stances without loading the tray:

```ts
import { CUBE, TETRA, schoolByLetter } from 'ic-dice/faces';
schoolByLetter('A').gloss; // "test reality and name what's true"
```

## Files

| File | What it is |
|---|---|
| `src/index.ts` | The package entry. |
| `src/tray.ts` | `mountDiceTray`: the roller as a mountable module, with its sounds, font, ripple and result check. |
| `src/faces.ts` | The single source of truth: the six Schools and the four sub-stances, exactly as given. Also built alone as `dist/faces.js` (`ic-dice/faces`). |
| `src/porter.ts` | The Head Porter's threshold line, and the orientation line's slots. |
| `src/dice.ts` | The dice, the Clearing, the physics and the predetermined landing. |
| `src/main.ts` | The demo page, mounting the tray as a host would: the slots, the Porter, the sound toggle. |
| `index.html` | The demo page and its styles. |
| `src/sounds/` | The dice sounds; `ATTRIBUTION.md` credits them. |
| `src/fonts/` | Jost (latin, variable), byte for byte as Google Fonts serves it, with its OFL licence. |
| `dist/` | The built package, committed: `ic-dice.js` and `types/`. |
| `tests/` | Faces, the Porter, the relabelling, and the package itself. |

## Route taken: three + cannon-es, not dice-box-threejs

The spike tried **@3d-dice/dice-box-threejs** (v0.0.12) first, because it
already rolls onto predetermined results (`Box.roll("1d6@4")`). It does that
well, but the two things this roll needs could not be done cleanly:

- **Custom faces.** A die's face labels live in the library's internal dice
  presets (its `DiceFactory`), not in the public options. A custom colorset
  changes colours, not labels. Six School letters, each in its own colour,
  would mean reaching into undocumented internals of a 0.0.x package.
- **A d4 with sub-room icons, read at its apex.** Its d4 draws text labels
  from a font, so a key, an anvil, a lamp and a table would need a symbol font
  or more patching of internals.

It also bundles its own copy of three.js (0.143) alongside the app's, and ships
no TypeScript types. So the two dice are built directly with **three** and
**cannon-es**, after the Codrops "Crafting a Dice Roller with Three.js and
Cannon-es" approach:

- the **cube** has **truncated corners**: six labelled octagons and eight small
  corner facets, as one convex polyhedron for both the drawing and the physics;
- the **tetrahedron** is read **at its apex**. Each face shows, near each of
  its three corners, the sub-room of the vertex at that corner, upright towards
  the corner. So the three faces round the top vertex all show its sub-room at
  the top.

dice-box-threejs is no longer a dependency. Its wood sounds were copied into
`src/sounds/` (see below), and none of its code was ever imported.

### How a predetermined throw works

The trick is the one Teall Dice, and so dice-box-threejs, use: relabel the die,
not the physics.

1. The page chooses the result.
2. `dice.ts` simulates the throw off-screen, to rest, with a fixed step,
   recording the path and every impact. Each die is thrown in from the side
   towards its own spot, one each side of the inner circle, and while it is low
   and still moving the Clearing acts as a shallow dish: a gentle pull towards
   that spot, a drag, and a push away from the other die. A throw is kept only
   if every die rests squarely on a face, within 2.8 of the middle (the inner
   circle is 1.04, the rim 5.2), at least 3.0 from the other die, and not
   touching it; otherwise it is thrown again, unseen (up to 40 times; about 85%
   of throws are kept first time). A die left out of a throw does not move.
3. The dice are labelled so that the face that came to rest upward carries the
   chosen result. The labelling is a rotation of the die's own labels, so it
   stays a proper die: opposite spokes of the mandala stay on opposite faces
   (R/I, P/W, S/A), and the tetrahedron is never mirror-labelled.
4. The recorded path is played back in real time, with a clack at each recorded
   impact. The imperceptible settle before the engine sleeps is trimmed.
5. At rest, the page reads each die's up face from its drawn orientation under
   its labels. A mismatch logs a console warning, and the page trusts the chosen
   result.

Because the playback is the recorded simulation, step 5 has never fired: in
testing (30 throws of all three kinds, headless Chrome) every die showed its
chosen face.

With `prefers-reduced-motion`, there is no physics: the dice are placed at rest
on the result at once, and the landing sound still plays if sound is on.

## Sounds

The goal asked for the Obsidian Dice Roller plugin's sounds
(github.com/javalent/dice-roller). **That plugin has no sounds.** Its repository
has no audio files, and nothing in its renderer, settings, README or changelog
plays audio (checked 29 September 2026). As the goal allowed, the sounds are
**dice-box-threejs's own assets, the "wood" set** (MIT): wood-on-wood clacks
when the dice strike each other, wood-tray hits when they strike the Clearing,
and a wood-table knock on landing. See `src/sounds/ATTRIBUTION.md`.

There is a sound toggle beside the Throw button, and the choice is remembered.

## School colours

The six School colours are ic-house-style's palette (`tokens/tokens.json` at
`50548ff`), which is canonical: `core` colours the landing ripple on light paper,
`glow` colours it on dark, and `deep`, the
colour for text on pale ground, letters the cube's wood faces (about 3.8:1 on the
wood for every School). ic-house-style is private, so the values are copied into
`src/faces.ts`, and `tests/faces.test.ts` pins them. Each School's letter is its
Faculty's initial, `facultyLetter` (R P S I W A), not the colour's initial
(ic-house-style's `colourLetter`, R O Y G B P, used for geocodes); no field is
called just `letter`.

## Provisional

- Every preposition except "at the Drawing Board" is provisional, and is marked
  so in `src/faces.ts`.

