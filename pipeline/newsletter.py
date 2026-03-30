import json
import subprocess
import yaml
import httpx
from pathlib import Path

CLAUDE_CMD = r"C:\Users\withc\AppData\Roaming\npm\claude.cmd"
_BASE_DIR = Path(__file__).parent.parent.parent  # datamoney/

SYSTEM_PROMPT = """너는 금융 뉴스레터 작가다.
오늘 데이터머니 영상을 뉴스레터로 변환해라.

구성:
- 제목: 이메일 오픈율 최적화 (30자 이내)
- 오늘의 핵심 데이터 1개 (크게 강조)
- 요약 3줄
- 유튜브 영상 링크
- 유료 리포트 CTA 1회

출력: 아래 JSON만. 다른 텍스트 절대 금지.
{
  "subject": "이메일 제목 (30자 이내)",
  "preview_text": "미리보기 텍스트 (50자)",
  "html_body": "HTML 이메일 본문 ({{YOUTUBE_URL}} {{REPORT_CTA}} 자리표시자 사용)"
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


def _build_report_cta() -> str:
    return (
        '<div style="background:#0F172A;border-radius:8px;padding:20px;text-align:center;margin:24px 0">'
        '<p style="color:#64748B;font-size:13px;margin:0 0 8px">매주 월요일</p>'
        '<p style="color:#F8FAFC;font-size:18px;font-weight:700;margin:0 0 16px">'
        '주간 금융 데이터 리포트 (A4 8페이지)</p>'
        '<a href="https://datamoney.kr/report" '
        'style="background:#2563EB;color:#fff;padding:12px 28px;border-radius:6px;'
        'text-decoration:none;font-weight:600;font-size:15px">9,900원으로 구독하기</a>'
        '</div>'
    )


async def _create_mailchimp_campaign(
    config: dict,
    subject: str,
    preview_text: str,
    html_body: str,
) -> str:
    mc = config.get("newsletter", {})
    api_key = mc.get("api_key", "")
    list_id = mc.get("list_id", "")

    if not api_key or "XXXXX" in str(api_key):
        print("  [뉴스레터 스킵] Mailchimp 미설정")
        return ""

    # Mailchimp 데이터센터 추출 (api_key 끝 -us1 형식)
    dc = api_key.split("-")[-1] if "-" in api_key else "us1"
    base_url = f"https://{dc}.api.mailchimp.com/3.0"
    auth = ("anystring", api_key)

    async with httpx.AsyncClient() as client:
        # 1. 캠페인 생성
        resp = await client.post(
            f"{base_url}/campaigns",
            json={
                "type": "regular",
                "recipients": {"list_id": list_id},
                "settings": {
                    "subject_line": subject,
                    "preview_text": preview_text,
                    "from_name": "데이터머니",
                    "reply_to": "noreply@datamoney.kr",
                },
            },
            auth=auth,
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Mailchimp 캠페인 생성 실패: {resp.text[:200]}")
        campaign_id = resp.json()["id"]

        # 2. 컨텐츠 설정
        resp = await client.put(
            f"{base_url}/campaigns/{campaign_id}/content",
            json={"html": html_body},
            auth=auth,
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Mailchimp 컨텐츠 설정 실패: {resp.text[:200]}")

        # 3. 즉시 발송
        resp = await client.post(
            f"{base_url}/campaigns/{campaign_id}/actions/send",
            auth=auth,
            timeout=30,
        )
        if resp.status_code != 204:
            raise RuntimeError(f"Mailchimp 발송 실패: {resp.text[:200]}")

    print(f"  → 뉴스레터 발송 완료 (campaign_id={campaign_id})")
    return campaign_id


async def send_newsletter(
    script_json: dict,
    youtube_url: str,
    affiliate_links: list[dict],
) -> str:
    config = _load_config()

    narrations = [s.get("narration", "") for s in script_json.get("scenes", [])]
    script_summary = "\n".join(narrations)[:3000]
    title = script_json.get("title", "")

    user_msg = (
        f"오늘 영상 제목: {title}\n"
        f"유튜브 URL: {youtube_url}\n\n"
        f"대본 요약:\n{script_summary}"
    )
    prompt = f"{SYSTEM_PROMPT}\n\n{user_msg}"

    result = subprocess.run(
        [CLAUDE_CMD, "-p", "-", "--output-format", "text"],
        input=prompt.encode("utf-8"), capture_output=True, timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError("Claude 뉴스레터 생성 실패")

    raw = result.stdout.decode("utf-8", errors="replace").strip()
    nl_data = _extract_json(raw)

    html_body = nl_data.get("html_body", "")
    html_body = html_body.replace("{{YOUTUBE_URL}}", youtube_url)
    html_body = html_body.replace("{{REPORT_CTA}}", _build_report_cta())

    return await _create_mailchimp_campaign(
        config=config,
        subject=nl_data.get("subject", title),
        preview_text=nl_data.get("preview_text", ""),
        html_body=html_body,
    )
