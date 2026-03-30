/**
 * Cloudflare Worker — datamoney.kr/go/* 제휴 링크 리디렉터
 * 클릭 수 카운팅 + 실제 제휴 URL로 302 리다이렉트
 */

const LINKS = {
  // 증권사
  "toss":         "https://toss.im/securities",
  "kiwoom":       "https://www.kiwoom.com",
  "samsung":      "https://www.samsungpop.com",
  "nh-isa":       "https://www.nhqv.com",
  "mirae-pension":"https://www.miraeasset.com/pension",
  "tossbank":     "https://tossbank.com/savings",
  // 도구 (내부 페이지)
  "etf":          "https://datamoney.kr/tools/etf-calculator",
  "tax":          "https://datamoney.kr/tools/tax-simulator",
  "dividend":     "https://datamoney.kr/tools/dividend-calculator",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // /go/toss → slug = "toss"
    const slug = url.pathname.replace(/^\/go\//, "").replace(/\/$/, "");

    const dest = LINKS[slug];
    if (!dest) {
      return new Response("Not Found", { status: 404 });
    }

    // 클릭 로깅 (KV 바인딩 있을 때만)
    if (env.CLICK_KV) {
      ctx.waitUntil(
        env.CLICK_KV.get(slug).then(async (val) => {
          const count = (parseInt(val) || 0) + 1;
          await env.CLICK_KV.put(slug, String(count));
        })
      );
    }

    return Response.redirect(dest, 302);
  },
};
