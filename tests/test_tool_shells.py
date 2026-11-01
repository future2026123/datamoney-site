import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sync_tool_shells


class ToolShellTests(unittest.TestCase):
    def test_every_direct_url_keeps_metadata_and_original_embedded_tool(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for path in [ROOT / 'tools/index.html', *(ROOT / 'tools' / folder / 'index.html' for folder in sync_tool_shells.TOOLS)]:
                target = root / path.relative_to(ROOT)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(path, target)
            sync_tool_shells.synchronize(root)
            snapshots = {}
            for folder, (_, title) in sync_tool_shells.TOOLS.items():
                source = (ROOT / 'tools' / folder / 'index.html').read_text(encoding='utf-8')
                index = root / 'tools' / folder / 'index.html'
                embed = index.with_name('embed.html')
                page = index.read_text(encoding='utf-8')
                content = embed.read_text(encoding='utf-8')
                self.assertIn('data-dm-tool-shell="1"', page)
                self.assertIn('dm-shared-sidebar', page)
                self.assertIn('dm-site-header', page)
                self.assertIn(f'<h1 id="dm-tool-title">{title}</h1>', page)
                self.assertIn(f'<div class="dm-article-heading"><h1 id="dm-tool-title">{title}</h1></div>', page)
                self.assertIn('/blog/article-title.css', page)
                self.assertIn('location.replace("embed.html"+location.search+location.hash)', page)
                self.assertEqual(sync_tool_shells.CANONICAL.search(page).group(), sync_tool_shells.CANONICAL.search(source).group())
                self.assertEqual(sync_tool_shells.TITLE.search(page).group(), sync_tool_shells.TITLE.search(source).group())
                self.assertIn(sync_tool_shells.NOINDEX, content)
                self.assertIn('id="start"' if folder == 'investor-type' else 'function calculate()', content)
                snapshots[folder] = (page, content)
            sync_tool_shells.synchronize(root)
            for folder in sync_tool_shells.TOOLS:
                index = root / 'tools' / folder / 'index.html'
                self.assertEqual((index.read_text(encoding='utf-8'), index.with_name('embed.html').read_text(encoding='utf-8')), snapshots[folder])


if __name__ == '__main__':
    unittest.main()
