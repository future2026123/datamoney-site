"""Build a static, full-text search index from the published blog articles."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "search" / "index.json"
SKIP_TAGS = {"header", "nav", "aside", "footer", "script", "style", "svg", "noscript"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.in_body = False
        self.skip_depth = 0
        self.title_parts = []
        self.text_parts = []
        self.description = ""
        self.og_title = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            if attrs.get("name", "").lower() == "description":
                self.description = attrs.get("content", "")
            if attrs.get("property", "").lower() == "og:title":
                self.og_title = attrs.get("content", "")
        if tag == "body":
            self.in_body = True
        elif self.in_body:
            if self.skip_depth:
                if tag not in VOID_TAGS:
                    self.skip_depth += 1
            elif tag in SKIP_TAGS or "hidden" in attrs:
                if tag not in VOID_TAGS:
                    self.skip_depth = 1

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if self.in_body and self.skip_depth and tag not in VOID_TAGS:
            self.skip_depth -= 1
        if tag == "body":
            self.in_body = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)
        elif self.in_body and not self.skip_depth and data.strip():
            self.text_parts.append(data.strip())


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def main():
    articles = []
    for path in sorted((ROOT / "blog").glob("*/index.html")):
        parser = ArticleParser()
        parser.feed(path.read_text(encoding="utf-8"))
        title = compact(" ".join(parser.title_parts) or parser.og_title)
        title = re.sub(r"\s*[|｜]\s*(?:데이터머니|DataMoney)\s*$", "", title, flags=re.IGNORECASE)
        text = compact(" ".join(parser.text_parts))
        if not title or not text:
            raise ValueError(f"Missing article title or body: {path}")
        articles.append({
            "path": f"/blog/{path.parent.name}/",
            "title": title,
            "description": compact(parser.description),
            "text": text,
        })
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(articles, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Blog search index: {len(articles)} articles, {OUTPUT.stat().st_size} bytes.")


if __name__ == "__main__":
    main()
