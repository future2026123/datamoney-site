"""Build direct tool URLs with the shared blog shell and an embedded tool page."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TOOLS = {
    'investor-type': ('investor-type', '나의 투자 유형 테스트'),
    'etf_calculator': ('etf', 'ETF 적립식 수익률 계산기'),
    'tax_simulator': ('tax', '절세 시뮬레이터'),
    'dividend_calculator': ('dividend', '배당 포트폴리오 계산기'),
    'average-cost': ('average-cost', '평단가 계산기'),
    'deposit-savings': ('deposit-savings', '예금·적금 계산기'),
    'fixed-deposit': ('fixed-deposit', '정기예금 계산기'),
    'installment-savings': ('installment-savings', '적금 계산기'),
    'investment-return': ('investment-return', '투자 수익률 계산기'),
    'portfolio-builder': ('portfolio-builder', '자산 포트폴리오'),
}
TITLE = re.compile(r'<title\b[^>]*>.*?</title\s*>', re.I | re.S)
DESCRIPTION = re.compile(r'<meta\s+name=["\']description["\'][^>]*>', re.I)
CANONICAL = re.compile(r'<link\s+rel=["\']canonical["\'][^>]*>', re.I)
OPEN_GRAPH = re.compile(r'<meta\s+property=["\']og:[^"\']+["\'][^>]*>', re.I)
NOINDEX = '<meta name="robots" content="noindex,follow">'


def render(original, shell, slug, title):
    """Return an indexable shell and the original functionality as a noindex embed."""
    wrapper = shell.replace('<html lang="ko">', '<html lang="ko" data-dm-tool-shell="1">', 1)
    for pattern in (TITLE, DESCRIPTION, CANONICAL):
        value = pattern.search(original)
        if not value or not pattern.search(wrapper):
            raise ValueError(f'Missing metadata for {slug}')
        wrapper = pattern.sub(lambda match: value.group(), wrapper, count=1)
    tags = OPEN_GRAPH.findall(original)
    if tags:
        wrapper = wrapper.replace('</head>', '\n'.join(tags) + '\n</head>', 1)
    start = ('<script>if(new URLSearchParams(location.search).get("embed")==="1")'
             'location.replace("embed.html"+location.search+location.hash);</script>\n'
             '<style>html[data-dm-tool-shell="1"] [data-tool-list]{display:none!important}</style>')
    wrapper = wrapper.replace('<head>', '<head>\n' + start, 1)
    wrapper = wrapper.replace('<section class="dm-tool-embed" hidden', '<section class="dm-tool-embed"', 1)
    wrapper = wrapper.replace('<h1 id="dm-tool-title"></h1>', f'<h1 id="dm-tool-title">{title}</h1>', 1)
    fallback = '<noscript><p>도구를 열려면 자바스크립트를 켜 주세요.</p></noscript>'
    wrapper = wrapper.replace('<div data-tool-frame></div>', f'<div data-tool-frame>{fallback}</div>', 1)
    embed = original if NOINDEX in original else original.replace('</head>', NOINDEX + '\n</head>', 1)
    return wrapper, embed


def synchronize(root=ROOT):
    shell = (root / 'tools/index.html').read_text(encoding='utf-8')
    for folder, (slug, title) in TOOLS.items():
        index = root / 'tools' / folder / 'index.html'
        embedded = index.with_name('embed.html')
        current = index.read_text(encoding='utf-8')
        if 'data-dm-tool-shell="1"' in current:
            if not embedded.exists():
                raise ValueError(f'Missing original tool page: {embedded}')
            current = embedded.read_text(encoding='utf-8')
        wrapper, app = render(current, shell, slug, title)
        index.write_text(wrapper, encoding='utf-8')
        embedded.write_text(app, encoding='utf-8')
    print(f'Direct tool shells prepared: {len(TOOLS)}')


if __name__ == '__main__':
    synchronize()
