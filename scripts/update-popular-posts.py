"""Build the public popular-post list from Cloudflare's page-request analytics."""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
OUTPUT = BLOG / "popular-posts.json"
SITE = "datamoney.kr"
PERIOD_DAYS = 28
LIMIT = 5


class TitleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, value):
        if self.in_title:
            self.parts.append(value)


def article_titles():
    result = {}
    for directory in BLOG.iterdir():
        index = directory / "index.html"
        if not directory.is_dir() or not index.is_file():
            continue
        parser = TitleParser()
        parser.feed(index.read_text(encoding="utf-8"))
        title = re.sub(r"\s*[|｜]\s*데이터\s*머니.*$", "", "".join(parser.parts)).strip()
        if title:
            result[f"/blog/{directory.name}/"] = title
    return result


def make_ranking(rows, titles):
    totals = {}
    for row in rows:
        path = (row.get("dimensions") or {}).get("clientRequestPath", "")
        if not isinstance(path, str) or not path.startswith("/blog/"):
            continue
        path = path.rstrip("/") + "/"
        count = row.get("count")
        if path not in titles or not isinstance(count, (int, float)) or count <= 0:
            continue
        totals[path] = totals.get(path, 0) + count
    ordered = sorted(totals, key=lambda path: (-totals[path], path))[:LIMIT]
    return [{"path": path, "title": titles[path]} for path in ordered]


def valid_saved_data(data, titles):
    if not isinstance(data, dict) or data.get("basis") != "cloudflare_page_requests":
        return False
    if not data.get("generatedAt") or data.get("periodDays") != PERIOD_DAYS:
        return False
    posts = data.get("posts")
    return isinstance(posts, list) and 0 < len(posts) <= LIMIT and all(
        isinstance(post, dict) and post.get("path") in titles for post in posts
    )


def save(data):
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def preserve_published(titles):
    """Keep the last successful list if analytics is temporarily unavailable."""
    try:
        request = urllib.request.Request(
            "https://datamoney.kr/blog/popular-posts.json",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            data = json.load(response)
        if valid_saved_data(data, titles):
            data["posts"] = [{"path": p["path"], "title": titles[p["path"]]} for p in data["posts"]]
            save(data)
    except (OSError, ValueError, KeyError, TypeError):
        pass


def cloudflare_json(url, token, body=None):
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.load(response)
    if data.get("success") is False or data.get("errors"):
        raise RuntimeError("Cloudflare did not grant access to the requested analytics.")
    return data


def refresh(token, titles):
    zones = cloudflare_json("https://api.cloudflare.com/client/v4/zones?name=datamoney.kr", token)
    account_id = os.environ.get("CF_ACCOUNT_ID", "")
    zone = next(
        (z for z in zones.get("result", [])
         if z.get("name") == SITE and (not account_id or z.get("account", {}).get("id") == account_id)),
        None,
    )
    if not zone:
        raise RuntimeError("The datamoney.kr zone was not available to this token.")
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=PERIOD_DAYS)
    start_iso = start.isoformat().replace("+00:00", "Z")
    end_iso = end.isoformat().replace("+00:00", "Z")
    query = f"""
    {{
      viewer {{
        zones(filter: {{ zoneTag: {json.dumps(zone["id"])} }}) {{
          httpRequestsAdaptiveGroups(
            filter: {{
              datetime_geq: {json.dumps(start_iso)}
              datetime_lt: {json.dumps(end_iso)}
              requestSource: "eyeball"
              clientRequestHTTPHost: "datamoney.kr"
              clientRequestPath_like: "/blog/%"
              edgeResponseStatus_geq: 200
              edgeResponseStatus_lt: 300
            }}
            limit: 5000
            orderBy: [count_DESC]
          ) {{ count dimensions {{ clientRequestPath }} }}
        }}
      }}
    }}
    """
    data = cloudflare_json("https://api.cloudflare.com/client/v4/graphql", token, {"query": query})
    zones_data = ((data.get("data") or {}).get("viewer") or {}).get("zones") or []
    if not zones_data:
        raise RuntimeError("Cloudflare returned no analytics for this zone.")
    rows = zones_data[0].get("httpRequestsAdaptiveGroups", [])
    save({
        "generatedAt": end.isoformat(),
        "periodDays": PERIOD_DAYS,
        "basis": "cloudflare_page_requests",
        "posts": make_ranking(rows, titles),
    })
    print("Popular-post order updated from Cloudflare.")


def main():
    titles = article_titles()
    preserve_published(titles)
    token = os.environ.get("CF_ANALYTICS_TOKEN", "").strip()
    updated = False
    if not token:
        print("Cloudflare analytics token is not configured; keeping the last available list.")
    else:
        try:
            refresh(token, titles)
            updated = True
        except (OSError, ValueError, KeyError, TypeError, RuntimeError) as error:
            print(f"Cloudflare analytics could not be refreshed; keeping the last available list: {type(error).__name__}")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as stream:
            stream.write(f"updated={str(updated).lower()}\n")


if __name__ == "__main__":
    sys.exit(main())
