import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_blog_tags import build_index, tag_key


class BlogTagsTests(unittest.TestCase):
    def test_existing_keywords_are_combined_and_deduplicated_per_article(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            blog = root / "blog"
            (blog / "a").mkdir(parents=True)
            (blog / "b").mkdir()
            (blog / "index.html").write_text('<a class="post-card" href="/blog/b/"></a><a class="post-card" href="/blog/a/"></a>', encoding="utf-8")
            (blog / "a/index.html").write_text(
                '<title>A | 데이터머니</title><meta name="description" content="A &amp; B">'
                '<meta name="dm-tags" content="ETF, 복리"><meta name="keywords" content="ｅｔｆ, 절세">'
                '<meta property="article:tag" content="S&amp;P 500">', encoding="utf-8")
            (blog / "b/index.html").write_text('<title>B | DataMoney</title><meta name="dm-tags" content="etf, 장기투자">', encoding="utf-8")
            data = build_index(root)
        self.assertEqual([a["path"] for a in data["articles"]], ["/blog/b/", "/blog/a/"])
        article = data["articles"][1]
        self.assertEqual(article["title"], "A")
        self.assertEqual(article["description"], "A & B")
        self.assertEqual([tag_key(t) for t in article["tags"]], ["etf", "복리", "절세", "s&p 500"])
        self.assertEqual(next(t["count"] for t in data["tags"] if tag_key(t["name"]) == "etf"), 2)

    def test_all_current_articles_have_reachable_tags(self):
        data = build_index()
        articles = list((ROOT / "blog").glob("*/index.html"))
        self.assertEqual(len(data["articles"]), len(articles))
        self.assertTrue(all(article["tags"] for article in data["articles"]))
        self.assertTrue(all("{{" not in tag["name"] for tag in data["tags"]))


if __name__ == "__main__":
    unittest.main()
