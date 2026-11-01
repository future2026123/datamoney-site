"""Add the site-wide inquiry form assets to public pages."""
import hashlib
import re
from pathlib import Path
from sync_theme import site_pages

ROOT = Path(__file__).resolve().parents[1]
BLOCK = re.compile(r'\s*<!-- dm-contact:start -->.*?<!-- dm-contact:end -->[ \t]*(?:\r?\n)?', re.DOTALL)
HEAD_END = re.compile(r'</head\s*>', re.IGNORECASE)


def version(path):
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:8]


def render(source, js_version, css_version):
    source = BLOCK.sub('', source)
    end = HEAD_END.search(source)
    if not end:
        raise ValueError('A site page is missing its head')
    block = (f'\n<!-- dm-contact:start --><link rel="stylesheet" href="/contact.css?v={css_version}">'
             f'<script src="/scripts/contact.js?v={js_version}" defer></script><!-- dm-contact:end -->\n')
    return source[:end.start()] + block + source[end.start():]


def main():
    js = version(ROOT / 'scripts/contact.js')
    css = version(ROOT / 'contact.css')
    paths = [path for path in site_pages() if path != ROOT / 'comment-admin/index.html']
    changed = 0
    for path in paths:
        original = path.read_text(encoding='utf-8')
        updated = render(original, js, css)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed += 1
    print(f'Site inquiries synchronized: {len(paths)} pages/templates, {changed} updated.')


if __name__ == '__main__':
    main()
