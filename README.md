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
npm run build    # type-check, then the production build in dist/
```

It deploys to Vercel as a plain Vite app, with no configuration.

## Files

| File | What it is |
|---|---|
| `src/faces.ts` | The single source of truth: the six Schools and the four sub-stances, exactly as given. |
| `src/porter.ts` | The Head Porter's threshold line, and the orientation line's slots. |
| `src/dice.ts` | The dice, the Clearing, the physics and the predetermined landing. |
| `src/main.ts` | The page: choosing, throwing, sound, the slots, the ripple, the Porter. |
| `index.html` | The page and its styles. |
| `public/sounds/` | The dice sounds; `ATTRIBUTION.md` credits them. |
| `tests/` | `faces.test.ts`, `porter.test.ts`. |

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
`public/sounds/` (see below), and none of its code was ever imported.

### How a predetermined throw works

The trick is the one Teall Dice, and so dice-box-threejs, use: relabel the die,
not the physics.

1. The page chooses the result.
2. `dice.ts` simulates the throw off-screen, to rest, with a fixed step,
   recording the path and every impact. A throw that settles cocked (a cube on
   a corner facet, a tetrahedron not flat) is thrown again, unseen.
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
and a wood-table knock on landing. See `public/sounds/ATTRIBUTION.md`.

There is a sound toggle beside the Throw button, and the choice is remembered.

## Provisional

- Every preposition except "at the Drawing Board" is provisional, and is marked
  so in `src/faces.ts`.
- The School colours here are the prototype's own, as given in the goal, not
  the ic-house-style tokens.
