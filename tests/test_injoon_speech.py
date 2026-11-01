import asyncio
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from build_speech_manifests import DEFAULT_INJOON_PROFILE, INJOON_VOICE_PROFILES
from generate_injoon_speech import article_sentences, matches_source, prepare_spoken_text, synthesize, validate_cues


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

    def test_lower_pitch_is_sent_to_the_voice_service(self):
        calls = []

        class FakeCommunicate:
            def __init__(self, text, voice, *, pitch, boundary):
                calls.append((text, voice, pitch, boundary))

            async def stream(self):
                yield {"type": "audio", "data": b"a" * 10001}
                for index in range(20):
                    yield {"type": "WordBoundary", "text": "단어", "offset": index * 10000000,
                           "duration": 1000000}

        with tempfile.TemporaryDirectory() as directory, \
             patch.dict(sys.modules, {"edge_tts": types.SimpleNamespace(Communicate=FakeCommunicate)}):
            path = Path(directory) / "test.mp3"
            events = asyncio.run(synthesize("시험 음성", path, INJOON_VOICE_PROFILES[DEFAULT_INJOON_PROFILE]))
            self.assertEqual(path.stat().st_size, 10001)
        self.assertEqual(calls, [("시험 음성", "ko-KR-InJoonNeural", "-5Hz", "WordBoundary")])
        self.assertEqual(len(events), 20)

    def test_bilingual_generation_selects_english_voice_and_offsets_timings(self):
        calls = []

        class FakeCommunicate:
            def __init__(self, text, voice, *, pitch, boundary):
                calls.append((text, voice, pitch, boundary))

            async def stream(self):
                yield {"type": "audio", "data": b"a" * 12000}
                for index in range(10):
                    yield {"type": "WordBoundary", "text": "word", "offset": index * 1000000,
                           "duration": 500000}

        with tempfile.TemporaryDirectory() as directory, \
             patch.dict(sys.modules, {"edge_tts": types.SimpleNamespace(Communicate=FakeCommunicate)}):
            path = Path(directory) / "test.mp3"
            events = asyncio.run(synthesize([("ko", "한국어 문장입니다."),
                                             ("en", "This is an English sentence.")], path, "-5Hz"))
            self.assertEqual(path.stat().st_size, 24000)
        self.assertEqual([call[1] for call in calls], ["ko-KR-InJoonNeural", "en-US-GuyNeural"])
        self.assertEqual([call[2] for call in calls], ["-5Hz", "+0Hz"])
        self.assertEqual(events[10]["start"], 2.0)

    def test_old_single_voice_cache_is_not_reused_for_bilingual_audio(self):
        old = {"voice": "ko-KR-InJoonNeural", "profile": DEFAULT_INJOON_PROFILE,
               "pitch": "-5Hz", "blocks": ["한국어", "English sentence"], "spoken_text": "same"}
        self.assertFalse(matches_source(old, DEFAULT_INJOON_PROFILE, "-5Hz", old["blocks"], "same", True))

    def test_original_pitch_cache_cannot_be_reused_for_lower_pitch(self):
        legacy = {"voice": "ko-KR-InJoonNeural", "blocks": ["본문"], "spoken_text": "본문"}
        self.assertTrue(matches_source(legacy, "ko-KR-InJoonNeural-v1", "+0Hz", ["본문"], "본문"))
        self.assertFalse(matches_source(legacy, DEFAULT_INJOON_PROFILE, "-5Hz", ["본문"], "본문"))
        updated = dict(legacy, profile=DEFAULT_INJOON_PROFILE, pitch="-5Hz")
        self.assertTrue(matches_source(updated, DEFAULT_INJOON_PROFILE, "-5Hz", ["본문"], "본문"))

    def test_word_timings_map_to_exact_visible_sentences(self):
        result = validate_cues(self.SOURCE, self.EVENTS, "a" * 64)
        self.assertEqual([c["text"] for c in result["cues"]],
                         ["시험 제목", "첫 문장이다.", "손실은 -0.95%였다."])
        self.assertEqual([c["start"] for c in result["cues"]], [.1, 1, 2.2])
        self.assertEqual(result["content_id"], "a" * 64)

    def test_incomplete_speech_is_not_accepted(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_cues(self.SOURCE, self.EVENTS[:-1], "a" * 64)

    def test_duplicate_boundary_word_has_small_overlap_corrected(self):
        events = [dict(e) for e in self.EVENTS]
        events[3]['end'] = 2.8
        cues = validate_cues(self.SOURCE, events, "a" * 64)["cues"]
        self.assertEqual(cues[1]['end'], cues[2]['start'])
        events[3]['end'] = 3.8
        with self.assertRaisesRegex(ValueError, 'overlap'):
            validate_cues(self.SOURCE, events, "a" * 64)

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
