"""Keep the static blog pages' navigation in sync with the shared header."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
FRAGMENT = ROOT / "templates" / "blog_header.html"
HEADER_CSS = ROOT / "blog" / "header.css"
CSS_VERSION = hashlib.sha256(HEADER_CSS.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
STYLESHEET = f'<link rel="stylesheet" href="/blog/header.css?v={CSS_VERSION}">'
STYLESHEET_TAG = re.compile(r'''<link\s+rel=["']stylesheet["']\s+href=["']/blog/header\.css(?:\?[^"']*)?["']\s*/?>''', re.IGNORECASE)
ARTICLE_ACTIONS_CSS = '<link rel="stylesheet" href="/blog/article-actions.css?v=20261030-1">'
ARTICLE_ACTIONS_JS = '<script src="/blog/article-actions.js?v=20261030-1" defer></script>'
BODY = re.compile(r"<body\b[^>]*>", re.IGNORECASE)
HEAD_END = re.compile(r"</head\s*>", re.IGNORECASE)
CONTENT = re.compile(r"<(?:main|article)\b", re.IGNORECASE)
HEADER = re.compile(r"<header\b[^>]*>.*?</header\s*>", re.IGNORECASE | re.DOTALL)
ROOT_LINK = re.compile(r"""href\s*=\s*["']/(?:blog/)?["']""", re.IGNORECASE)
OLD_FILTER = re.compile(
    r'\s*<svg aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute">\s*'
    r'<defs>\s*<filter id="logo-cutout".*?</svg>',
    re.IGNORECASE | re.DOTALL,
)


def synchronize(path: Path, fragment: str) -> bool:
    original = path.read_text(encoding="utf-8")
    body = BODY.search(original)
    head_end = HEAD_END.search(original)
    if not body or not head_end:
        raise ValueError(f"Missing head or body: {path}")
    content = CONTENT.search(original, body.end())
    content_start = content.start() if content else len(original)
    candidates = [m for m in HEADER.finditer(original, body.end()) if m.start() < content_start]
    if len(candidates) > 1:
        raise ValueError(f"Multiple headers before content: {path}")

    # Only replace a site header with a home/blog link; keep article headings.
    if candidates and ROOT_LINK.search(candidates[0].group()):
        match = candidates[0]
        updated = original[:match.start()] + fragment + original[match.end():]
    else:
        updated = original[:body.end()] + "\n" + fragment + original[body.end():]

    updated = OLD_FILTER.sub("", updated)
    if STYLESHEET_TAG.search(updated):
        updated = STYLESHEET_TAG.sub(STYLESHEET, updated)
    else:
        head_end = HEAD_END.search(updated)
        updated = updated[:head_end.start()] + STYLESHEET + "\n" + updated[head_end.start():]
    is_article = path.parent.parent == ROOT / "blog" or path == ROOT / "templates" / "blog_post.html"
    if is_article:
        if '/blog/article-actions.css' not in updated:
            head_end = HEAD_END.search(updated)
            updated = updated[:head_end.start()] + ARTICLE_ACTIONS_CSS + "\n" + updated[head_end.start():]
        if '/blog/article-actions.js' not in updated:
            head_end = HEAD_END.search(updated)
            updated = updated[:head_end.start()] + ARTICLE_ACTIONS_JS + "\n" + updated[head_end.start():]
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    fragment = FRAGMENT.read_text(encoding="utf-8").strip()
    paths = [ROOT / "blog" / "index.html", *sorted((ROOT / "blog").glob("*/index.html"))]
    paths.append(ROOT / "templates" / "blog_post.html")
    search_page = ROOT / "search" / "index.html"
    if search_page.exists():
        paths.append(search_page)
    changed = sum(synchronize(path, fragment) for path in paths)
    print(f"Blog navigation synchronized: {len(paths)} pages/templates, {changed} updated.")


if __name__ == "__main__":
    main()
