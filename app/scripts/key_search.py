"""Cloud plan slice 5: looks for an API key in every place Lantern writes, and says only *found* or *not found*.

Run by the user, in their own terminal, with Lantern closed and the key in an environment variable of that terminal
(the agent never sees it). Never prints the key, a part of it, its length, or any file content: only paths and counts.

    python app/scripts/key_search.py --key-env NVIDIA_API_KEY

Searched (CE-70, CE-73, CE-74): the config folder (%APPDATA%\\Lantern: settings.json, state.json, amber-log.jsonl and
their backups), the library (settings' `library`, default Documents\\Lantern: subjects), and the webview's storage
(%LOCALAPPDATA%\\io.github.alexandreprothin.lantern: EBWebView, local storage, caches, logs). Each file is read in
chunks and checked for the key as UTF-8, UTF-16 and percent-encoded text.
"""
import argparse, json, os, sys, urllib.parse
from pathlib import Path

CHUNK = 1 << 20

def forms(key: str) -> list[bytes]:
    out = {key.encode('utf-8'), key.encode('utf-16-le'), urllib.parse.quote(key, safe='').encode('ascii'), urllib.parse.quote(key, safe='').lower().encode('ascii')}
    return [f for f in out if f]

def holds(path: Path, needles: list[bytes]) -> bool | None:
    """True or False, or None when the file cannot be read (Lantern still running, or no access)."""
    keep = max(len(n) for n in needles) - 1
    try:
        with open(path, 'rb') as f:
            tail = b''
            while chunk := f.read(CHUNK):
                block = tail + chunk
                if any(n in block for n in needles): return True
                tail = block[-keep:] if keep else b''
        return False
    except OSError:
        return None

def library_of(config: Path) -> Path:
    try:
        lib = json.loads((config / 'settings.json').read_text(encoding='utf-8')).get('library')
        if isinstance(lib, str) and lib: return Path(lib)
    except (OSError, ValueError):
        pass
    return Path(os.environ.get('USERPROFILE', '~')).expanduser() / 'Documents' / 'Lantern'

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--key-env', required=True, help='name of the environment variable holding the key')
    ap.add_argument('--also', action='append', default=[], help='another folder to search (repeatable)')
    a = ap.parse_args()
    key = os.environ.get(a.key_env, '').strip()
    if len(key) < 8: print(f'{a.key_env} is not set (or too short to search for).'); return 2
    needles = forms(key); del key
    config = Path(os.environ['APPDATA']) / 'Lantern'
    places = {'config': config, 'library': library_of(config),
              'webview': Path(os.environ['LOCALAPPDATA']) / 'io.github.alexandreprothin.lantern', **{f'also {i + 1}': Path(p) for i, p in enumerate(a.also)}}
    found_any = False; unreadable_any = False
    for name, root in places.items():
        if not root.exists(): print(f'{name}: {root} does not exist'); continue
        files = [p for p in root.rglob('*') if p.is_file()] if root.is_dir() else [root]
        found, unreadable = [], []
        for p in files:
            r = holds(p, needles)
            if r: found.append(p)
            elif r is None: unreadable.append(p)
        print(f'{name}: {root}: {len(files)} files, ' + ('FOUND in ' + str(len(found)) if found else 'not found') + (f', {len(unreadable)} unreadable' if unreadable else ''))
        for p in found: print(f'  FOUND: {p}')
        for p in unreadable[:20]: print(f'  unreadable: {p}')
        found_any |= bool(found); unreadable_any |= bool(unreadable)
    print('Result: ' + ('FOUND' if found_any else 'not found') + (' (some files could not be read: close Lantern and run again)' if unreadable_any else ''))
    return 1 if found_any else 0

if __name__ == '__main__':
    sys.exit(main())
