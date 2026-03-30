import json
import subprocess
import yaml
import httpx
from datetime import datetime, date
from pathlib import Path

CLAUDE_CMD = r"C:\Users\withc\AppData\Roaming\npm\claude.cmd"
_BASE_DIR = Path(__file__).parent.parent.parent  # datamoney/
_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_OUTPUT_DIR = _BASE_DIR / "output"

SYSTEM_PROMPT = """너는 금융 데이터 애널리스트다.
이번 주 데이터머니 영상들의 핵심 데이터를 주간 리포트로 정리해라.

구성:
1. 이번 주 핵심 지표 요약 (수치 5개)
2. 주목할 트렌드 3가지
3. 다음 주 주목 이슈 2가지
4. 데이터 테이블

출력: 아래 JSON만. 다른 텍스트 절대 금지.
{
  "title": "리포트 제목",
  "week_label": "YYYY년 MM월 W주차",
  "key_metrics": [
    {"label": "지표명", "value": "수치", "change": "+/-변동"}
  ],
  "trends": [
    {"title": "트렌드 제목", "summary": "요약"}
  ],
  "next_issues": [
    {"title": "이슈 제목", "detail": "상세"}
  ],
  "data_table": [
    {"항목": "...", "이번주": "...", "전주": "...", "변화": "..."}
  ],
  "html_content": "완성된 HTML 리포트 본문 (A4 8페이지 분량)"
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


def _collect_weekly_scripts() -> list[dict]:
    """지난 7일 output/ 폴더에서 script.json 수집."""
    scripts = []
    if not _OUTPUT_DIR.exists():
        return scripts
    today = date.today()
    for day_dir in sorted(_OUTPUT_DIR.iterdir(), reverse=True):
        if not day_dir.is_dir():
            continue
        try:
            dir_date = date.fromisoformat(day_dir.name)
        except ValueError:
            continue
        if (today - dir_date).days > 7:
            continue
        script_path = day_dir / "script.json"
        if script_path.exists():
            with open(script_path, encoding="utf-8") as f:
                scripts.append(json.load(f))
    return scripts


def _render_pdf(html_content: str, output_path: Path) -> None:
    """WeasyPrint로 HTML → PDF 변환."""
    try:
        from weasyprint import HTML
        HTML(string=html_content).write_pdf(str(output_path))
        print(f"  → PDF 생성: {output_path}")
    except ImportError:
        raise RuntimeError(
            "WeasyPrint 미설치. 설치: pip install weasyprint --break-system-packages"
        )


async def _register_lemon_squeezy(pdf_path: Path, title: str, config: dict) -> str:
    """Lemon Squeezy에 PDF 상품 등록."""
    report_cfg = config.get("report", {})
    store_id = report_cfg.get("lemon_squeezy_store_id", "")
    price_krw = report_cfg.get("price_krw", 9900)
    ls_key = config.get("apis", {}).get("lemon_squeezy_key", "")

    if not ls_key or not store_id or "XXXXX" in str(store_id):
        print("  [LS 스킵] Lemon Squeezy 미설정")
        return ""

    async with httpx.AsyncClient() as client:
        # 1. 상품 생성
        resp = await client.post(
            "https://api.lemonsqueezy.com/v1/products",
            json={
                "data": {
                    "type": "products",
                    "attributes": {
                        "name": title,
                        "price": price_krw,
                        "buy_now_url": True,
                    },
                    "relationships": {
                        "store": {"data": {"type": "stores", "id": store_id}}
                    },
                }
            },
            headers={
                "Authorization": f"Bearer {ls_key}",
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            timeout=30,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"LS 상품 등록 실패: {resp.text[:200]}")

        product_url = resp.json().get("data", {}).get("attributes", {}).get("buy_now_url", "")
        print(f"  → Lemon Squeezy 등록 완료: {product_url}")
        return product_url


async def check_weekly_report() -> str:
    """월요일에만 실행. 주간 리포트 생성 + Lemon Squeezy 등록."""
    config = _load_config()
    report_cfg = config.get("report", {})
    schedule_day = report_cfg.get("schedule_day", "monday")

    today = datetime.now()
    weekday_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    if weekday_names[today.weekday()] != schedule_day.lower():
        print(f"  [리포트 스킵] 오늘은 {schedule_day}가 아님")
        return ""

    print("  [리포트] 주간 리포트 생성 시작...")
    scripts = _collect_weekly_scripts()
    if not scripts:
        print("  [리포트 스킵] 이번 주 수집된 대본 없음")
        return ""

    # 대본 요약 (토큰 절약)
    summaries = []
    for i, s in enumerate(scripts[:7], 1):
        title = s.get("title", f"영상{i}")
        narrations = " ".join(scene.get("narration", "") for scene in s.get("scenes", []))
        summaries.append(f"[영상{i}] {title}\n{narrations[:500]}")
    weekly_text = "\n\n".join(summaries)

    week_num = (today.day - 1) // 7 + 1
    week_label = f"{today.year}년 {today.month}월 {week_num}주차"

    user_msg = f"이번 주 ({week_label}) 영상 대본 목록:\n\n{weekly_text}"
    prompt = f"{SYSTEM_PROMPT}\n\n{user_msg}"

    result = subprocess.run(
        [CLAUDE_CMD, "-p", "-", "--output-format", "text"],
        input=prompt.encode("utf-8"), capture_output=True, timeout=600,
    )
    if result.returncode != 0:
        raise RuntimeError("Claude 리포트 생성 실패")

    raw = result.stdout.decode("utf-8", errors="replace").strip()
    report_data = _extract_json(raw)

    # 템플릿 로드 + 렌더
    template_path = _TEMPLATES_DIR / "report.html"
    with open(template_path, encoding="utf-8") as f:
        template = f.read()

    html_content = template.replace("{{REPORT_CONTENT}}", report_data.get("html_content", ""))
    html_content = html_content.replace("{{WEEK_LABEL}}", report_data.get("week_label", week_label))
    html_content = html_content.replace("{{REPORT_TITLE}}", report_data.get("title", "주간 금융 리포트"))

    # PDF 저장
    output_dir = _OUTPUT_DIR / today.strftime("%Y-%m-%d")
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"report_{today.strftime('%Y%m%d')}.pdf"

    _render_pdf(html_content, pdf_path)

    # Lemon Squeezy 등록
    report_title = f"데이터머니 {report_data.get('week_label', week_label)} 주간 리포트"
    product_url = await _register_lemon_squeezy(pdf_path, report_title, config)

    return product_url
