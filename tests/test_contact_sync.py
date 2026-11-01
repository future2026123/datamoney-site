import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sync_contact
import sync_theme


class ContactSyncTests(unittest.TestCase):
    def test_asset_insertion_is_idempotent(self):
        page = '<html><head><title>Test</title></head><body></body></html>'
        updated = sync_contact.render(page, 'js123', 'css456')
        self.assertEqual(sync_contact.render(updated, 'js123', 'css456'), updated)
        self.assertEqual(updated.count('/scripts/contact.js'), 1)
        self.assertIn('/contact.css?v=css456', updated)

    def test_includes_contact_and_public_page_families(self):
        paths = {path.relative_to(ROOT).as_posix() for path in sync_theme.site_pages()}
        for path in ('contact/index.html', 'blog/index.html', 'tools/etf_calculator/index.html',
                     'tools/investor-type/index.html', 'templates/blog_post.html'):
            self.assertIn(path, paths)


if __name__ == '__main__':
    unittest.main()
