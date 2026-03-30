"""
datamoney.kr 수익화 파이프라인 — 원클릭 전체 실행
기존 run.py에서 YouTube 업로드 완료 후 호출됨.

사용법:
  단독 실행: python -m datamoney_site.run_publish
  연동 호출: from datamoney_site.run_publish import main as run_site
             await run_site(script_json=..., topic_json=..., youtube_url=...)
"""
import asyncio
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from datamoney_site.pipeline.affiliate  import attach_affiliate_links
from datamoney_site.pipeline.blog       import publish_blog_post
from datamoney_site.pipeline.newsletter import send_newsletter
from datamoney_site.pipeline.report     import check_weekly_report


async def main(
    script_json: dict,
    topic_json: dict,
    youtube_url: str = "",
) -> dict:
    """
    수익화 파이프라인 전체 실행.

    Returns:
        dict with keys: blog_url, campaign_id, report_url
    """
    results = {}

    print("\n[datamoney.kr] 수익화 파이프라인 시작")

    # 1. 제휴 링크 결정 (블로그·뉴스레터에 공통 사용)
    print("[1/4] 제휴 링크 선택 중...")
    links = await attach_affiliate_links(topic_json)

    # 2. 블로그 포스트 생성 + WordPress 업로드
    print("[2/4] 블로그 포스트 생성 중...")
    try:
        blog_url = await publish_blog_post(
            script_json=script_json,
            topic_json=topic_json,
            affiliate_links=links,
            youtube_url=youtube_url,
        )
        results["blog_url"] = blog_url
    except Exception as e:
        print(f"  [경고] 블로그 발행 실패: {e}")
        results["blog_url"] = ""

    # 3. 뉴스레터 발송
    print("[3/4] 뉴스레터 발송 중...")
    try:
        campaign_id = await send_newsletter(
            script_json=script_json,
            youtube_url=youtube_url,
            affiliate_links=links,
        )
        results["campaign_id"] = campaign_id
    except Exception as e:
        print(f"  [경고] 뉴스레터 발송 실패: {e}")
        results["campaign_id"] = ""

    # 4. 주간 리포트 (월요일만 실행)
    print("[4/4] 주간 리포트 확인 중...")
    try:
        report_url = await check_weekly_report()
        results["report_url"] = report_url
    except Exception as e:
        print(f"  [경고] 리포트 생성 실패: {e}")
        results["report_url"] = ""

    print("[datamoney.kr] 수익화 파이프라인 완료")
    if results.get("blog_url"):
        print(f"  블로그: {results['blog_url']}")
    if results.get("campaign_id"):
        print(f"  뉴스레터 발송됨 (campaign_id={results['campaign_id']})")
    if results.get("report_url"):
        print(f"  리포트: {results['report_url']}")

    return results


if __name__ == "__main__":
    # 단독 테스트용 더미 데이터
    dummy_script = {
        "title": "[테스트] ETF 투자 전략",
        "scenes": [
            {"id": "S01", "narration": "오늘은 ETF 투자 전략을 알아봅니다."},
        ],
    }
    dummy_topic = {
        "topic": "ETF 적립식 투자 전략",
        "angle": "초보 투자자 관점",
        "tags": ["ETF", "적립식투자", "재테크"],
        "grade": "A",
        "score": 82,
        "titles": [{"pattern": "숫자형", "text": "ETF 매달 50만원 투자하면 20년 후 얼마?"}],
    }
    asyncio.run(main(dummy_script, dummy_topic, youtube_url="https://youtu.be/test"))
