"""Add non-invented BlogPosting metadata to sitemap-listed articles at build time."""

from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
MARKER = "<!-- DataMoney article schema -->"
END_MARKER = "<!-- End DataMoney article schema -->"


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings = []
        self.in_h1 = False
        self.canonicals = []
        self.other_schema = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h1":
            self.in_h1 = True
            self.headings.append("")
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonicals.append(attrs.get("href", ""))
        if tag == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self.other_schema = True

    def handle_endtag(self, tag):
        if tag == "h1":
            self.in_h1 = False

    def handle_data(self, data):
        if self.in_h1:
            self.headings[-1] += data


def add_schema(path, url):
    content = path.read_text(encoding="utf-8")
    if MARKER in content:
        if content.count(MARKER) != 1 or content.count(END_MARKER) != 1:
            raise ValueError("Unexpected article schema markers: " + str(path))
        start = content.index(MARKER)
        end = content.index(END_MARKER) + len(END_MARKER)
        if content[end:end + 1] == "\n":
            end += 1
        content = content[:start] + content[end:]
    parser = Metadata()
    parser.feed(content)
    if parser.other_schema:
        print("Article schema: existing JSON-LD left unchanged:", path)
        return False
    if parser.canonicals != [url] or len(parser.headings) != 1:
        print("Article schema: skipped; canonical or H1 needs review:", path)
        return False
    headline = " ".join(parser.headings[0].split())
    if not headline:
        print("Article schema: skipped; empty H1:", path)
        return False
    obj = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": headline,
        "mainEntityOfPage": url,
        "publisher": {"@type": "Organization", "name": "데이터머니", "url": "https://datamoney.kr/"},
    }
    encoded = json.dumps(obj, ensure_ascii=False).replace("<", "\\u003c")
    tag = MARKER + '\n<script type="application/ld+json">' + encoded + "</script>\n" + END_MARKER
    updated, count = re.subn(r"</head\s*>", lambda match: tag + "\n" + match.group(), content, count=1, flags=re.I)
    if count != 1:
        raise ValueError("Article head not found: " + str(path))
    if updated == path.read_text(encoding="utf-8"):
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main():
    sitemap = ET.parse(ROOT / "sitemap.xml").getroot()
    namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    urls = [node.text for node in sitemap.findall(".//" + namespace + "loc")]
    articles = []
    for url in urls:
        parsed = urlparse(url)
        parts = parsed.path.strip("/").split("/")
        if parsed.scheme == "https" and parsed.netloc == "datamoney.kr" and len(parts) == 2 and parts[0] == "blog":
            articles.append((ROOT / "blog" / parts[1] / "index.html", url))
    for path, url in articles:
        add_schema(path, url)
    print("Article schema: checked {} sitemap articles".format(len(articles)))


if __name__ == "__main__":
    main()
