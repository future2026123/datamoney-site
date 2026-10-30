"""Keep site information and privacy links visible across public pages."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
MARKER = b'data-site-info-links="true"'
LINKS = (
    '<span data-site-info-links="true" style="display:block;margin-top:12px;'
    'font-size:14px;line-height:1.8">'
    '<a href="/about/" style="color:inherit;text-decoration:underline">사이트 소개</a>'
    ' <span aria-hidden="true">·</span> '
    '<a href="/privacy/" style="color:inherit;text-decoration:underline">개인정보처리방침</a></span>'
).encode("utf-8")
FOOTER_END = re.compile(br"</footer\s*>", re.IGNORECASE)
BODY_END = re.compile(br"</body\s*>", re.IGNORECASE)


def pages():
    yield ROOT / "index.html"
    for directory in ("blog", "tools", "search"):
        yield from sorted((ROOT / directory).rglob("*.html"))
    yield ROOT / "templates" / "blog_post.html"


def ensure_links(path):
    content = path.read_bytes()
    if MARKER in content:
        if content.count(MARKER) != 1 or b'href="/about/"' not in content or b'href="/privacy/"' not in content:
            raise ValueError("Unexpected site information links in {}".format(path))
        return False
    newline = b"\r\n" if b"\r\n" in content else b"\n"
    footers = list(FOOTER_END.finditer(content))
    if len(footers) > 1:
        raise ValueError("Multiple footers in {}".format(path))
    if footers:
        position = footers[0].start()
        line_start = content.rfind(b"\n", 0, position) + 1
        if not content[line_start:position].strip():
            position = line_start
            added = LINKS + newline
        else:
            added = newline + LINKS + newline
    else:
        bodies = list(BODY_END.finditer(content))
        if len(bodies) != 1:
            raise ValueError("Expected one closing body in {}".format(path))
        position = bodies[0].start()
        added = (b'<footer style="max-width:720px;margin:24px auto;padding:0 16px 24px;'
                 b'color:#52627a">' + LINKS + b'</footer>' + newline)
    path.write_bytes(content[:position] + added + content[position:])
    return True


def main():
    paths = list(pages())
    changed = sum(ensure_links(path) for path in paths)
    print("Site information links: checked {} pages; updated {}".format(len(paths), changed))


if __name__ == "__main__":
    main()
