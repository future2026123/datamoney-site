"""Build the tag directory from the metadata of published blog articles."""
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "blog" / "tags-index.json"


def clean_tag(value):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value)).strip().lstrip("#").strip()


def tag_key(value):
    return clean_tag(value).casefold()


class ArticleMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title = []
        self.description = ""
        self.tags = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag != "meta":
            return
        name = attrs.get("name", "").lower()
        prop = attrs.get("property", "").lower()
        content = attrs.get("content", "")
        if name == "description":
            self.description = content
        if name in {"dm-tags", "keywords"}:
            self.tags.extend(content.split(","))
        elif prop == "article:tag":
            self.tags.append(content)

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)


class HomeOrder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and "post-card" in attrs.get("class", "").split():
            self.paths.append(attrs.get("href", ""))


def build_index(root=ROOT):
    home = HomeOrder()
    home.feed((root / "blog/index.html").read_text(encoding="utf-8"))
    order = {path: position for position, path in enumerate(home.paths)}
    articles = []
    labels = {}
    counts = Counter()
    for path in sorted((root / "blog").glob("*/index.html")):
        metadata = ArticleMetadata()
        metadata.feed(path.read_text(encoding="utf-8"))
        title = re.sub(r"\s*[|｜]\s*(?:데이터머니|DataMoney)\s*$", "", "".join(metadata.title).strip(), flags=re.I)
        tags = []
        seen = set()
        for raw in metadata.tags:
            value = clean_tag(raw)
            key = tag_key(value)
            if not value or "{{" in value or key in seen:
                continue
            seen.add(key)
            labels.setdefault(key, value)
            tags.append(labels[key])
            counts[key] += 1
        if not title:
            raise ValueError(f"Missing article title: {path}")
        if tags:
            articles.append({"path": f"/blog/{path.parent.name}/", "title": title,
                             "description": metadata.description.strip(), "tags": tags})
        else:
            print(f"No tags yet: {path.relative_to(root)}")
    articles.sort(key=lambda article: (order.get(article["path"], len(order)), article["path"]))
    tags = [{"name": labels[key], "count": count} for key, count in counts.items()]
    tags.sort(key=lambda item: (-item["count"], tag_key(item["name"])))
    return {"articles": articles, "tags": tags}


def main():
    index = build_index()
    OUTPUT.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Blog tags: {len(index['articles'])} articles, {len(index['tags'])} tags, {OUTPUT.stat().st_size} bytes.")


if __name__ == "__main__":
    main()
