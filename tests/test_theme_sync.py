import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sync_theme


class ThemeSyncTests(unittest.TestCase):
    def test_early_initializer_and_last_stylesheet_are_idempotent(self):
        source = '<html><head>\n<meta charset="utf-8"><style>body{color:red}</style>\n</head><body></body></html>'
        updated = sync_theme.render(source, 'js123', 'css456')
        self.assertEqual(sync_theme.render(updated, 'js123', 'css456'), updated)
        self.assertLess(updated.index('/scripts/theme.js'), updated.index('<style>'))
        self.assertGreater(updated.index('/theme.css'), updated.index('</style>'))
        self.assertEqual(updated.count('dm-theme-init:start'), 1)
        self.assertEqual(updated.count('dm-theme-style:start'), 1)

    def test_saved_result_token_is_removed_before_the_theme_script_loads(self):
        source = (ROOT / 'account' / 'result' / 'index.html').read_text(encoding='utf-8')
        updated = sync_theme.render(source, 'abc', 'def')
        self.assertLess(updated.index('dm-investor-result-token'), updated.index('/scripts/theme.js'))
        self.assertLess(updated.index('/scripts/theme.js'), updated.index('result.css'))

    def test_all_public_page_families_and_article_template_are_included(self):
        paths = {path.relative_to(ROOT).as_posix() for path in sync_theme.site_pages()}
        self.assertIn('blog/index.html', paths)
        self.assertIn('blog/investing-when-you-cannot-endure-loss/index.html', paths)
        self.assertIn('tools/investor-type/index.html', paths)
        self.assertIn('tools/etf_calculator/index.html', paths)
        self.assertIn('account/result/index.html', paths)
        self.assertIn('templates/blog_post.html', paths)
        self.assertNotIn('templates/newsletter.html', paths)


if __name__ == '__main__':
    unittest.main()
