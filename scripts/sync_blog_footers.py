"""Keep the blog's site footer consistent without removing article notes."""
from pathlib import Path
import hashlib
import re
import sys

sys.dont_write_bytecode = True
from sync_blog_sidebars import Tree, apply_edits

ROOT = Path(__file__).resolve().parents[1]
FRAGMENT = ROOT / "templates" / "blog_footer.html"
CSS = ROOT / "blog" / "footer.css"
TOP_SCRIPT = ROOT / "scripts" / "back-to-top.js"
START = "<!-- dm-shared-footer:start -->"
END = "<!-- dm-shared-footer:end -->"
HEAD_END = re.compile(r"</head\s*>", re.IGNORECASE)
CSS_TAG = re.compile(r'''<link\s+rel=["']stylesheet["']\s+href=["']/blog/footer\.css(?:\?[^"']*)?["']\s*/?>''', re.IGNORECASE)
TOP_SCRIPT_TAG = re.compile(r'''<script\s+src=["']/scripts/back-to-top\.js(?:\?[^"']*)?["']\s+defer\s*></script\s*>''', re.IGNORECASE)


def footer_destination(tree, path):
    bodies = [node for node in tree.nodes if node.tag == "body"]
    if len(bodies) != 1 or bodies[0].end_start is None:
        raise ValueError(f"Missing or ambiguous body: {path}")
    body = bodies[0]
    wrappers = [node for node in body.children if node.has_class("wrap")]
    if len(wrappers) > 1:
        raise ValueError(f"Multiple outer wrappers: {path}")
    destination = wrappers[0] if wrappers else body
    if destination.end_start is None:
        raise ValueError(f"Unclosed footer container: {path}")
    return destination.end_start


def footer_insertion(source, position, block):
    line_start = source.rfind("\n", 0, position) + 1
    if not source[line_start:position].strip():
        return line_start, block + "\n"
    return position, "\n" + block + "\n"


def synchronize(path, fragment):
    original = path.read_text(encoding="utf-8")
    block = f"{START}\n{fragment}\n{END}"
    if START in original or END in original:
        if original.count(START) != 1 or original.count(END) != 1:
            raise ValueError(f"Invalid shared footer markers: {path}")
        start = original.index(START)
        end = original.index(END, start) + len(END)
        updated = original[:start] + block + original[end:]
    else:
        tree = Tree(original)
        footers = [node for node in tree.nodes if node.tag == "footer"]
        if len(footers) > 1:
            raise ValueError(f"Multiple existing footers: {path}")
        if footers:
            footer = footers[0]
            if footer.end is None or footer.end_start is None:
                raise ValueError(f"Unclosed footer: {path}")
            if any(node.tag in {"article", "main"} for node in footer.ancestors()):
                # Some older pages used <footer> for a source or article note.
                # Keep that content in the article and put the site footer outside.
                open_end = original.find(">", footer.start)
                if open_end < 0:
                    raise ValueError(f"Invalid footer tag: {path}")
                note = '<div class="dm-article-note">' + original[open_end + 1:footer.end_start] + '</div>'
                destination, insertion = footer_insertion(original, footer_destination(tree, path), block)
                updated = apply_edits(original, [(footer.start, footer.end, note),
                                                 (destination, destination, insertion)])
            else:
                updated = original[:footer.start] + block + original[footer.end:]
        else:
            destination, insertion = footer_insertion(original, footer_destination(tree, path), block)
            updated = original[:destination] + insertion + original[destination:]

    version = hashlib.sha256(CSS.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
    stylesheet = f'<link rel="stylesheet" href="/blog/footer.css?v={version}">'
    if CSS_TAG.search(updated):
        updated = CSS_TAG.sub(stylesheet, updated)
    else:
        head_end = HEAD_END.search(updated)
        if not head_end:
            raise ValueError(f"Missing closing head: {path}")
        updated = updated[:head_end.start()] + stylesheet + "\n" + updated[head_end.start():]
    script_version = hashlib.sha256(TOP_SCRIPT.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
    script = f'<script src="/scripts/back-to-top.js?v={script_version}" defer></script>'
    if TOP_SCRIPT_TAG.search(updated):
        updated = TOP_SCRIPT_TAG.sub(script, updated)
    else:
        head_end = HEAD_END.search(updated)
        if not head_end:
            raise ValueError(f"Missing closing head: {path}")
        updated = updated[:head_end.start()] + script + "\n" + updated[head_end.start():]
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main():
    fragment = FRAGMENT.read_text(encoding="utf-8").strip()
    paths = [ROOT / "blog/index.html", *sorted((ROOT / "blog").glob("*/index.html")), ROOT / "templates/blog_post.html"]
    paths.append(ROOT / "tools/index.html")
    preview = ROOT / "preview/article-format/index.html"
    if preview.exists():
        paths.append(preview)
    changed = sum(synchronize(path, fragment) for path in paths)
    print(f"Blog footers synchronized: {len(paths)} pages/templates, {changed} updated.")


if __name__ == "__main__":
    main()
