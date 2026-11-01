"""Add the administrator-only area label control to public site pages at build time."""
from pathlib import Path
import hashlib
import re
from sync_theme import site_pages

ROOT = Path(__file__).resolve().parents[1]
TAG = re.compile(r'\s*<!-- dm-admin-area-labels:start -->.*?<!-- dm-admin-area-labels:end -->[ \t]*\r?\n?', re.DOTALL)
HEAD_END = re.compile(r'</head\s*>', re.IGNORECASE)


def render(source, version):
    source = TAG.sub('', source)
    end = HEAD_END.search(source)
    if not end:
        raise ValueError('Page is missing its head')
    block = f'\n<!-- dm-admin-area-labels:start --><script src="/scripts/admin-area-labels.js?v={version}" defer></script><!-- dm-admin-area-labels:end -->\n'
    return source[:end.start()] + block + source[end.start():]


def should_include(rel):
    return not rel.startswith(('account/', 'comment-admin/', 'templates/', 'preview/')) and not rel.endswith('/embed.html')


def main():
    asset = ROOT / 'scripts' / 'admin-area-labels.js'
    version = hashlib.sha256(asset.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:8]
    changed = 0
    for path in site_pages():
        rel = path.relative_to(ROOT).as_posix()
        if not should_include(rel):
            continue
        original = path.read_text(encoding='utf-8')
        updated = render(original, version)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed += 1
    print(f'Administrator area labels added to {changed} pages.')


if __name__ == '__main__':
    main()
