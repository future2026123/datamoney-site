import json
import subprocess
import yaml
import httpx
from pathlib import Path

CLAUDE_CMD = r"C:\Users\withc\AppData\Roaming\npm\claude.cmd"
_BASE_DIR = Path(__file__).parent.parent.parent  # datamoney/
_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

SYSTEM_PROMPT = """너는 금융 SEO 블로그 작가다.
아래 유튜브 대본을 바탕으로 네이버·구글 검색 최적화 블로그 포스트를 작성해라.

규칙:
- H2/H3 헤딩 구조 포함
- 핵심 키워드 자연스럽게 5회 이상
- 1,500자 이상
- 말투: 정보 전달형, 감정 없음
- 마지막 문단에 관련 영상 유튜브 링크 삽입 ({{YOUTUBE_URL}} 자리표시자 사용)
- AdSense 삽입 위치: 본문 시작 직후 <!-- ADSENSE_TOP -->, 중간에 <!-- ADSENSE_MID -->

출력: 아래 JSON만. 다른 텍스트 절대 금지.
{
  "title": "포스트 제목",
  "content": "HTML 본문 (<!-- ADSENSE_TOP --> <!-- ADSENSE_MID --> 포함)",
  "excerpt": "SEO 요약 (150자)",
  "tags": ["태그1", "태그2"]
}"""


def _load_config() -> dict:
    with open(_BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _extract_json(raw: str) -> dict:
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


def _inject_adsense(content: str, config: dict) -> str:
    adsense = config.get("adsense", {})
    pub_id = adsense.get("publisher_id", "")
    slot_top = adsense.get("ad_slot_top", "")
    slot_mid = adsense.get("ad_slot_mid", "")

    if not pub_id or not slot_top or "XXXXX" in str(pub_id):
        # AdSense 미설정 시 주석만 제거
        content = content.replace("<!-- ADSENSE_TOP -->", "")
        content = content.replace("<!-- ADSENSE_MID -->", "")
        return content

    def ad_block(slot: str) -> str:
        return (
            f'<ins class="adsbygoogle" style="display:block" '
            f'data-ad-client="{pub_id}" data-ad-slot="{slot}" '
            f'data-ad-format="auto" data-full-width-responsive="true"></ins>'
            f'<script>(adsbygoogle = window.adsbygoogle || []).push({{}});</script>'
        )

    content = content.replace("<!-- ADSENSE_TOP -->", ad_block(slot_top))
    content = content.replace("<!-- ADSENSE_MID -->", ad_block(slot_mid))
    return content


def _build_affiliate_html(affiliate_links: list[dict]) -> str:
    if not affiliate_links:
        return ""
    items = "".join(
        f'<li><a href="{lnk["url"]}" target="_blank" rel="nofollow sponsored">'
        f'{lnk["name"]}</a></li>'
        for lnk in affiliate_links
    )
    return (
        '<div class="dm-affiliate-box">'
        '<h3>관련 금융 서비스</h3>'
        f'<ul>{items}</ul>'
        '</div>'
    )


async def publish_blog_post(
    script_json: dict,
    topic_json: dict,
    affiliate_links: list[dict],
    youtube_url: str = "",
) -> str:
    config = _load_config()
    site = config.get("site", {})
    wp_api = site.get("wp_api_url", "").rstrip("/")
    wp_token = site.get("wp_token", "")

    if not wp_token or "XXXXX" in str(wp_token):
        print("  [블로그 스킵] WordPress 토큰 미설정")
        return ""

    tags_str = json.dumps(topic_json.get("tags", []), ensure_ascii=False)
    title = topic_json.get("topic", "")
    # 토큰 절약: 대본 씬 텍스트만 추출
    narrations = [
        s.get("narration", "") for s in script_json.get("scenes", [])
    ]
    script_summary = "\n".join(narrations)[:4000]

    user_msg = (
        f"영상 제목: {title}\n"
        f"키워드: {tags_str}\n"
        f"유튜브 URL: {youtube_url}\n\n"
        f"대본 요약:\n{script_summary}"
    )
    prompt = f"{SYSTEM_PROMPT}\n\n{user_msg}"

    result = subprocess.run(
        [CLAUDE_CMD, "-p", "-", "--output-format", "text"],
        input=prompt.encode("utf-8"), capture_output=True, timeout=300,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"Claude 블로그 생성 실패: {stderr[:200]}")

    raw = result.stdout.decode("utf-8", errors="replace").strip()
    post_data = _extract_json(raw)

    content = post_data.get("content", "")
    content = content.replace("{{YOUTUBE_URL}}", youtube_url)
    content = _inject_adsense(content, config)
    content += _build_affiliate_html(affiliate_links)

    payload = {
        "title":   post_data.get("title", title),
        "content": content,
        "excerpt": post_data.get("excerpt", ""),
        "status":  "publish",
        "tags":    post_data.get("tags", []),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{wp_api}/posts",
            json=payload,
            headers={"Authorization": f"Bearer {wp_token}"},
            timeout=30,
        )

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"WordPress 업로드 실패: {resp.status_code} {resp.text[:200]}"
        )

    post_url = resp.json().get("link", "")
    print(f"  → 블로그 포스트 발행: {post_url}")
    return post_url
