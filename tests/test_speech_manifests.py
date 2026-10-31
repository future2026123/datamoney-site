import hashlib
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("speech_manifests", ROOT / "scripts" / "build_speech_manifests.py")
speech = importlib.util.module_from_spec(spec)
spec.loader.exec_module(speech)


class SpeechManifestTests(unittest.TestCase):
    def html(self, paragraph):
        return f'''<main class="paper"><article class="article">
          <div class="dm-article-heading"><h1>시험 글</h1><p>부제</p></div>
          <p>손실자의 <strong>95.3%</strong>가 다시 거래했다.</p>
          <p>{paragraph}</p><p>바뀌지 않는 문장.</p>
          <blockquote><p>중복 없이 읽을 인용문.</p></blockquote>
          <p hidden>감춘 내용</p><aside><p>사이드바</p></aside>
          <ul><li>항목 하나<ul><li>하위 항목</li></ul></li></ul>
        </article></main>'''

    def test_readable_text_and_hashes(self):
        manifest = speech.build_manifest(self.html("첫째<br>둘째"))
        texts = [chunk["text"] for chunk in manifest["chunks"]]
        self.assertEqual(manifest["voice"], "female-v1")
        self.assertEqual(texts, ["시험 글", "손실자의 95.3%가 다시 거래했다.", "첫째 둘째", "바뀌지 않는 문장.", "중복 없이 읽을 인용문.", "항목 하나 하위 항목"])
        for chunk in manifest["chunks"]:
            self.assertEqual(chunk["id"], hashlib.sha256(chunk["text"].encode()).hexdigest())

    def test_edit_only_changes_the_changed_block(self):
        old = speech.build_manifest(self.html("예전 문장."))["chunks"]
        new = speech.build_manifest(self.html("수정된 문장."))["chunks"]
        self.assertEqual(len(old), len(new))
        changed = [i for i, (a, b) in enumerate(zip(old, new)) if a["id"] != b["id"]]
        self.assertEqual(changed, [2])

    def test_recording_fingerprint_tracks_readable_text_not_markup(self):
        original = speech.build_manifest(self.html("예전 문장."))["content_id"]
        changed = speech.build_manifest(self.html("새로운 문장."))["content_id"]
        styled = speech.build_manifest(self.html("예전 <span>문장.</span>"))["content_id"]
        self.assertNotEqual(original, changed)
        self.assertEqual(original, styled)

    def test_captions_and_references_do_not_hide_adjacent_prose(self):
        source = '''<article class="article">
          <div class="dm-article-heading"><h1>시험 글</h1></div>
          <p>그래프 앞 본문.</p>
          <p class="eyebrow">AI SEMICONDUCTOR / PER / KOSPI</p>
          <figure><img src="graph.png"><figcaption><p>그래프 설명과 출처.</p></figcaption></figure>
          <p>그래프 뒤 본문.</p>
          <blockquote><p>읽을 인용문.</p><figcaption>인용문 출처.</figcaption></blockquote>
          <section class="dm-references"><h3>참고 자료</h3><p>감출 참고 문헌.</p></section>
          <div class="sources-box"><ul><li>감출 목록.</li></ul></div>
          <h2>참고 자료</h2><ul><li>자료 목록 1.</li><li>자료 목록 2.</li></ul>
          <p>목록 뒤 본문.</p>
          <h3>참고 문헌</h3><p>[1] 첫째 참고 문헌.</p><p>[2] 둘째 참고 문헌.</p>
          <p>참고 문헌 뒤 본문.</p>
          <div class="source"><p><strong>주요 데이터 출처</strong></p><p>데이터 출처 목록.</p>
            <p>목록 안쪽의 투자 유의 문구.</p></div>
          <p class="source">수치의 한계를 알리는 본문입니다.</p>
          <p class="source">자료 출처: 검증 기관. 이 글은 정보 제공이며 투자 권유가 아닙니다.</p>
          <p class="source">본 글은 검증 기관 자료를 근거로 작성한 일반 정보 자료입니다. 실제 판단은 전문가와 상의하세요.</p>
          <p class="source-citation">출처: 연구자, 연구 제목 (2000). 연구는 단타만 분석한 것은 아니다. DOI</p>
          <p class="dm-article-note">자료: 정부 기관. 2026년 통계 원문은 확인 중입니다.</p>
          <p>자료: 다른 기관의 공식 자료</p>
        </article>'''
        self.assertEqual(speech.article_parts(source), [
            "시험 글", "그래프 앞 본문.", "그래프 뒤 본문.", "읽을 인용문.",
            "목록 뒤 본문.", "참고 문헌 뒤 본문.", "목록 안쪽의 투자 유의 문구.",
            "수치의 한계를 알리는 본문입니다.", "이 글은 정보 제공이며 투자 권유가 아닙니다.",
            "실제 판단은 전문가와 상의하세요.", "연구는 단타만 분석한 것은 아니다.",
            "2026년 통계 원문은 확인 중입니다.",
        ])

    def test_real_graph_and_references_are_not_spoken(self):
        path = ROOT / "blog" / "investing-when-you-cannot-endure-loss" / "index.html"
        source = path.read_text(encoding="utf-8")
        parts = speech.article_parts(source)
        before = "주식 차트를 과거로 돌려보면 지금까지 계속 우상향한 팩트가 있다."
        after = "그러나 장기적으로 올랐으니 앞으로도 계속 오를 것이다와 내가 수익 실현하고자 하는 날에 양수, 수익을 낼 수 있는지는 다른 말이다."
        self.assertEqual(parts[parts.index(before) + 1], after)
        manifest_text = " ".join(chunk["text"] for chunk in speech.build_manifest(source)["chunks"])
        for excluded in ("1926~2025년", "1957년 이전은 소급 추정", "출처: Dimensional", "A Tale of Two Decades: Lessons for Long-Term Investors", "https://www.dimensional.com"):
            self.assertNotIn(excluded, manifest_text)
        self.assertIn("Annualized returns for the S&P 500", manifest_text)
        self.assertIn("해당 기간 S&P 500의 연환산 수익률은 -0.95%였다", manifest_text)
        self.assertIn("미래의 내가 흔들리더라도 생활을 지키고", manifest_text)

    def test_unwrapped_reference_list_does_not_hide_following_notice(self):
        path = ROOT / "blog" / "high-point-investors-2026" / "index.html"
        parts = speech.article_parts(path.read_text(encoding="utf-8"))
        self.assertNotIn("참고 자료", parts)
        self.assertFalse(any("SEC: Behavioral Patterns of U.S. Investors" in part for part in parts))
        self.assertTrue(any(part.startswith("본 글은 투자 권유가 아닙니다.") for part in parts))

    def test_real_inline_citations_keep_their_research_limitations(self):
        path = ROOT / "blog" / "trading-loss-investor-psychology" / "index.html"
        parts = speech.article_parts(path.read_text(encoding="utf-8"))
        self.assertFalse(any(part.startswith("출처:") for part in parts))
        self.assertIn("일반 주식투자 계좌 연구이며 순수 당일매매만을 분석한 것은 아니다.", parts)
        self.assertIn("일반 심리 이론을 투자 상황에 적용한 해석이다.", parts)

    def test_all_blog_articles_build(self):
        paths = sorted((ROOT / "blog").glob("*/index.html"))
        self.assertTrue(paths)
        for path in paths:
            with self.subTest(article=path.parent.name):
                manifest = speech.build_manifest(path.read_text(encoding="utf-8"))
                self.assertTrue(manifest["title"])
                self.assertTrue(manifest["chunks"])
                self.assertTrue(all(0 < len(item["text"]) <= speech.MAX_CHARS for item in manifest["chunks"]))

    def test_article_voice_gets_its_own_fingerprint(self):
        source = (ROOT / "blog" / "ai-semiconductor-per-2026" / "index.html").read_text(encoding="utf-8")
        original = speech.build_manifest(source)
        changed = source.replace("</head>", '<meta name="dm-speech-voice" content="ko-KR-InJoonNeural-v1"></head>', 1)
        selected = speech.build_manifest(changed)
        self.assertEqual(original["voice"], "female-v1")
        self.assertEqual(selected["voice"], "ko-KR-InJoonNeural-v1")
        self.assertEqual(original["chunks"], selected["chunks"])
        self.assertNotEqual(original["content_id"], selected["content_id"])
        lower = speech.build_manifest(changed.replace("ko-KR-InJoonNeural-v1", "ko-KR-InJoonNeural-low5-v2"))
        self.assertEqual(selected["chunks"], lower["chunks"])
        self.assertNotEqual(selected["content_id"], lower["content_id"])

    def test_unknown_voice_fails_instead_of_publishing_the_wrong_recording(self):
        source = (ROOT / "blog" / "ai-semiconductor-per-2026" / "index.html").read_text(encoding="utf-8")
        source = source.replace("</head>", '<meta name="dm-speech-voice" content="unknown"></head>', 1)
        with self.assertRaisesRegex(ValueError, "Unsupported article speech voice"):
            speech.build_manifest(source)


if __name__ == "__main__":
    unittest.main()
