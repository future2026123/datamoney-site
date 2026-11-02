from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ArticleReader(HTMLParser):
    """Collect the visible article's headings and prose, excluding old site details."""

    def __init__(self):
        super().__init__()
        self.in_article = False
        self.in_details = False
        self.current = None
        self.parts = []
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article" and "dm-post" in attrs.get("class", "").split():
            self.in_article = True
        elif self.in_article and tag == "details":
            self.in_details = True
        elif self.in_article and not self.in_details and tag in {"h1", "h2", "h3", "p", "li"}:
            self.current = tag
            self.parts = []

    def handle_data(self, data):
        if self.current is not None:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == self.current:
            self.blocks.append((tag, " ".join("".join(self.parts).split())))
            self.current = None
        if tag == "details":
            self.in_details = False
        elif tag == "article":
            self.in_article = False


class BrandIntroductionTest(unittest.TestCase):
    def test_user_supplied_article_is_complete_and_in_order(self):
        reader = ArticleReader()
        reader.feed((ROOT / "about/index.html").read_text(encoding="utf-8"))
        self.assertEqual(reader.blocks, [
            ("h1", "데이터머니 | 브랜드 철학과 사명문"),
            ("h2", "1. 존재 이유 (WHY)"),
            ("p", "투자를 처음 시작했을 때, 우리는 무엇을 알아야 하는지조차 모를 수 있습니다."),
            ("p", "정보가 부족하다는 이유로 돈을 잃고, 잘못된 판단의 대가를 치르면서 투자에 대해 배우기도 합니다."),
            ("p", "하지만 모든 사람이 그렇게 비싼 수업료를 낼 필요는 없습니다."),
            ("p", "데이터머니는 사람들이 돈을 투자하기 전에 충분히 알아보고, 잘못된 금융 상식을 바로잡으며, 더 넓은 시야에서 금융과 투자를 이해할 수 있도록 돕기 위해 존재합니다."),
            ("h2", "2. 사명 (MISSION)"),
            ("p", "왜곡된 금융 상식을 바로잡고, 사람들이 위험을 이해하고 관리하며 스스로 판단할 수 있도록 돕습니다."),
            ("h2", "3. 비전 (VISION)"),
            ("p", "누구나 돈과 투자를 막연히 두려워하거나 조급해하지 않고, 건강한 금융 철학을 바탕으로 더 멀리 내다볼 수 있는 세상."),
            ("p", "데이터머니는 그 과정에서 믿고 찾아올 수 있는 금융 친구가 되고자 합니다."),
            ("h2", "4. 핵심 가치 (CORE VALUES)"),
            ("h3", "① 신뢰 — 근거 있는 정보를 제공합니다."),
            ("p", "확인된 사실과 해석을 구분하고, 검증할 수 있는 자료를 바탕으로 이야기합니다."),
            ("h3", "② 균형 — 가능성과 위험을 함께 설명합니다."),
            ("p", "무조건 성공한다고 이야기하지 않습니다. 실패 가능성과 그에 대한 대비도 중요하게 다룹니다."),
            ("h3", "③ 보호 — 불필요한 금융 피해를 줄이는 데 기여합니다."),
            ("p", "독자가 무엇을 얻을 수 있는지만큼 무엇을 잃을 수 있는지도 살펴봅니다."),
            ("h3", "④ 진정성 — 돈에 관한 문제를 가볍게 소비하지 않습니다."),
            ("p", "투자를 자극적인 오락이나 구경거리로 만들기보다, 사람들의 소중한 돈이 걸린 문제로 진지하게 다룹니다."),
            ("h3", "⑤ 친근함 — 어렵지 않은 금융 친구가 됩니다."),
            ("p", "금융을 쉽게 설명하되 가볍게 취급하지 않습니다. 독자가 부담 없이 찾아와 이해하고 생각할 수 있는 콘텐츠를 지향합니다."),
            ("h2", "5. 독자와의 약속 (BRAND PROMISE)"),
            ("li", "수익보다 독자의 신뢰와 안전을 우선하겠습니다."),
            ("li", "근거 없는 확신이나 수익 보장으로 독자를 유혹하지 않겠습니다."),
            ("li", "광고와 콘텐츠의 상업적 관계를 투명하게 알리겠습니다."),
            ("li", "위험성이 있는 금융상품과 서비스는 주의점도 함께 설명하겠습니다."),
            ("li", "잘못된 정보는 바로잡고, 중요한 오류는 정정 사실을 공개하겠습니다."),
            ("h2", "6. 브랜드가 지향하는 모습"),
            ("p", "진지하지만 어렵지 않고, 친근하지만 가볍지 않은 금융 브랜드."),
            ("p", "데이터머니는 투자 정답을 대신 내려주는 곳이 아니라, 독자가 자신의 판단 기준을 만들어 갈 수 있도록 돕는 곳입니다."),
        ])

    def test_navigation_and_canonical_use_existing_introduction_url(self):
        fragment = (ROOT / "templates/blog_header.html").read_text(encoding="utf-8")
        about = (ROOT / "about/index.html").read_text(encoding="utf-8")
        homepage = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('class="dm-header-about" href="/about/">소개</a>', fragment)
        self.assertIn('href="/about/" data-dm-about-nav>소개</a>', fragment)
        self.assertIn('<a href="/about/">소개</a>', homepage)
        self.assertIn('<link rel="canonical" href="https://datamoney.kr/about/">', about)
        self.assertIn('mailto:datamoneykr@gmail.com', about)
        self.assertNotIn('{{POST_', about)


if __name__ == "__main__":
    unittest.main()
