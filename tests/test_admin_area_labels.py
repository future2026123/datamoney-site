import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sync_admin_area_labels

class AreaLabelSyncTests(unittest.TestCase):
    def test_injection_is_idempotent_and_versioned(self):
        src = '<html><head><title>Example</title></head><body></body></html>'
        built = sync_admin_area_labels.render(src, 'a123')
        self.assertEqual(sync_admin_area_labels.render(built, 'a123'), built)
        self.assertIn('/scripts/admin-area-labels.js?v=a123', built)
        self.assertEqual(built.count('dm-admin-area-labels:start'), 1)
        self.assertIn('/scripts/admin-area-labels.js?v=b456', sync_admin_area_labels.render(built, 'b456'))

if __name__ == '__main__': unittest.main()
