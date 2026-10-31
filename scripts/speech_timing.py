"""Match spoken word timestamps to the readable sentences of an article.

The timestamps come from the local speech recognizer. They are approximate and
are omitted for a sentence when the recognized words are not a reliable match.
"""

import difflib
import re
import unicodedata

from build_speech_manifests import article_parts


def normalized(text):
    return "".join(char for char in unicodedata.normalize("NFKC", text).lower() if char.isalnum())


def sentences(source):
    result = []
    for part in article_parts(source):
        # Do not split decimal numbers; a boundary requires whitespace or end.
        for text in re.split(r"(?<=[.!?。！？])\s+(?=\S)", part):
            text = text.strip()
            if text and normalized(text):
                result.append(text)
    return result


def timing_for(source, words, content_id, *, pieces=None):
    pieces = sentences(source) if pieces is None else pieces
    expected_parts = [normalized(text) for text in pieces]
    expected = "".join(expected_parts)
    recognized = []
    word_for_char = []
    usable = []
    for word in words:
        text = normalized(str(word.get("text", "")))
        start, end = word.get("start"), word.get("end")
        if not text or not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
            continue
        if start < 0 or end < start:
            continue
        index = len(usable)
        usable.append((float(start), float(end)))
        recognized.append(text)
        word_for_char.extend([index] * len(text))
    found = "".join(recognized)
    if not expected or not found:
        return {"version": 1, "content_id": content_id, "cues": []}

    matches = {}
    for match in difflib.SequenceMatcher(None, expected, found, autojunk=False).get_matching_blocks():
        for offset in range(match.size):
            matches[match.a + offset] = word_for_char[match.b + offset]

    cues, offset = [], 0
    for text, norm in zip(pieces, expected_parts):
        indices = [matches[pos] for pos in range(offset, offset + len(norm)) if pos in matches]
        offset += len(norm)
        coverage = len(indices) / len(norm)
        if not indices or coverage < 0.65:
            continue
        start, end = usable[indices[0]][0], usable[indices[-1]][1]
        # A spurious long-distance match should never light an unrelated text.
        if end <= start or end - start > max(15, len(norm) * 0.6):
            continue
        if cues and start < cues[-1]["start"]:
            continue
        cues.append({"text": text, "start": round(start, 3), "end": round(end, 3)})
    return {"version": 1, "content_id": content_id, "cues": cues}


def timing_key(slug, content_id):
    return f"audio/manifests/{slug}/{content_id}-cues-v1.json"
