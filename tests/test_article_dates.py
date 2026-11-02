import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from article_dates import publication_date
from build_blog_tags import build_index

class ArticleDatesTests(unittest.TestCase):
    def test_uses_original_byline_date_instead_of_revision(self):
        source = '<div class="dm-article-byline"><span>2026. 04. 14.</span><span>수정 2026. 10. 31.</span></div>'
        self.assertEqual(publication_date(source), '2026-04-14')
        self.assertIsNone(publication_date('<div class="dm-article-byline">2026. 02. 30.</div>'))
        self.assertIsNone(publication_date('<p>2026. 04. 14.</p>'))

    def test_existing_tagged_articles_have_dates_from_bylines(self):
        data = build_index()
        for article in data['articles']:
            path = ROOT / article['path'].lstrip('/') / 'index.html'
            self.assertEqual(article.get('publishedAt'), publication_date(path.read_text(encoding='utf-8')))
            self.assertIsNotNone(article.get('publishedAt'), article['path'])

if __name__ == '__main__': unittest.main()
