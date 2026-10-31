"""Build the speech text for each article from the current published HTML.

The text is split by block first so editing one paragraph does not invalidate
unrelated audio. No audio or paid service is used by this build step.
"""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

from sync_blog_sidebars import Tree, VOID

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "blog" / "speech-manifests"
READABLE = {"p", "li", "h2", "h3", "h4", "blockquote", "th", "td"}
NESTED = {"li", "blockquote", "td", "th"}
SKIP_TAGS = {"aside", "nav", "script", "style", "svg", "noscript", "iframe", "figcaption"}
SKIP_CLASSES = {
    "dm-article-heading", "dm-comments", "dm-original-sidebar", "dm-references",
    "eyebrow",
    "references", "reference-list", "references-list", "sources", "source-list",
    "sources-box", "source-box", "bibliography",
}
REFERENCE_HEADING = re.compile(
    r"^(?:참고\s*(?:자료|문헌|출처)|(?:(?:주요|자료|데이터)\s*)*출처|references?|sources?)\s*[:：]?$",
    re.IGNORECASE,
)
REFERENCE_PREFIX = re.compile(r"^(?:자료\s*출처|출처|자료)\s*[:：]")
REFERENCE_PARAGRAPH = re.compile(r"^\s*\[\d+\]")
SOURCE_INTRO = re.compile(r"^(?:본|이)\s*글은\s+.+?근거로\s*작성한\s*일반\s*정보\s*자료입니다\.\s*")
SOURCE_DISCLAIMER = re.compile(r"(?<=[.!?])\s+((?:본|이)\s*글은\s*정보\s*제공.*)$")
SOURCE_LIMITATION = re.compile(r"(?:자료|원문|수치).*(?:확인\s*중|미확인)")
SOURCE_CITATION_END = re.compile(r"\(\d{4}\)\.\s*(.*)$")
SOURCE_LINK_LABEL = re.compile(r"(?:^|\s+)(?:DOI|논문|원문(?:\s*보기)?|자료(?:\s*보기)?|링크)\s*[↗→]?\s*$", re.IGNORECASE)
MAX_CHARS = 120
VOICE_PROFILE_ID = "female-v1"
SUPPORTED_VOICE_PROFILES = {VOICE_PROFILE_ID, "ko-KR-InJoonNeural-v1"}


