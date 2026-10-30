"""Keep the static blog pages' navigation in sync with the shared header."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FRAGMENT = ROOT / "templates" / "blog_header.html"
STYLESHEET = '<link rel="stylesheet" href="/blog/header.css">'
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
    if STYLESHEET not in updated:
        head_end = HEAD_END.search(updated)
        updated = updated[:head_end.start()] + STYLESHEET + "\n" + updated[head_end.start():]
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    fragment = FRAGMENT.read_text(encoding="utf-8").strip()
    paths = [ROOT / "blog" / "index.html", *sorted((ROOT / "blog").glob("*/index.html"))]
    paths.append(ROOT / "templates" / "blog_post.html")
    changed = sum(synchronize(path, fragment) for path in paths)
    print(f"Blog navigation synchronized: {len(paths)} pages/templates, {changed} updated.")


if __name__ == "__main__":
    main()
