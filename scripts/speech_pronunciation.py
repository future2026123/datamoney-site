"""Use the same pronunciation dictionary in generated and device voices."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "blog" / "article-speech.js"
MATCH = re.compile(r"/\* dm-pronunciations:start \*/\s*(\[.*?\])\s*/\* dm-pronunciations:end \*/", re.DOTALL)
found = MATCH.search(SOURCE.read_text(encoding="utf-8"))
if not found:
    raise RuntimeError("The shared speech pronunciation dictionary is missing")
RULES = json.loads(found.group(1))
COMPILED = [(re.compile(r"(^|[^A-Za-z0-9])(?:" + rule["pattern"] + r")(?![A-Za-z0-9])",
                        re.IGNORECASE if rule.get("ignoreCase") else 0), rule["spoken"])
            for rule in RULES]


def prepare_pronunciation(text):
    for pattern, spoken in COMPILED:
        text = pattern.sub(lambda match: match.group(1) + spoken, text)
    return text


def unknown_financial_terms(parts):
    """Report unlisted capitalized terms in Korean blocks for pronunciation review."""
    unknown = set()
    for part in parts:
        if len(re.findall(r"[가-힣]", part)) < 2:
            continue
        prepared = prepare_pronunciation(part)
        unknown.update(re.findall(r"(?<![A-Za-z0-9])[A-Z][A-Z0-9]{1,11}(?![A-Za-z0-9])", prepared))
    return sorted(unknown)
