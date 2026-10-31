"""Protect the requested text format for source excerpts.

Some unrelated older articles contain existing captures; their exact assets are
listed separately until their original instructions can be reviewed. A visual
chart belongs in its own figure, not inside a text excerpt.
"""
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / 'tests' / 'source_excerpt_legacy_images.json'
VOID = frozenset(('area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                  'link', 'meta', 'param', 'source', 'track', 'wbr'))


class ExcerptParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.excerpts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get('class', '').split())
        current = self.stack[-1][1] if self.stack else None
        if 'source-excerpt' in classes:
            current = {'images': [], 'quote': False, 'translation': False, 'link': False}
            self.excerpts.append(current)
        if current is not None:
            if tag == 'img':
                current['images'].append(attrs.get('src', ''))
            if tag == 'blockquote' and 'research-excerpt' in classes:
                current['quote'] = True
            if 'translation' in classes:
                current['translation'] = True
            if tag == 'a' and attrs.get('href', '').startswith(('http://', 'https://')):
                current['link'] = True
        if tag not in VOID:
            self.stack.append((tag, current))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                return


def read_excerpts(source):
    parser = ExcerptParser()
    parser.feed(source)
    return parser.excerpts


class SourceExcerptFormatTests(unittest.TestCase):
    def test_parser_detects_nested_images_but_allows_a_separate_chart(self):
        source = '''<figure class="dm-market-chart"><img src="/chart.png"></figure>
            <figure class="source-figure source-excerpt"><a><img src="/quote.png"/></a>
            <blockquote class="research-excerpt"><p>Original sentence.</p></blockquote>
            <p class="translation">번역</p><figcaption><a href="https://example.com">원문</a></figcaption></figure>'''
        excerpts = read_excerpts(source)
        self.assertEqual(len(excerpts), 1)
        self.assertEqual(excerpts[0]['images'], ['/quote.png'])
        self.assertTrue(excerpts[0]['quote'] and excerpts[0]['translation'] and excerpts[0]['link'])

    def test_no_new_or_changed_images_inside_text_excerpts(self):
        baseline = json.loads(LEGACY.read_text(encoding='utf-8'))['entries']
        allowed = Counter((entry['article'], entry['src'], entry['sha256']) for entry in baseline)
        found = Counter()
        for page in sorted((ROOT / 'blog').glob('*/index.html')):
            article = page.relative_to(ROOT).as_posix()
            for excerpt in read_excerpts(page.read_text(encoding='utf-8')):
                for src in excerpt['images']:
                    # Local, existing assets are expected for the legacy exceptions.
                    asset = ROOT / src.lstrip('/') if src.startswith('/') else None
                    digest = hashlib.sha256(asset.read_bytes()).hexdigest() if asset and asset.is_file() else 'missing-or-external'
                    found[(article, src, digest)] += 1
        unexpected = found - allowed
        self.assertFalse(unexpected,
            'Text excerpts must use typed original text and a translation; place real charts in separate figures. '
            'Existing exceptions are limited to the exact prior files. New screenshot exceptions require an explicit user request. '
            f'Unexpected excerpt images: {list(unexpected.elements())}')

    def test_requested_articles_and_template_use_text_and_translation(self):
        paths = {
            'blog/investing-when-you-cannot-endure-loss/index.html': 6,
            'blog/trading-loss-investor-psychology/index.html': 5,
            'templates/blog_source_excerpt.html': 1,
        }
        for name, minimum in paths.items():
            with self.subTest(path=name):
                excerpts = read_excerpts((ROOT / name).read_text(encoding='utf-8'))
                self.assertGreaterEqual(len(excerpts), minimum)
                for excerpt in excerpts:
                    self.assertFalse(excerpt['images'], name)
                    self.assertTrue(excerpt['quote'], name)
                    self.assertTrue(excerpt['translation'], name)
                    # The template contains placeholders rather than literal URLs.
                    if not name.startswith('templates/'):
                        self.assertTrue(excerpt['link'], name)


if __name__ == '__main__':
    unittest.main()
