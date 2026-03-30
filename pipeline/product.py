"""
디지털 상품(계산기 도구) 자동 선택 및 링크 반환.
실제 상품은 tools/ 디렉토리의 정적 HTML로 배포됨.
"""
import yaml
from pathlib import Path

_BASE_DIR = Path(__file__).parent.parent.parent  # datamoney/


def _load_config() -> dict:
    with open(_BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_tool_for_topic(topic_json: dict) -> dict | None:
    """영상 주제에 맞는 계산기 도구 URL과 이름 반환."""
    config = _load_config()
    tools = config.get("tools", {})
    tags = [t.lower() for t in topic_json.get("tags", [])]
    topic_lower = topic_json.get("topic", "").lower()
    all_text = topic_lower + " " + " ".join(tags)

    if any(k in all_text for k in ["etf", "이티에프", "펀드", "인덱스"]):
        return {
            "name": "ETF 수익률 계산기",
            "url": tools.get("etf_calculator", "https://datamoney.kr/tools/etf-calculator"),
            "description": "ETF 적립 수익률을 직접 계산해보세요",
        }
    if any(k in all_text for k in ["절세", "세금", "isa", "연금", "소득공제"]):
        return {
            "name": "절세 시뮬레이터",
            "url": tools.get("tax_simulator", "https://datamoney.kr/tools/tax-simulator"),
            "description": "내 절세 가능 금액을 시뮬레이션하세요",
        }
    if any(k in all_text for k in ["배당", "dividend", "배당금", "배당수익"]):
        return {
            "name": "배당 포트폴리오 계산기",
            "url": tools.get("dividend_calc", "https://datamoney.kr/tools/dividend-calculator"),
            "description": "배당 재투자 복리 효과를 계산하세요",
        }
    return None


def build_tool_embed_html(topic_json: dict) -> str:
    """유튜브 설명란·블로그 삽입용 도구 배너 HTML."""
    tool = get_tool_for_topic(topic_json)
    if not tool:
        return ""
    return (
        f'<div class="dm-tool-banner" style="border:2px solid #2563EB;border-radius:8px;'
        f'padding:16px;margin:24px 0;background:#EFF6FF">'
        f'<strong>🧮 {tool["name"]}</strong> — {tool["description"]}<br>'
        f'<a href="{tool["url"]}" target="_blank">{tool["url"]}</a>'
        f'</div>'
    )
