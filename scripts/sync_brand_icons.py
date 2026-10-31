"""Keep every site's browser icon on the current, cache-busted logo."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = "20261031-round"
ICO = re.compile(r'(?P<prefix>href=["\']/favicon\.ico)(?:\?[^"\']*)?(?P<end>["\'])', re.I)
PNG = re.compile(r'(?P<prefix>href=["\']/favicon-48x48\.png)(?:\?[^"\']*)?(?P<end>["\'])', re.I)
ICO_TAG = re.compile(r'<link\b[^>]*href=["\']/favicon\.ico\?[^"\']+["\'][^>]*>', re.I)
PNG_TAG = f'<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v={VERSION}">'


def update(html):
    if not ICO.search(html) and not PNG.search(html):
        return html
    html = ICO.sub(lambda m: f"{m['prefix']}?v={VERSION}{m['end']}", html)
    html = PNG.sub(lambda m: f"{m['prefix']}?v={VERSION}{m['end']}", html)
    if not PNG.search(html):
        html = ICO_TAG.sub(lambda m: m.group(0) + "\n" + PNG_TAG, html, count=1)
    return html


def main():
    paths = sorted(ROOT.rglob("*.html"))
    count = 0
    for path in paths:
        if any(part in {".git", "node_modules"} for part in path.relative_to(ROOT).parts):
            continue
        original = path.read_text(encoding="utf-8")
        changed = update(original)
        if changed != original:
            path.write_text(changed, encoding="utf-8")
            count += 1
    print(f"Browser icons synchronized: {count} pages/templates updated.")


if __name__ == "__main__":
    main()
