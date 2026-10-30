"""Install the DataMoney Google Analytics tag on published content pages."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
MEASUREMENT_ID = b"G-91YCD2SBLM"
MARKER = b"<!-- DataMoney Google Analytics -->"
TAG = b"""<!-- DataMoney Google Analytics -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'region': ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH','AX','GF','GP','MQ','RE','YT','MF'],
    'wait_for_update': 500
  });
  gtag('js', new Date());
  gtag('config', 'G-91YCD2SBLM');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-91YCD2SBLM"></script>
<!-- End DataMoney Google Analytics -->"""
HEAD_OPEN = re.compile(br"<head(?:\s[^>]*)?>", re.IGNORECASE)
HEAD_CLOSE = re.compile(br"</head\s*>", re.IGNORECASE)


def site_pages():
    yield ROOT / "index.html"
    for directory in ("blog", "tools"):
        yield from sorted((ROOT / directory).rglob("*.html"))
    yield ROOT / "templates" / "blog_post.html"


def add_tag(path):
    content = path.read_bytes()
    starts = list(HEAD_OPEN.finditer(content))
    ends = list(HEAD_CLOSE.finditer(content))
    if len(starts) != 1 or len(ends) != 1 or starts[0].end() > ends[0].start():
        raise ValueError("Expected one head element in {}".format(path))
    head = content[starts[0].end():ends[0].start()]
    if MARKER in content:
        if head.count(MARKER) != 1 or content.count(MEASUREMENT_ID) != 2:
            raise ValueError("Unexpected Google Analytics tag in {}".format(path))
        return False
    if MEASUREMENT_ID in content:
        raise ValueError("Existing Google Analytics tag needs review in {}".format(path))
    newline = b"\r\n" if b"\r\n" in content else b"\n"
    tag = TAG.replace(b"\n", newline)
    position = starts[0].end()
    path.write_bytes(content[:position] + newline + tag + content[position:])
    return True


def main():
    pages = list(site_pages())
    updated = sum(add_tag(path) for path in pages)
    print("Google Analytics: checked {} pages; updated {}".format(len(pages), updated))


if __name__ == "__main__":
    main()
