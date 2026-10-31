import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from generate_injoon_speech import article_sentences, prepare_spoken_text, validate_cues


class InJoonSpeechTests(unittest.TestCase):
    SOURCE = '''<html><head><meta name="dm-speech-voice" content="ko-KR-InJoonNeural-v1"></head>
    <body><article class="dm-post"><div class="dm-article-heading"><h1>시험 제목</h1></div>
    <p>첫 문장이다. 손실은 -0.95%였다.</p><figure><figcaption>읽지 않을 출처</figcaption></figure>
    <section class="dm-references"><p>읽지 않을 참고자료</p></section></article></body></html>'''
    EVENTS = [
        {"text": "시험", "start": .1, "end": .4}, {"text": "제목", "start": .4, "end": .8},
        {"text": "첫", "start": 1, "end": 1.2}, {"text": "문장이다", "start": 1.2, "end": 2},
        {"text": "손실은", "start": 2.2, "end": 2.6}, {"text": "0.95%였다", "start": 2.6, "end": 3.8},
    ]

    def test_word_timings_map_to_exact_visible_sentences(self):
        result = validate_cues(self.SOURCE, self.EVENTS, "a" * 64)
        self.assertEqual([c["text"] for c in result["cues"]],
                         ["시험 제목", "첫 문장이다.", "손실은 -0.95%였다."])
        self.assertEqual([c["start"] for c in result["cues"]], [.1, 1, 2.2])
        self.assertEqual(result["content_id"], "a" * 64)

    def test_incomplete_speech_is_not_accepted(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_cues(self.SOURCE, self.EVENTS[:-1], "a" * 64)

    def test_ranges_and_reference_numbers_are_spoken_naturally(self):
        self.assertEqual(prepare_spoken_text("생활비 3~6개월을 준비한다.[8] 수입은 다르다."),
                         "생활비 3개월에서 6개월을 준비한다. 수입은 다르다.")

    def test_sentences_keep_reference_markers_and_closing_quotes(self):
        source = self.SOURCE.replace("첫 문장이다. 손실은 -0.95%였다.",
                                     "첫 문장이다.[8] “손실은 -0.95%였다.” 다음 문장이다.")
        self.assertEqual(article_sentences(source), ["시험 제목", "첫 문장이다.[8]",
                                                     "“손실은 -0.95%였다.”", "다음 문장이다."])

    def test_spoken_ranges_still_highlight_the_original_text(self):
        source = self.SOURCE.replace("첫 문장이다. 손실은 -0.95%였다.",
                                     "생활비 3~6개월을 준비한다.[8] 수입은 다르다.")
        words = ["시험", "제목", "생활비", "3개월에서", "6개월을", "준비한다", "수입은", "다르다"]
        events = [{"text": word, "start": float(i), "end": i + .8} for i, word in enumerate(words)]
        cues = validate_cues(source, events, "b" * 64)["cues"]
        self.assertEqual([cue["text"] for cue in cues],
                         ["시험 제목", "생활비 3~6개월을 준비한다.[8]", "수입은 다르다."])
        self.assertEqual(cues[1]["start"], 2.0)
        self.assertEqual(cues[2]["start"], 6.0)


if __name__ == "__main__":
    unittest.main()
