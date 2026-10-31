"""Identify English sentences without changing Korean financial abbreviations."""
import re

HANGUL = re.compile(r"[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]")
LATIN = re.compile(r"[A-Za-z]")
SENTENCE_END = re.compile(r"[.!?。！？][”’\"'」』)]*(?:\[\d{1,3}\])?(?=\s|$)")
QUOTED_SENTENCE = re.compile(r'"[^"\n]*[.!?]"|“[^”\n]*[.!?]”')

# The language rule and voice names are part of the recording's cache identity.
LANGUAGE_ROUTING_VERSION = "english-sentences-en-us-v1"
ENGLISH_MALE_VOICE = "en-US-GuyNeural"
ENGLISH_FEMALE_VOICE = "en-US-JennyNeural"


def is_english(text):
    """An English sentence has no Hangul and enough Latin letters for prose.

    Short financial tickers stay with the Korean reader and its pronunciation
    dictionary. Entire English quotations, including their acronyms, stay intact.
    """
    if HANGUL.search(text) or len(LATIN.findall(text)) < 2:
        return False
    return bool(re.search(r"[a-z]", text) or re.search(r"[A-Z]{2,}\s+[A-Z]{2,}", text))


def split_sentences(text):
    """Retain punctuation, closing quotes and citation markers with a sentence."""
    result, start = [], 0
    for match in SENTENCE_END.finditer(text):
        value = text[start:match.end()].strip()
        if value:
            result.append(value)
        start = match.end()
    value = text[start:].strip()
    if value:
        result.append(value)
    return result


def language_segments(parts):
    """Return ordered language-tagged text without dropping visible words."""
    result = []
    for part in parts:
        # Keeping a whole English block together avoids breaking abbreviations.
        pieces = [part.strip()] if is_english(part) else split_sentences(part)
        expanded = []
        for piece in pieces:
            start = 0
            for match in QUOTED_SENTENCE.finditer(piece):
                if not is_english(match.group()):
                    continue
                if piece[start:match.start()].strip():
                    expanded.append(piece[start:match.start()].strip())
                expanded.append(match.group())
                start = match.end()
            if piece[start:].strip():
                expanded.append(piece[start:].strip())
        block = []
        for value in expanded:
            if value:
                language = "en" if is_english(value) else "ko"
                if block and block[-1][0] == language:
                    block[-1] = (language, block[-1][1] + " " + value)
                else:
                    block.append((language, value))
        result.extend(block)
    return result


def korean_review_parts(parts):
    """Keep per-paragraph abbreviation review while excluding English quotes."""
    return [" ".join(text for lang, text in language_segments([part]) if lang == "ko")
            for part in parts]
