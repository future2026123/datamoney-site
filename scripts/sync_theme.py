"""Insert the shared, early theme initializer and stylesheet into site pages."""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INIT_START = '<!-- dm-theme-init:start -->'
INIT_END = '<!-- dm-theme-init:end -->'
STYLE_START = '<!-- dm-theme-style:start -->'
STYLE_END = '<!-- dm-theme-style:end -->'
INIT_BLOCK = re.compile(r'\s*<!-- dm-theme-init:start -->.*?<!-- dm-theme-init:end -->', re.DOTALL)
STYLE_BLOCK = re.compile(r'\s*<!-- dm-theme-style:start -->.*?<!-- dm-theme-style:end -->', re.DOTALL)
HEAD_START = re.compile(r'<head\b[^>]*>', re.IGNORECASE)
HEAD_END = re.compile(r'</head\s*>', re.IGNORECASE)
TOKEN_SCRIPT = re.compile(r'<script>[^<]*dm-investor-result-token[^<]*</script>', re.IGNORECASE)


def asset_version(path):
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:8]


def render(source, js_version=None, css_version=None):
    js_version = js_version or asset_version(ROOT / 'scripts' / 'theme.js')
    css_version = css_version or asset_version(ROOT / 'theme.css')
    source = INIT_BLOCK.sub('', source)
    source = STYLE_BLOCK.sub('', source)
    start = HEAD_START.search(source)
    end = HEAD_END.search(source)
    if not start or not end:
        raise ValueError('A site page is missing its head')
    # Keep the saved-result token removal as the very first script on that page.
    token = TOKEN_SCRIPT.search(source, start.end(), end.start())
    position = token.end() if token else start.end()
    init = f'\n{INIT_START}<script src="/scripts/theme.js?v={js_version}"></script>{INIT_END}'
    source = source[:position] + init + source[position:]
    end = HEAD_END.search(source)
    style = f'\n{STYLE_START}<link rel="stylesheet" href="/theme.css?v={css_version}">{STYLE_END}\n'
    return source[:end.start()] + style + source[end.start():]


def site_pages(root=ROOT):
    paths = [root / 'index.html', root / 'blog' / 'index.html', root / 'tools' / 'index.html',
             root / 'search' / 'index.html', root / 'about' / 'index.html', root / 'privacy' / 'index.html', root / 'contact' / 'index.html',
             root / 'account' / 'result' / 'index.html', root / 'comment-admin' / 'index.html',
             root / 'preview' / 'article-format' / 'index.html', root / 'templates' / 'blog_post.html']
    paths += sorted((root / 'blog').glob('*/index.html'))
    paths += sorted((root / 'tools').glob('*/index.html'))
    paths += sorted((root / 'tools').glob('*/embed.html'))
    return [path for path in paths if path.exists()]


def main():
    js_version = asset_version(ROOT / 'scripts' / 'theme.js')
    css_version = asset_version(ROOT / 'theme.css')
    paths = site_pages()
    changed = 0
    for path in paths:
        original = path.read_text(encoding='utf-8')
        updated = render(original, js_version, css_version)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed += 1
    print(f'Site theme synchronized: {len(paths)} pages/templates, {changed} updated.')


if __name__ == '__main__':
    main()
