import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_speech_manifests as manifests
from generate_injoon_speech import prepare_spoken_text, validate_cues
from generate_local_speech import grouped_languages
from speech_language import is_english, language_segments


class SpeechLanguageTests(unittest.TestCase):
    def test_english_sentences_and_korean_financial_terms_are_distinguished(self):
        self.assertTrue(is_english("Annualized returns for the S&P 500 were negative."))
        self.assertTrue(is_english("I agree."))
        self.assertTrue(is_english("Yes."))
        self.assertTrue(is_english("NVIDIA CORP · APPLE INC"))
        self.assertFalse(is_english("S&P 500과 ETF를 비교한다."))
        self.assertFalse(is_english("PBR·CPI·ISA·IRP·KOSPI"))
        parts = ["한국어 문장입니다. Annualized returns were negative. 다시 한국어입니다."]
        self.assertEqual([lang for lang, _ in language_segments(parts)], ["ko", "en", "ko"])
        self.assertEqual(language_segments(["한국어 첫 문장입니다. 한국어 둘째 문장입니다."]),
                         [("ko", "한국어 첫 문장입니다. 한국어 둘째 문장입니다.")])
        quoted = language_segments(['그는 “Past performance does not guarantee future results.”라고 설명했다.'])
        self.assertEqual([lang for lang, _ in quoted], ["ko", "en", "ko"])

    def test_english_acronyms_remain_english_and_korean_rules_still_apply(self):
        quote = "Annualized returns for the S&P 500 and ETF investments were negative."
        self.assertEqual(prepare_spoken_text(quote), quote)
        self.assertEqual(prepare_spoken_text("S&P 500과 ETF를 비교한다."),
                         "에스 엔 피 오백과 이 티 에프를 비교한다.")
        groups = grouped_languages(["한국어 ETF 문장입니다.", quote, "다음 한국어 문장입니다."])
        self.assertEqual([language for language, _ in groups], ["ko", "en", "ko"])
        self.assertIn("이 티 에프", groups[0][1])
        self.assertEqual(groups[1][1], quote)

    def test_only_recordings_with_english_get_a_new_routing_identity(self):
        make = lambda body: '<article class="dm-post"><h1>제목</h1><p>' + body + '</p></article>'
        english = make("Investors should check the risk.")
        korean = make("투자 위험을 확인한다.")
        with patch.object(manifests, "language_segments", lambda parts: [("ko", item) for item in parts]):
            old_english = manifests.build_manifest(english)["content_id"]
            old_korean = manifests.build_manifest(korean)["content_id"]
        self.assertNotEqual(old_english, manifests.build_manifest(english)["content_id"])
        self.assertEqual(old_korean, manifests.build_manifest(korean)["content_id"])

    def test_bilingual_word_timings_highlight_the_original_sentences(self):
        source = '''<article class="dm-post"><h1>제목</h1><p>한국어입니다.</p>
        <blockquote><p>Annualized returns for the S&amp;P 500 were negative.</p></blockquote>
        <p>다시 한국어입니다.</p></article>'''
        words = ["제목", "한국어입니다", "Annualized", "returns", "for", "the", "S&P", "500", "were", "negative",
                 "다시", "한국어입니다"]
        events = [{"text": word, "start": float(i), "end": i + .8} for i, word in enumerate(words)]
        cues = validate_cues(source, events, "a" * 64)["cues"]
        self.assertEqual([cue["text"] for cue in cues],
                         ["제목", "한국어입니다.", "Annualized returns for the S&P 500 were negative.", "다시 한국어입니다."])
        self.assertEqual(cues[2]["start"], 2.0)
        self.assertEqual(cues[3]["start"], 10.0)


if __name__ == "__main__":
    unittest.main()
