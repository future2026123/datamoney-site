"""Notify IndexNow about changed, public DataMoney pages after deployment."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
HOST = "datamoney.kr"
ORIGIN = "https://" + HOST
KEY_FILE = ROOT / "indexnow-key.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"
TOOL_URLS = {
    "etf_calculator": "/tools/etf-calculator",
    "tax_simulator": "/tools/tax-simulator",
    "dividend_calculator": "/tools/dividend-calculator",
}


def page_url(path):
    """Map a deployed HTML source path to its public canonical URL."""
    parts = path.split("/")
    if path in ("index.html", "blog/index.html"):
        return ORIGIN + "/blog/"
    if path == "tools/index.html":
        return ORIGIN + "/tools/"
    if path in ("about/index.html", "privacy/index.html"):
        return ORIGIN + "/" + parts[0] + "/"
    if len(parts) == 3 and parts[2] == "index.html":
        if parts[0] == "blog" and parts[1] not in (".", ".."):
            return ORIGIN + "/blog/" + quote(parts[1], safe="-._~") + "/"
        if parts[0] == "tools" and parts[1] in TOOL_URLS:
            return ORIGIN + TOOL_URLS[parts[1]]
    return None


def changed_urls(before, after):
    if not before or re.fullmatch("0+", before):
        raise ValueError("A non-empty previous Git revision is required")
    subprocess.run(["git", "merge-base", "--is-ancestor", before, after],
                   cwd=ROOT, check=True)
    output = subprocess.check_output(
        ["git", "diff", "--name-only", "--no-renames", "-z", before, after, "--"],
        cwd=ROOT,
    )
    names = output.decode("utf-8").split("\0")
    return sorted({url for path in names if (url := page_url(path))})


def check_urls(urls):
    for url in urls:
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or parsed.netloc != HOST or
                parsed.username or parsed.password or parsed.fragment):
            raise ValueError("URL is outside the DataMoney HTTPS host: " + url)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", help="Git revision before deployment")
    parser.add_argument("--after", default="HEAD", help="Deployed Git revision")
    parser.add_argument("--url", action="append", default=[], help="Changed URL")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    urls = set(args.url)
    if args.before:
        urls.update(changed_urls(args.before, args.after))
    urls = sorted(urls)
    check_urls(urls)
    if not urls:
        print("IndexNow: no changed public HTML pages to submit")
        return 0

    key = KEY_FILE.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"[A-Za-z0-9-]{8,128}", key):
        raise ValueError("Invalid IndexNow key file")
    if args.dry_run:
        print("IndexNow dry run: {} changed URLs".format(len(urls)))
        for url in urls:
            print(url)
        return 0

    payload = {"host": HOST, "key": key,
               "keyLocation": ORIGIN + "/indexnow-key.txt", "urlList": urls}
    request = Request(ENDPOINT, data=json.dumps(payload).encode("utf-8"), method="POST",
                      headers={"Content-Type": "application/json; charset=utf-8",
                               "User-Agent": "DataMoney-IndexNow/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            status = response.status
    except HTTPError as error:
        print("IndexNow rejected the submission: HTTP {}".format(error.code), file=sys.stderr)
        return 1
    except URLError as error:
        print("IndexNow could not be reached: {}".format(error.reason), file=sys.stderr)
        return 1
    if status == 200:
        print("IndexNow: HTTP 200, {} changed URLs submitted".format(len(urls)))
    elif status == 202:
        print("IndexNow: HTTP 202, {} URLs received; key validation pending".format(len(urls)))
    else:
        print("IndexNow: unexpected HTTP {}".format(status), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
