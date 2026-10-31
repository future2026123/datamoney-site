import sys
import hashlib
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_speech_manifests as manifests
from speech_pronunciation import prepare_pronunciation, unknown_financial_terms
from speech_timing import timing_for


class PronunciationTests(unittest.TestCase):
    def test_financial_terms_change_only_in_spoken_text(self):
        self.assertEqual(prepare_pronunciation("EP.01 제목과 PNAS 연구"),
                         "에피소드 1 제목과 피 엔 에이 에스 연구")
        self.assertEqual(prepare_pronunciation("S&P 500과 S&P500, PER는 ETF를 본다."),
                         "에스 엔 피 오백과 에스 엔 피 오백, 퍼는 이 티 에프를 본다.")
        self.assertEqual(prepare_pronunciation("per도 보지만 one per year와 SUPER는 그대로."),
                         "퍼도 보지만 one per year와 SUPER는 그대로.")
        self.assertEqual(prepare_pronunciation("선행 per 낮아지는 이유"), "선행 퍼 낮아지는 이유")
        self.assertEqual(prepare_pronunciation("PBR·CPI·ISA·IRP·KOSPI"),
                         "피 비 알·씨 피 아이·아이 에스 에이·아이 알 피·코스피")

    def test_unlisted_capitalized_terms_are_reported_for_review(self):
        self.assertEqual(unknown_financial_terms(["ETF와 XYZ의 ABC2 가격", "AN ENGLISH QUOTE"]), ["ABC2", "XYZ"])

    def test_pronunciation_changes_invalidate_only_affected_recordings(self):
        html = '<article class="dm-post"><h1>제목</h1><p>PER를 본다.</p></article>'
        with patch.object(manifests, 'prepare_pronunciation', lambda text: text):
            old = manifests.build_manifest(html)
        new = manifests.build_manifest(html)
        self.assertEqual(old['chunks'], new['chunks'])
        self.assertNotEqual(old['content_id'], new['content_id'])
        plain = '<article class="dm-post"><h1>제목</h1><p>본문이다.</p></article>'
        with patch.object(manifests, 'prepare_pronunciation', lambda text: text):
            old_plain = manifests.build_manifest(plain)
        self.assertEqual(old_plain['content_id'], manifests.build_manifest(plain)['content_id'])
        legacy = hashlib.sha256(('female-v1\n' + '\n'.join(c['id'] for c in old_plain['chunks'])).encode('utf-8')).hexdigest()
        self.assertNotEqual(old_plain['content_id'], legacy)

    def test_spoken_terms_align_to_the_original_visible_sentence(self):
        visible = ['PER와 S&P 500.', '다음이다.']
        spoken = [prepare_pronunciation(item) for item in visible]
        words = [{'text': word, 'start': i, 'end': i + .8} for i, word in
                 enumerate(['퍼와', '에스', '엔', '피', '오백', '다음이다'])]
        cues = timing_for('', words, 'a' * 64, pieces=visible, match_pieces=spoken)['cues']
        self.assertEqual([cue['text'] for cue in cues], visible)
        self.assertEqual([(cue['start'], cue['end']) for cue in cues], [(0, 4.8), (5, 5.8)])

    def test_unknown_financial_abbreviation_stops_both_generators_before_synthesis(self):
        for script, voice in [('generate_injoon_speech.py', 'ko-KR-InJoonNeural-v1'),
                              ('generate_local_speech.py', 'female-v1')]:
            with self.subTest(script=script), tempfile.TemporaryDirectory() as directory:
                article = Path(directory) / 'blog' / 'test'
                article.mkdir(parents=True)
                (article / 'index.html').write_text(
                    f'<html><head><meta name="dm-speech-voice" content="{voice}"></head>'
                    '<body><article class="dm-post"><h1>시험 글</h1>'
                    '<p>XYZ의 수익률을 확인한다.</p></article></body></html>', encoding='utf-8')
                result = subprocess.run([sys.executable, str(ROOT / 'scripts' / script), 'test',
                                         '--source-root', directory, '--dry-run'],
                                        capture_output=True, text=True, encoding='utf-8')
                self.assertEqual(result.returncode, 20)
                self.assertIn('Pronunciation review required', result.stdout)


if __name__ == '__main__':
    unittest.main()
