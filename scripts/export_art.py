#!/usr/bin/env python3
"""Export the pictures the printable editions use from vahinitech/drawings.

    python3 scripts/export_art.py <drawings checkout> [--check] [--library-checked]

The checkout must be at the commit pinned in art/art.json. The script runs
the library's own check, verifies each master against the library's
catalogue, crops it to the figure (the bounding box of its visible pixels),
resizes it to the size art/art.json asks for and writes art/<id>.png. It
then records the master and export digests back into art/art.json.

--check rebuilds in memory and fails if any committed file differs, so a
hand-edited picture or a stale pin is caught. Needs Pillow.

Only cropping and resizing happen here. The drawings library allows
consumers to crop, resize and compose its art; anything that changes a
drawing needs the owner's approval and belongs in the library itself.
"""

import hashlib
import io
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'art'
SPEC = ART / 'art.json'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def export(master_bytes, max_px):
    image = Image.open(io.BytesIO(master_bytes)).convert('RGBA')
    box = image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        image = image.crop(box)
    scale = min(1.0, max_px / max(image.size))
    if scale < 1.0:
        size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        image = image.resize(size, Image.LANCZOS)
    out = io.BytesIO()
    # No metadata, fixed settings: the same master gives the same bytes.
    image.save(out, format='PNG', optimize=True)
    return out.getvalue(), image.size


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    check_only = '--check' in argv
    if len(args) != 1:
        print(__doc__.strip().splitlines()[2].strip())
        return 2
    library = Path(args[0]).resolve()
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    pin = spec['source']['commit']

    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=library, capture_output=True, text=True, check=True).stdout.strip()
    if head != pin:
        print(f'drawings checkout is at {head}, art/art.json pins {pin}', file=sys.stderr)
        return 1
    status = subprocess.run(['git', 'status', '--porcelain'], cwd=library, capture_output=True, text=True, check=True).stdout
    if status.strip():
        print('drawings checkout has local changes; export from a clean checkout', file=sys.stderr)
        return 1
    if '--library-checked' in argv:
        # The library's check assumes POSIX paths and fails on Windows. Pass
        # this only after running `python3 scripts/check.py` in the same
        # checkout under Linux, macOS or WSL.
        print('skipping the drawings check: --library-checked', file=sys.stderr)
    else:
        # UTF-8 mode: the library's check reads its JSON with the default encoding.
        env = dict(os.environ, PYTHONUTF8='1')
        subprocess.run([sys.executable, 'scripts/check.py'], cwd=library, check=True, stdout=subprocess.DEVNULL, env=env)

    catalogue = {c['id']: c for c in json.loads((library / 'catalogue.json').read_text(encoding='utf-8'))['components']}
    collections = {}
    for collection in spec['source']['collections']:
        inventory = (library / collection['path'] / 'inventory.json').read_bytes()
        collections[collection['path']] = sha256(inventory)

    failures = []
    for item in spec['items']:
        component = catalogue.get(item['id'])
        if not component:
            failures.append(f"{item['id']}: not in the drawings catalogue")
            continue
        collection = str(Path(component['file']).parent).replace('\\', '/')
        owner = next((p for p in collections if collection == p or collection.startswith(p + '/')), None)
        if not owner:
            failures.append(f"{item['id']}: collection {collection} is not listed in source.collections")
            continue
        master = (library / component['file']).read_bytes()
        if sha256(master) != component['sha256']:
            failures.append(f"{item['id']}: master does not match the catalogue digest")
            continue
        data, (width, height) = export(master, item['maxPx'])
        target = ART / f"{item['id']}.png"
        record = {
            'master': component['file'],
            'masterSha256': component['sha256'],
            'width': width,
            'height': height,
            'sha256': sha256(data)
        }
        if check_only:
            committed = target.read_bytes() if target.exists() else b''
            if sha256(committed) != record['sha256']:
                failures.append(f"{target.name}: committed file differs from a fresh export")
            for key, value in record.items():
                if item.get(key) != value:
                    failures.append(f"{item['id']}: art.json {key} is {item.get(key)!r}, export gives {value!r}")
        else:
            target.write_bytes(data)
            item.update(record)

    for collection in spec['source']['collections']:
        digest = collections[collection['path']]
        if check_only and collection.get('inventorySha256') != digest:
            failures.append(f"{collection['path']}: inventorySha256 does not match the checkout")
        collection['inventorySha256'] = digest

    if failures:
        print('\n'.join(failures), file=sys.stderr)
        return 1
    if not check_only:
        known = {f"{item['id']}.png" for item in spec['items']}
        for stray in ART.glob('*.png'):
            if stray.name not in known:
                stray.unlink()
        SPEC.write_text(json.dumps(spec, indent=2) + '\n', encoding='utf-8')
        print(f"exported {len(spec['items'])} pictures from drawings {pin[:7]}")
    else:
        print(f"art matches drawings {pin[:7]}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
