# Pictures in art/

The PNG files in this folder are Vahini artwork from
[vahinitech/drawings](https://github.com/vahinitech/drawings), the library
that holds every Vahini character and illustration. They are **not covered
by the MIT licence** in this repository's `LICENSE`, which applies to the
code only. The drawings library assigns no open licence to its artwork, so
ask Vahini before using these pictures anywhere else.

They are not published to npm: `package.json` lists only `src` in `files`.
`scripts/build-printables.mjs` reads them to build the editions vahinitech.com
publishes. A program that uses the npm package gets the same pages without
pictures.

## Where they come from

`art.json` records the drawings commit, the inventory digest of each
collection used, and for every picture its master file, the master's digest,
and the digest and size of the export here. `scripts/export_art.py` writes
both from a clean checkout of drawings at that commit:

```bash
python3 scripts/export_art.py ../drawings          # export and record
python3 scripts/export_art.py ../drawings --check  # fail if anything differs
```

The export only crops each master to its figure and resizes it, which the
drawings library allows its consumers to do. Anything that changes a drawing
(a new pose, expression or outfit, recolouring, redrawing) needs the owner's
approval and is made in the drawings library first, then pinned here.
