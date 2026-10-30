"""Place each blog post's existing home-list thumbnail below its title."""
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree
import html
import struct
import sys

sys.dont_write_bytecode = True
from sync_blog_sidebars import Tree

ROOT = Path(__file__).resolve().parents[1]
START = "<!-- dm-article-thumbnail:start -->"
END = "<!-- dm-article-thumbnail:end -->"


def image_size(path):
    if path.suffix.lower() == ".svg":
        root = ElementTree.parse(path).getroot()
        return int(root.attrib["width"]), int(root.attrib["height"])
    with path.open("rb") as image:
        header = image.read(24)
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            return struct.unpack(">II", header[16:24])
        if not header.startswith(b"\xff\xd8"):
            raise ValueError(f"Unsupported image format: {path}")
        image.seek(2)
        while True:
            byte = image.read(1)
            if not byte:
                break
            if byte != b"\xff":
                continue
            marker = image.read(1)
            while marker == b"\xff":
                marker = image.read(1)
            if not marker:
                break
            code = marker[0]
            if code in (0x01, 0xD8, 0xD9) or 0xD0 <= code <= 0xD7:
                continue
            raw_length = image.read(2)
            if len(raw_length) != 2:
                break
            length = struct.unpack(">H", raw_length)[0]
            if code in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                image.read(1)
                height, width = struct.unpack(">HH", image.read(4))
                return width, height
            if length < 2:
                break
            image.seek(length - 2, 1)
    raise ValueError(f"Image dimensions unavailable: {path}")


def home_thumbnails():
    tree = Tree((ROOT / "blog/index.html").read_text(encoding="utf-8"))
    result = {}
    cards = [node for node in tree.nodes if node.tag == "a" and node.has_class("post-card")
             and node.parent and node.parent.has_class("latest-posts")]
    for card in cards:
        path = urlsplit(card.attrs.get("href", "")).path.rstrip("/")
        if not path.startswith("/blog/"):
            continue
        images = [node for node in tree.nodes if node.tag == "img" and card in node.ancestors()
                  and any(parent.has_class("post-thumb") for parent in node.ancestors())]
        if not images:
            continue
        if len(images) != 1:
            raise ValueError(f"Multiple thumbnails for {path}")
        src = images[0].attrs.get("src", "")
        if not src.startswith("/blog/thumbnails/") or ".." in src:
            raise ValueError(f"Unexpected thumbnail path for {path}: {src}")
        image = ROOT / src.lstrip("/")
        if not image.is_file():
            raise ValueError(f"Missing thumbnail for {path}: {image}")
        result[path + "/"] = (src, *image_size(image))
    return result


def synchronize(path, thumbnail):
    original = path.read_text(encoding="utf-8")
    src, width, height = thumbnail
    figure = (f'{START}\n<figure class="dm-article-thumbnail">'
              f'<img src="{html.escape(src, quote=True)}" width="{width}" height="{height}" '
              f'alt="" decoding="async"></figure>\n{END}')
    if START in original or END in original:
        if original.count(START) != 1 or original.count(END) != 1:
            raise ValueError(f"Invalid thumbnail markers: {path}")
        start = original.index(START)
        end = original.index(END, start) + len(END)
        updated = original[:start] + figure + original[end:]
    else:
        tree = Tree(original)
        headings = [node for node in tree.nodes if node.has_class("dm-article-heading")]
        if len(headings) != 1 or headings[0].end is None:
            raise ValueError(f"Could not find the article title: {path}")
        offset = headings[0].end
        updated = original[:offset] + "\n" + figure + original[offset:]
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def main():
    thumbnails = home_thumbnails()
    changed = 0
    missing = []
    paths = sorted((ROOT / "blog").glob("*/index.html"))
    for path in paths:
        article = f"/blog/{path.parent.name}/"
        if article not in thumbnails:
            missing.append(article)
            continue
        changed += synchronize(path, thumbnails[article])
    print(f"Article thumbnails synchronized: {len(paths) - len(missing)}/{len(paths)} articles, {changed} updated.")
    if missing:
        print("No home-list thumbnail:", ", ".join(missing))


if __name__ == "__main__":
    main()
