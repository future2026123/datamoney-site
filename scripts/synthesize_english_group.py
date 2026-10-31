"""Synthesize one English text group in the dedicated online voice environment."""
import asyncio
import sys
from pathlib import Path

from speech_language import ENGLISH_FEMALE_VOICE


async def synthesize(text, mp3):
    import edge_tts

    size = 0
    with mp3.open("wb") as output:
        async for chunk in edge_tts.Communicate(text, ENGLISH_FEMALE_VOICE).stream():
            if chunk["type"] == "audio":
                output.write(chunk["data"])
                size += len(chunk["data"])
    if not size:
        raise RuntimeError("The English voice returned no audio")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("An output path is required")
        text = sys.stdin.read().strip()
        if not text or len(text) > 150:
            raise ValueError("Unexpected English group length")
        asyncio.run(synthesize(text, Path(sys.argv[1])))
    except Exception as error:
        # Service exceptions can contain request URLs; do not log their contents.
        print(f"English voice failed ({type(error).__name__}); retry later", file=sys.stderr)
        raise SystemExit(10)
