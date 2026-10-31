import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parent.parent / "scripts" / "ensure_article_schema.py"
spec = importlib.util.spec_from_file_location("article_schema", MODULE)
schema = importlib.util.module_from_spec(spec)
spec.loader.exec_module(schema)
URL = "https://datamoney.kr/blog/example/"


class ArticleSchemaTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "index.html"

    def tearDown(self):
        self.directory.cleanup()

    def write(self, head="", body="<h1>제목 &amp; 설명</h1>"):
        self.path.write_text("<html><head>" + head + "</head><body>" + body + "</body></html>", encoding="utf-8")

    def test_matching_article_is_idempotent_and_uses_visible_title(self):
        self.write('<link rel="canonical" href="' + URL + '">')
        self.assertTrue(schema.add_schema(self.path, URL))
        first = self.path.read_text(encoding="utf-8")
        self.assertFalse(schema.add_schema(self.path, URL))
        self.assertEqual(first, self.path.read_text(encoding="utf-8"))
        data = first.split('<script type="application/ld+json">', 1)[1].split("</script>", 1)[0]
        self.assertEqual(json.loads(data)["headline"], "제목 & 설명")
        self.assertEqual(json.loads(data)["mainEntityOfPage"], URL)

    def test_wrong_canonical_is_not_written(self):
        self.write('<link rel="canonical" href="https://example.com/">')
        before = self.path.read_bytes()
        self.assertFalse(schema.add_schema(self.path, URL))
        self.assertEqual(before, self.path.read_bytes())

    def test_existing_jsonld_is_preserved(self):
        self.write('<link rel="canonical" href="' + URL + '"><script type="application/ld+json">{}</script>')
        before = self.path.read_bytes()
        self.assertFalse(schema.add_schema(self.path, URL))
        self.assertEqual(before, self.path.read_bytes())

    def test_headline_cannot_close_the_script(self):
        self.write('<link rel="canonical" href="' + URL + '">', "<h1>&lt;/script&gt;</h1>")
        schema.add_schema(self.path, URL)
        data = self.path.read_text(encoding="utf-8").split('<script type="application/ld+json">', 1)[1].split("</script>", 1)[0]
        self.assertEqual(json.loads(data)["headline"], "</script>")
        self.assertNotIn("<", data)


if __name__ == "__main__":
    unittest.main()
