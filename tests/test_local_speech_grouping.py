import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from generate_local_speech import MAX_GROUP, grouped_text


class GroupingTests(unittest.TestCase):
    def test_grouping_preserves_order_and_all_readable_text(self):
        chunks = [{"text": "글 제목"}, {"text": "첫 문장입니다."},
                  {"text": "긴 내용 " * 18}, {"text": "마지막 문장입니다."}]
        groups = grouped_text(chunks)
        self.assertEqual(" ".join(groups), " ".join(c["text"].strip() for c in chunks))
        self.assertTrue(all(0 < len(group) <= MAX_GROUP for group in groups))

    def test_an_oversized_block_is_rejected(self):
        with self.assertRaises(ValueError):
            grouped_text([{"text": "가" * (MAX_GROUP + 1)}])


if __name__ == "__main__":
    unittest.main()
