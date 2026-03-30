import json
import subprocess
import yaml
from pathlib import Path

CLAUDE_CMD = r"C:\Users\withc\AppData\Roaming\npm\claude.cmd"

_BASE_DIR = Path(__file__).parent.parent.parent  # datamoney/


def _load_config() -> dict:
    with open(_BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _extract_json(raw: str):
    if "```" in raw:
        parts = raw.split("```")
        for part in parts[1::2]:
            content = part.strip()
            if content.startswith("json"):
                content = content[4:].strip()
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                continue
    # 배열 우선
    start = raw.find("[")
    if start != -1:
        end = raw.rfind("]")
        if end != -1:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                pass
    start = raw.find("{")
    if start == -1:
        raise ValueError(f"JSON 없음: {raw[:200]}")
    depth = 0
    for i, ch in enumerate(raw[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(raw[start:i + 1])
    raise ValueError(f"JSON 파싱 실패: {raw[:200]}")


def _get_tool_link(topic_json: dict, config: dict) -> dict | None:
    """영상 주제에 맞는 도구 URL 반환."""
    tools = config.get("tools", {})
    tags = [t.lower() for t in topic_json.get("tags", [])]
    topic_lower = topic_json.get("topic", "").lower()

    if any(k in topic_lower or k in " ".join(tags) for k in ["etf", "이티에프"]):
        return {"name": "ETF 수익률 계산기", "url": tools.get("etf_calculator", "")}
    if any(k in topic_lower or k in " ".join(tags) for k in ["절세", "세금", "isa", "연금"]):
        return {"name": "절세 시뮬레이터", "url": tools.get("tax_simulator", "")}
    if any(k in topic_lower or k in " ".join(tags) for k in ["배당", "dividend"]):
        return {"name": "배당 포트폴리오 계산기", "url": tools.get("dividend_calc", "")}
    return None


async def attach_affiliate_links(topic_json: dict) -> list[dict]:
    config = _load_config()
    aff_map = config.get("affiliate_links", {})

    if not aff_map:
        return []

    aff_list_str = json.dumps(aff_map, ensure_ascii=False, indent=2)
    tags = json.dumps(topic_json.get("tags", []), ensure_ascii=False)
    title = topic_json.get("topic", "")

    system = (
        "아래 영상 태그와 제목을 보고 affiliate_links 중 가장 관련성 높은 것 2개를 골라라.\n"
        "출력: [{\"name\": \"...\", \"url\": \"...\", \"cpa\": 0}, ...] 형식 JSON만. 다른 텍스트 절대 금지."
    )
    user = f"태그: {tags}\n제목: {title}\n\naffiliate_links:\n{aff_list_str}"
    prompt = f"{system}\n\n{user}"

    result = subprocess.run(
        [CLAUDE_CMD, "-p", "-", "--output-format", "text"],
        input=prompt.encode("utf-8"), capture_output=True, timeout=60,
    )

    links = []
    if result.returncode == 0:
        raw = result.stdout.decode("utf-8", errors="replace").strip()
        try:
            parsed = _extract_json(raw)
            links = parsed if isinstance(parsed, list) else []
        except Exception:
            print("  [경고] 제휴 링크 파싱 실패 — 폴백 사용")

    if not links:
        # 폴백: 첫 번째 카테고리 첫 번째 링크
        for cat_links in aff_map.values():
            if cat_links:
                links = [cat_links[0]]
                break

    # 도구 링크 추가
    tool = _get_tool_link(topic_json, config)
    if tool and tool.get("url"):
        links.append(tool)

    print(f"  → 제휴/도구 링크 선택: {[l['name'] for l in links]}")
    return links
