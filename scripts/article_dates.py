"""Extract an article's original publication date from the shared byline."""
from datetime import date
from html.parser import HTMLParser
import re


class BylineParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if self.depth:
            self.depth += 1
        elif tag == 'div' and 'dm-article-byline' in dict(attrs).get('class', '').split():
            self.depth = 1

    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1

    def handle_data(self, value):
        if self.depth:
            self.parts.append(value)


def publication_date(source):
    parser = BylineParser()
    parser.feed(source)
    match = re.search(r'(?<!\d)(20\d\d)\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)', ' '.join(parser.parts))
    if not match:
        return None
    try:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3))).isoformat()
    except ValueError:
        return None
