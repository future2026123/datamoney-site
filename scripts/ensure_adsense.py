"""Keep the site's HTML pages ready for Google AdSense Auto ads."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
PUBLISHER_ID = "ca-pub-6705155374292160"
AD_SCRIPT = (
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/'
    'adsbygoogle.js?client=' + PUBLISHER_ID + '" crossorigin="anonymous"></script>'
).encode("ascii")
HEAD_CLOSE = re.compile(br"</head\s*>", re.IGNORECASE)
HEAD_OPEN = re.compile(br"<head(?:\s[^>]*)?>", re.IGNORECASE)


def site_pages():
    yield ROOT / "index.html"
    for directory in ("blog", "tools"):
        yield from sorted((ROOT / directory).rglob("*.html"))
    yield ROOT / "templates" / "blog_post.html"


def add_script(path):
    content = path.read_bytes()
    starts = list(HEAD_OPEN.finditer(content))
    ends = list(HEAD_CLOSE.finditer(content))
    if len(starts) != 1 or len(ends) != 1 or starts[0].end() > ends[0].start():
        raise ValueError("Expected one head element in {}".format(path))

    if b"adsbygoogle.js" in content:
        head = content[starts[0].end():ends[0].start()]
        if content.count(b"adsbygoogle.js") != 1 or AD_SCRIPT not in head:
            raise ValueError("Unexpected AdSense loader in {}".format(path))
        return False

    position = ends[0].start()
    newline = b"\r\n" if b"\r\n" in content else b"\n"
    path.write_bytes(content[:position] + AD_SCRIPT + newline + content[position:])
    return True


def main():
    pages = list(site_pages())
    updated = sum(add_script(path) for path in pages)
    print("AdSense: checked {} pages; updated {}".format(len(pages), updated))


if __name__ == "__main__":
    main()
