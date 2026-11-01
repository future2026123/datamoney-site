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
ARTICLE_ACTIONS_CSS_VERSION = hashlib.sha256((ROOT / "blog" / "article-actions.css").read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
ARTICLE_ACTIONS_JS_VERSION = hashlib.sha256((ROOT / "blog" / "article-actions.js").read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
ARTICLE_SPEECH_JS_VERSION = hashlib.sha256((ROOT / "blog" / "article-speech.js").read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
ARTICLE_ACTIONS_CSS = f'<link rel="stylesheet" href="/blog/article-actions.css?v={ARTICLE_ACTIONS_CSS_VERSION}">'
ARTICLE_ACTIONS_JS = f'<script src="/blog/article-actions.js?v={ARTICLE_ACTIONS_JS_VERSION}" defer></script>'
ARTICLE_SPEECH_JS = f'<script src="/blog/article-speech.js?v={ARTICLE_SPEECH_JS_VERSION}" defer></script>'
RELATED_JS_VERSION = hashlib.sha256((ROOT / "blog" / "related-articles.js").read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
RELATED_JS = f'<script src="/blog/related-articles.js?v={RELATED_JS_VERSION}" defer></script>'
ARTICLE_ACTIONS_CSS_TAG = re.compile(r'''<link\s+rel=["']stylesheet["']\s+href=["']/blog/article-actions\.css(?:\?[^"']*)?["']\s*/?>''', re.IGNORECASE)
ARTICLE_ACTIONS_JS_TAG = re.compile(r'''<script\s+src=["']/blog/article-actions\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', re.IGNORECASE)
ARTICLE_SPEECH_JS_TAG = re.compile(r'''<script\s+src=["']/blog/article-speech\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', re.IGNORECASE)
RELATED_JS_TAG = re.compile(r'''<script\s+src=["']/blog/related-articles\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', re.IGNORECASE)
ARTICLE_TITLE_CSS_VERSION = hashlib.sha256((ROOT / "blog" / "article-title.css").read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
ARTICLE_TITLE_CSS = f'<link rel="stylesheet" href="/blog/article-title.css?v={ARTICLE_TITLE_CSS_VERSION}">'
ARTICLE_TITLE_CSS_TAG = re.compile(r'''<link\s+rel=["']stylesheet["']\s+href=["']/blog/article-title\.css(?:\?[^"']*)?["']\s*/?>''', re.IGNORECASE)
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
        if ARTICLE_TITLE_CSS_TAG.search(updated):
            updated = ARTICLE_TITLE_CSS_TAG.sub(ARTICLE_TITLE_CSS, updated)
        else:
            head_end = HEAD_END.search(updated)
            updated = updated[:head_end.start()] + ARTICLE_TITLE_CSS + "\n" + updated[head_end.start():]
        if ARTICLE_ACTIONS_CSS_TAG.search(updated):
            updated = ARTICLE_ACTIONS_CSS_TAG.sub(ARTICLE_ACTIONS_CSS, updated)
        else:
            head_end = HEAD_END.search(updated)
            updated = updated[:head_end.start()] + ARTICLE_ACTIONS_CSS + "\n" + updated[head_end.start():]
        if ARTICLE_ACTIONS_JS_TAG.search(updated):
            updated = ARTICLE_ACTIONS_JS_TAG.sub(ARTICLE_ACTIONS_JS, updated)
        else:
            head_end = HEAD_END.search(updated)
            updated = updated[:head_end.start()] + ARTICLE_ACTIONS_JS + "\n" + updated[head_end.start():]
        if RELATED_JS_TAG.search(updated):
            updated = RELATED_JS_TAG.sub(RELATED_JS, updated)
        else:
            actions = ARTICLE_ACTIONS_JS_TAG.search(updated)
            updated = updated[:actions.end()] + "\n" + RELATED_JS + updated[actions.end():]
        if ARTICLE_SPEECH_JS_TAG.search(updated):
            updated = ARTICLE_SPEECH_JS_TAG.sub(ARTICLE_SPEECH_JS, updated)
        else:
            actions = ARTICLE_ACTIONS_JS_TAG.search(updated)
            updated = updated[:actions.start()] + ARTICLE_SPEECH_JS + "\n" + updated[actions.start():]
        speech = ARTICLE_SPEECH_JS_TAG.search(updated)
        actions = ARTICLE_ACTIONS_JS_TAG.search(updated)
        if speech.start() > actions.start():
            end = speech.end()
            if updated[end:end + 2] == "\r\n":
                end += 2
            elif updated[end:end + 1] == "\n":
                end += 1
            updated = updated[:speech.start()] + updated[end:]
            actions = ARTICLE_ACTIONS_JS_TAG.search(updated)
            updated = updated[:actions.start()] + ARTICLE_SPEECH_JS + "\n" + updated[actions.start():]
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
    preview_page = ROOT / "preview" / "article-format" / "index.html"
    if preview_page.exists():
        paths.append(preview_page)
    changed = sum(synchronize(path, fragment) for path in paths)
    print(f"Blog navigation synchronized: {len(paths)} pages/templates, {changed} updated.")


if __name__ == "__main__":
    main()