class VoiceProfile(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.values = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and (attrs.get("name") or "").lower() == "dm-speech-voice":
            self.values.append((attrs.get("content") or "").strip())


def voice_profile(source):
    parser = VoiceProfile()
    parser.feed(source)
    if len(parser.values) > 1:
        raise ValueError("Duplicate article speech voice declarations")
    voice = parser.values[0] if parser.values else VOICE_PROFILE_ID
    if voice not in SUPPORTED_VOICE_PROFILES:
        raise ValueError(f"Unsupported article speech voice: {voice}")
    return voice


def has_class(node, name):
    return name in (node.attrs.get("class") or "").split()


def excluded(node):
    attrs = node.attrs
    classes = set((attrs.get("class") or "").split())
    style = re.sub(r"\s+", "", (attrs.get("style") or "").lower())
    return (node.tag in SKIP_TAGS or "hidden" in attrs or
            (attrs.get("aria-hidden") or "").lower() == "true" or
            "display:none" in style or bool(classes & SKIP_CLASSES))


class TextOnly(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        style = re.sub(r"\s+", "", (attrs.get("style") or "").lower())
        skip = (tag in SKIP_TAGS or "hidden" in attrs or
                (attrs.get("aria-hidden") or "").lower() == "true" or
                "display:none" in style or bool(classes & SKIP_CLASSES))
        if self.skip_depth or skip:
            if tag not in VOID:
                self.skip_depth += 1
            return
        if tag in {"br", "p", "li", "ul", "ol", "div"}:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if self.skip_depth:
            self.skip_depth -= 1
        elif tag in {"p", "li", "ul", "ol", "div"}:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(data)


def node_text(node, source):
    if node.end is None:
        raise ValueError(f"Unclosed <{node.tag}> element")
    parser = TextOnly()
    parser.feed(source[node.start:node.end])
    return re.sub(r"\s+", " ", "".join(parser.parts)).strip()


def reference_nodes(nodes, content, source):
    """Find unwrapped reference headings and their lists without hiding later prose."""
    result = set()
    for heading in nodes:
        parent = heading.parent
        if parent is None or content not in heading.ancestors() or heading.end is None:
            continue
        source_box_heading = heading.tag == "p" and has_class(parent, "source")
        if heading.tag not in {"h2", "h3", "h4"} and not source_box_heading:
            continue
        if not REFERENCE_HEADING.fullmatch(node_text(heading, source)):
            continue
        result.add(heading)
        siblings = parent.children
        found_entry = False
        for sibling in siblings[siblings.index(heading) + 1:]:
            if sibling.tag in {"ul", "ol"}:
                result.add(sibling)
            elif sibling.tag == "p" and sibling.end is not None and (
                REFERENCE_PARAGRAPH.match(node_text(sibling, source)) or
                (source_box_heading and not found_entry)
            ):
                result.add(sibling)
            else:
                break
            found_entry = True
    return result


def readable_source_paragraph(text):
    """Keep a separate disclaimer when a source list and disclaimer share a paragraph."""
    if REFERENCE_PREFIX.match(text):
        disclaimer = SOURCE_DISCLAIMER.search(text)
        if disclaimer:
            return disclaimer.group(1)
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return " ".join(sentence for sentence in sentences[1:] if SOURCE_LIMITATION.search(sentence))
    return SOURCE_INTRO.sub("", text, count=1)


def readable_citation(text):
    """Discard the citation while keeping any explanation following its year."""
    match = SOURCE_CITATION_END.search(text)
    return SOURCE_LINK_LABEL.sub("", match.group(1)).strip() if match else ""


def article_parts(source):
    tree = Tree(source)
    nodes = tree.nodes
    headings = [n for n in nodes if has_class(n, "dm-article-heading")]
    title = next((n for n in nodes if n.tag == "h1" and any(h in n.ancestors() for h in headings)), None)
    if title is None:
        title = next((n for n in nodes if n.tag == "h1" and any(a.tag == "article" and has_class(a, "dm-post") for a in n.ancestors())), None)
    selectors = (
        lambda n: n.tag == "main" and n.parent is not None and has_class(n.parent, "content-grid"),
        lambda n: n.tag == "article" and has_class(n, "article"),
        lambda n: n.tag == "main" and has_class(n, "article"),
        lambda n: n.tag == "main" and has_class(n, "dm-article-page"),
        lambda n: n.tag == "article",
        lambda n: n.tag == "main" and has_class(n, "paper"),
    )
    content = next((found for predicate in selectors if (found := next((n for n in nodes if predicate(n)), None))), None)
    if title is None or content is None:
        raise ValueError("Article title or content not found")
    parts = [node_text(title, source)]
    references = reference_nodes(nodes, content, source)
    for node in nodes:
        if node.tag not in READABLE:
            continue
        ancestors = list(node.ancestors())
        if (content not in ancestors or excluded(node) or node in references or
                any(excluded(parent) or parent in references for parent in ancestors)):
            continue
        if any(parent.tag in NESTED for parent in ancestors):
            continue
        text = node_text(node, source)
        if node.tag == "p":
            if has_class(node, "source-citation"):
                text = readable_citation(text)
            elif has_class(node, "source") or REFERENCE_PREFIX.match(text):
                text = readable_source_paragraph(text)
        if text:
            parts.append(text)
    if not parts[0] or len(parts) < 2:
        raise ValueError("Article has no title or readable content")
    return parts


def split_block(text):
    words = text.split()
    chunks, current = [], ""
    for word in words:
        while len(word) > MAX_CHARS:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(word[:MAX_CHARS])
            word = word[MAX_CHARS:]
        candidate = (current + " " + word).strip()
        if current and len(candidate) > MAX_CHARS:
            chunks.append(current)
            current = word
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def build_manifest(source):
    parts = article_parts(source)
    voice = voice_profile(source)
    chunks = []
    for part in parts:
        for value in split_block(part):
            digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
            chunks.append({"id": digest, "text": value})
    # The public player only accepts an audio file generated from these exact
    # readable blocks. A harmless HTML/style edit does not invalidate it.
    fingerprint = hashlib.sha256(
        (voice + "\n" + "\n".join(item["id"] for item in chunks)).encode("utf-8")
    ).hexdigest()
    return {"version": 1, "voice": voice, "content_id": fingerprint,
            "title": parts[0], "chunks": chunks}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    paths = sorted((ROOT / "blog").glob("*/index.html"))
    for path in paths:
        manifest = build_manifest(path.read_text(encoding="utf-8"))
        target = OUTPUT / (path.parent.name + ".json")
        # The player only needs the fingerprint; article text stays in the page.
        public = {key: manifest[key] for key in ("version", "voice", "content_id")}
        target.write_text(json.dumps(public, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Speech manifests: {len(paths)} articles")


if __name__ == "__main__":
    main()
