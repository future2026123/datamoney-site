import struct
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from sync_brand_icons import VERSION, update


class BrandAssetTests(unittest.TestCase):
    def test_icon_sync_updates_old_links_and_is_idempotent(self):
        page = '<link rel="icon" href="/favicon.ico?v=2"><title>테스트</title>'
        result = update(page)
        self.assertIn(f'/favicon.ico?v={VERSION}', result)
        self.assertIn(f'/favicon-48x48.png?v={VERSION}', result)
        self.assertEqual(update(result), result)
        self.assertEqual(update('<a href="/other">그대로</a>'), '<a href="/other">그대로</a>')

    def test_favicon_contains_all_standard_sizes_and_transparent_png(self):
        data = (ROOT / "favicon.ico").read_bytes()
        reserved, kind, count = struct.unpack_from("<HHH", data)
        self.assertEqual((reserved, kind), (0, 1))
        sizes = set()
        for index in range(count):
            offset = 6 + index * 16
            width, height = data[offset], data[offset + 1]
            sizes.add((width or 256, height or 256))
        self.assertEqual(sizes, {(n, n) for n in (16, 32, 48, 64, 128, 256)})
        png = (ROOT / "favicon-48x48.png").read_bytes()
        self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack_from(">II", png, 16), (48, 48))
        self.assertEqual(png[25], 6, "favicon PNG must retain an alpha channel")

    def test_shared_header_and_compact_site_wordmarks_use_new_logo(self):
        header = (ROOT / "templates" / "blog_header.html").read_text(encoding="utf-8")
        self.assertIn("/blog/datamoney-logo-display.png?v=20261031-round", header)
        self.assertNotIn("logo-cutout", header)
        pages = ["index.html", "tools/index.html", "tools/etf_calculator/index.html",
                 "tools/dividend_calculator/index.html", "tools/tax_simulator/index.html",
                 "tools/investor-type/index.html", "about/index.html", "privacy/index.html",
                 "account/result/index.html", "comment-admin/index.html"]
        for page in pages:
            with self.subTest(page=page):
                text = (ROOT / page).read_text(encoding="utf-8")
                self.assertIn("/blog/datamoney-logo-display.png?v=20261031-round", text)
                self.assertIn(f"/favicon.ico?v={VERSION}", text)


if __name__ == "__main__":
    unittest.main()
