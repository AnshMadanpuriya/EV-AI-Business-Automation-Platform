"""Publish a complete vector index through an atomic manifest, preserving the old index."""
import json
import os
from pathlib import Path
from uuid import uuid4


def active_index(root):
    root = Path(root).resolve()
    try:
        manifest = json.loads((root / 'active-index.json').read_text(encoding='utf-8'))
        candidate = (root / manifest['directory']).resolve()
        if manifest.get('version') == 1 and candidate.is_relative_to(root / 'indexes') and (candidate / 'chroma.sqlite3').is_file():
            return candidate
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return root  # Compatible with the original chroma_db layout.


def new_index(root):
    path = Path(root) / 'indexes' / uuid4().hex
    path.mkdir(parents=True)
    return path


def publish_index(root, candidate):
    root, candidate = Path(root).resolve(), Path(candidate).resolve()
    if not candidate.is_relative_to(root / 'indexes') or not (candidate / 'chroma.sqlite3').is_file():
        raise ValueError('A complete index inside the managed indexes folder is required')
    temporary = root / ('manifest-' + uuid4().hex + '.tmp')
    temporary.write_text(json.dumps({'version': 1, 'directory': candidate.relative_to(root).as_posix()}), encoding='utf-8')
    os.replace(temporary, root / 'active-index.json')
