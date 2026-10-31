"""Synchronize the shared home sidebar across the blog's static layouts."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
FRAGMENT = ROOT / "templates" / "blog_sidebar.html"
START = "<!-- dm-shared-sidebar:start -->"
END = "<!-- dm-shared-sidebar:end -->"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
HEAD_END = re.compile(r"</head\s*>", re.IGNORECASE)


def version(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]


class Node:
    def __init__(self, tag, attrs, start, parent):
        self.tag = tag
        self.attrs = dict(attrs)
        self.start = start
        self.end_start = None
        self.end = None
        self.parent = parent
        self.children = []

    def has_class(self, name):
        return name in self.attrs.get("class", "").split()

    def ancestors(self):
        node = self.parent
        while node:
            yield node
            node = node.parent


class Tree(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.lines = [0]
        for match in re.finditer("\n", text):
            self.lines.append(match.end())
        self.nodes = []
        self.stack = []
        self.feed(text)

    def source_offset(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        parent = self.stack[-1] if self.stack else None
        node = Node(tag, attrs, self.source_offset(), parent)
        if parent:
            parent.children.append(node)
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            node = self.stack.pop()
            node.end_start = node.start
            node.end = node.start + len(self.get_starttag_text())

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index].tag == tag:
                node = self.stack[index]
                node.end_start = self.source_offset()
                close = self.text.find(">", node.end_start)
                node.end = close + 1 if close >= 0 else None
                del self.stack[index:]
                return


def only(items, description, path):
    if len(items) != 1:
        raise ValueError(f"Expected one {description} in {path}, found {len(items)}")
    node = items[0]
    if node.end is None:
        raise ValueError(f"Unclosed {description} in {path}")
    return node


def apply_edits(text, edits):
    for start, end, replacement in sorted(edits, key=lambda edit: edit[0], reverse=True):
        text = text[:start] + replacement + text[end:]
    return text


def place_sidebar(text, path, fragment):
    block = f"{START}\n{fragment}\n{END}"
    if START in text or END in text:
        if text.count(START) != 1 or text.count(END) != 1:
            raise ValueError(f"Invalid shared sidebar markers in {path}")
        start = text.index(START)
        end = text.index(END, start) + len(END)
        return text[:start] + block + text[end:]

    tree = Tree(text)
    existing = [node for node in tree.nodes if node.tag == "aside" and node.has_class("sidebar")]
    if existing:
        sidebar = only(existing, "existing home sidebar", path)
        return apply_edits(text, [(sidebar.start, sidebar.end, block)])

    headings = [node for node in tree.nodes if node.has_class("dm-article-heading")]
    if headings:
        heading = only(headings, "article heading", path)
        ancestors = list(heading.ancestors())
        shell = next((node for node in ancestors if node.has_class("article-shell") or node.has_class("dm-heading-layout")), None)
        if shell:
            sidebars = [node for node in shell.children if node.tag == "aside"]
            if not sidebars:
                if shell.end_start is None:
                    raise ValueError(f"Unclosed article layout in {path}")
                return apply_edits(text, [(shell.end_start, shell.end_start, '\n' + block + '\n')])
            previous = only(sidebars, "article sidebar", path)
            content = next((node for node in ancestors if node.tag in {"article", "main"} and node.has_class("article")), None)
            if not content or content.end_start is None:
                raise ValueError(f"Article body not found in {path}")
            old = text[previous.start:previous.end]
            preserved = f'\n<details class="dm-original-sidebar"><summary>이 글의 참고 정보</summary>{old}</details>\n'
            return apply_edits(text, [(previous.start, previous.end, block), (content.end_start, content.end_start, preserved)])

        page = next((node for node in ancestors if node.has_class("dm-article-page")), None)
        if page:
            if page.end is None:
                raise ValueError(f"Unclosed article page in {path}")
            edits = [(page.start, page.start, '<div class="dm-sidebar-shell">\n'),
                     (page.end, page.end, '\n' + block + '\n</div>')]
            inner_side = [node for node in tree.nodes if node.tag == "aside" and page in node.ancestors()]
            if inner_side:
                previous = only(inner_side, "inner article sidebar", path)
                mains = [node for node in tree.nodes if node.tag == "main" and page in node.ancestors()]
                content = only(mains, "inner article body", path)
                old = text[previous.start:previous.end]
                preserved = f'\n<details class="dm-original-sidebar"><summary>이 글의 참고 정보</summary>{old}</details>\n'
                edits += [(previous.start, previous.end, ""), (content.end_start, content.end_start, preserved)]
            return apply_edits(text, edits)

        article = next((node for node in ancestors if node.tag == "article"), None)
        if article and article.end is not None:
            return apply_edits(text, [(article.start, article.start, '<div class="dm-sidebar-shell">\n'),
                                      (article.end, article.end, '\n' + block + '\n</div>')])

    posts = [node for node in tree.nodes if node.tag == "article" and node.has_class("dm-post")]
    if posts:
        post = only(posts, "post template", path)
        return apply_edits(text, [(post.start, post.start, '<div class="dm-sidebar-shell">\n'),
                                  (post.end, post.end, '\n' + block + '\n</div>')])
    raise ValueError(f"Unsupported blog layout: {path}")


def ensure_asset(text, pattern, tag):
    regex = re.compile(pattern, re.IGNORECASE)
    if regex.search(text):
        return regex.sub(lambda _: tag, text)
    end = HEAD_END.search(text)
    if not end:
        raise ValueError("Missing closing head")
    return text[:end.start()] + tag + "\n" + text[end.start():]


def synchronize(path, fragment):
    original = path.read_text(encoding="utf-8")
    updated = place_sidebar(original, path, fragment)
    updated = re.sub(r'(?m)^[ \t]+(?=\n<details class="dm-original-sidebar">)', "", updated)
    updated = re.sub(r'(?m)^[ \t]+(?=\n\s*<main\b)', "", updated)
    css = f'<link rel="stylesheet" href="/blog/sidebar.css?v={version(ROOT / "blog/sidebar.css")}">'
    popular = f'<script src="/scripts/popular-posts.js?v={version(ROOT / "scripts/popular-posts.js")}" defer></script>'
    quotes = f'<script src="/scripts/investment-quotes.js?v={version(ROOT / "scripts/investment-quotes.js")}" defer></script>'
    tags = f'<script src="/scripts/blog-tags.js?v={version(ROOT / "scripts/blog-tags.js")}" defer></script>'
    updated = ensure_asset(updated, r'''<link\s+rel=["']stylesheet["']\s+href=["']/blog/sidebar\.css(?:\?[^"']*)?["']\s*/?>''', css)
    updated = ensure_asset(updated, r'''<script\s+src=["']/scripts/popular-posts\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', popular)
    updated = ensure_asset(updated, r'''<script\s+src=["']/scripts/investment-quotes\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', quotes)
    updated = ensure_asset(updated, r'''<script\s+src=["']/scripts/blog-tags\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', tags)
    if path != ROOT / "blog/index.html":
        sticky = f'<script src="/scripts/sticky-article-sidebar.js?v={version(ROOT / "scripts/sticky-article-sidebar.js")}" defer></script>'
        updated = ensure_asset(updated, r'''<script\s+src=["']/scripts/sticky-article-sidebar\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', sticky)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def main():
    fragment = FRAGMENT.read_text(encoding="utf-8").strip()
    paths = [ROOT / "blog/index.html", *sorted((ROOT / "blog").glob("*/index.html")), ROOT / "templates/blog_post.html"]
    preview = ROOT / "preview/article-format/index.html"
    if preview.exists():
        paths.append(preview)
    changed = sum(synchronize(path, fragment) for path in paths)
    print(f"Blog sidebars synchronized: {len(paths)} pages/templates, {changed} updated.")


if __name__ == "__main__":
    main()
