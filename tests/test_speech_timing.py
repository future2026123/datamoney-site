import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from speech_timing import sentences, timing_for, timing_key


SOURCE = '''<div class="dm-article-heading"><h1>투자 글 제목</h1></div>
<article class="article">
<p>수익률은 6.2%입니다. 다음 문장입니다.</p><h2>마지막 소제목</h2>
<figcaption>그래프 설명은 읽지 않음.</figcaption>
</article>'''


class SpeechTimingTests(unittest.TestCase):
    def test_sentence_boundaries_preserve_numbers_and_skip_captions(self):
        self.assertEqual(sentences(SOURCE), ["투자 글 제목", "수익률은 6.2%입니다.", "다음 문장입니다.", "마지막 소제목"])

    def test_word_times_align_to_sentences_despite_a_minor_recognition_error(self):
        words = [
            {"text": "투자", "start": 0.2, "end": 0.5},
            {"text": "글", "start": 0.5, "end": 0.7},
            {"text": "제목", "start": 0.7, "end": 1.1},
            {"text": "수익률은", "start": 1.4, "end": 2.2},
            {"text": "6.2퍼센트입니다", "start": 2.2, "end": 3.4},
            {"text": "다음", "start": 3.6, "end": 4.0},
            {"text": "문장입니다", "start": 4.0, "end": 4.8},
            {"text": "마지막", "start": 5.0, "end": 5.4},
            {"text": "소제목", "start": 5.4, "end": 6.0},
        ]
        result = timing_for(SOURCE, words, "abc")
        self.assertEqual([c["text"] for c in result["cues"]], sentences(SOURCE))
        self.assertEqual([(c["start"], c["end"]) for c in result["cues"]],
                         [(0.2, 1.1), (1.4, 3.4), (3.6, 4.8), (5.0, 6.0)])
        self.assertEqual(timing_key("post", "abc"), "audio/manifests/post/abc-cues-v1.json")

    def test_unmatched_sentence_is_not_given_an_invented_timestamp(self):
        words = [{"text": "투자 글 제목", "start": 0, "end": 1},
                 {"text": "전혀 다른 내용입니다", "start": 1, "end": 2}]
        result = timing_for(SOURCE, words, "abc")
        self.assertEqual(result["cues"][0]["text"], "투자 글 제목")
        self.assertFalse(any(c["text"] == "수익률은 6.2%입니다." for c in result["cues"]))


if __name__ == "__main__":
    unittest.main()
