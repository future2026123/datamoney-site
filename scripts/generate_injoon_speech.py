"""Generate and publish an article's InJoon narration and word-aligned cues.

Runs in the dedicated InJoon environment on the configured Windows PC. Audio
and cue files are uploaded before the availability index and never overwrite
an existing content-addressed object with different bytes.
"""
import argparse
import asyncio
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from build_speech_manifests import article_parts, build_manifest
from speech_timing import normalized, timing_for, timing_key

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(r"D:\Tools\DataMoney-TTS\injoon-article\jobs")
VOICE = "ko-KR-InJoonNeural"
PROFILE = "ko-KR-InJoonNeural-v1"
MAX_BUCKET_BYTES = 8_000_000_000
SENTENCE_END = re.compile(r"[.!?。！？][”’\"'」』)]*(?:\[\d{1,3}\])?(?=\s|$)")


class StorageLimitError(RuntimeError):
    pass


def article_sentences(source):
    """Keep terminal quotation marks and footnote markers with their sentence."""
    result = []
    for part in article_parts(source):
        start = 0
        for match in SENTENCE_END.finditer(part):
            item = part[start:match.end()].strip()
            if item and normalized(item):
                result.append(item)
            start = match.end()
        item = part[start:].strip()
        if item and normalized(item):
            result.append(item)
    return result


def prepare_spoken_text(text):
    """Speak ranges naturally and omit bracketed reference numbers."""
    text = re.sub(r"(?<=[.!?。！？])\[\d{1,3}\](?=\s|$)", "", text)
    return re.sub(r"(?<![\d,])(\d+)\s*[~∼～]\s*(\d+)\s*(개월|년|월|주|일)",
                  lambda match: f"{match[1]}{match[3]}에서 {match[2]}{match[3]}", text)


async def synthesize(text, path):
    import edge_tts

    temporary = path.with_suffix(".partial.mp3")
    events = []
    with temporary.open("wb") as audio:
        async for chunk in edge_tts.Communicate(text, VOICE, boundary="WordBoundary").stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                events.append({"text": chunk["text"], "start": chunk["offset"] / 10_000_000,
                               "end": (chunk["offset"] + chunk["duration"]) / 10_000_000})
                if len(events) % 250 == 0:
                    print(f"Received {len(events)} word timings", flush=True)
    if temporary.stat().st_size < 10000 or len(events) < 20:
        raise RuntimeError("Incomplete audio or timing data; nothing was uploaded")
    os.replace(temporary, path)
    return events


def validate_cues(source, events, content_id):
    expected = article_sentences(source)
    spoken = "".join(normalized(str(item.get("text", ""))) for item in events)
    original = normalized(prepare_spoken_text("\n\n".join(article_parts(source))))
    if not original or difflib.SequenceMatcher(None, original, spoken, autojunk=False).ratio() < .995:
        raise ValueError("The speech service text does not match the article; review required")
    timing = timing_for(source, events, content_id, pieces=expected)
    cues = timing["cues"]
    if [item["text"] for item in cues] != expected:
        raise ValueError("Some article sentences could not be timed; review required")
    for previous, current in zip(cues, cues[1:]):
        if current["start"] < previous["end"]:
            if previous["end"] - current["start"] > .15 or current["start"] <= previous["start"]:
                raise ValueError("Speech sentence timings overlap; review required")
            previous["end"] = current["start"]
    if any(item["end"] <= item["start"] for item in cues):
        raise ValueError("Invalid sentence timings; review required")
    return timing


def encode(source, target):
    temporary = target.with_suffix(".partial.mp3")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                    "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "32k",
                    "-ar", "24000", "-ac", "1", str(temporary)], check=True)
    if temporary.stat().st_size < 10000:
        raise RuntimeError("Encoded audio is unexpectedly small")
    os.replace(temporary, target)


def duration(path):
    output = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                      "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True)
    return float(output.strip())


def put_verified(storage, path, key, content_type):
    from botocore.exceptions import ClientError
    from local_speech_storage import BUCKET

    digest = hashlib.sha256(path.read_bytes()).digest()
    try:
        existing = storage.get_object(Bucket=BUCKET, Key=key)
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
            raise
        existing = None
    if existing is None:
        try:
            with path.open("rb") as body:
                storage.put_object(Bucket=BUCKET, Key=key, Body=body, ContentType=content_type,
                                   CacheControl="public, max-age=31536000, immutable", IfNoneMatch="*")
        except ClientError as exc:
            if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 412:
                raise
        existing = storage.get_object(Bucket=BUCKET, Key=key)
    remote = hashlib.sha256()
    stream = existing["Body"]
    try:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            remote.update(block)
    finally:
        stream.close()
    if remote.digest() != digest:
        raise RuntimeError("A different immutable object already exists or upload verification failed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slug")
    parser.add_argument("--source-root", type=Path, default=ROOT)
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--reuse-events", type=Path, help="Use previously generated local timings")
    parser.add_argument("--reuse-audio", type=Path, help="Use the matching local original MP3")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,95}", args.slug):
        parser.error("Invalid article slug")
    if bool(args.reuse_events) != bool(args.reuse_audio):
        parser.error("Previously generated events and audio must be supplied together")
    source = (args.source_root / "blog" / args.slug / "index.html").read_text(encoding="utf-8")
    manifest = build_manifest(source)
    if manifest["voice"] != PROFILE:
        parser.error("The article does not select the InJoon voice profile")
    blocks = article_parts(source)
    text = prepare_spoken_text("\n\n".join(blocks))
    if len(blocks) < 2 or len(text) < 10 or len(text) > 40_000:
        parser.error("Unexpected article length")
    job = CACHE / args.slug / manifest["content_id"]
    print(f"Article {args.slug}, {len(blocks)} blocks, {len(text)} characters; id {manifest['content_id']}", flush=True)
    if args.dry_run:
        return
    job.mkdir(parents=True, exist_ok=True)
    raw = job / "original.mp3"
    cache_file = job / "source-and-words.json"
    if args.reuse_events:
        payload = json.loads(args.reuse_events.read_text(encoding="utf-8"))
        if payload.get("voice") != VOICE or payload.get("blocks") != blocks or payload.get("spoken_text") != text:
            raise ValueError("Supplied local audio does not match the article text")
        if payload.get("audio_sha256") != hashlib.sha256(args.reuse_audio.read_bytes()).hexdigest():
            raise ValueError("Supplied audio does not match its recorded checksum")
        events = payload["events"]
        raw.write_bytes(args.reuse_audio.read_bytes())
    elif raw.is_file() and cache_file.is_file():
        payload = json.loads(cache_file.read_text(encoding="utf-8"))
        if (payload.get("voice") != VOICE or payload.get("blocks") != blocks or payload.get("spoken_text") != text or
                payload.get("audio_sha256") != hashlib.sha256(raw.read_bytes()).hexdigest()):
            raise ValueError("Cached audio or timings are inconsistent; review required")
        events = payload["events"]
        print("Reusing previously generated audio and word timings", flush=True)
    else:
        events = asyncio.run(synthesize(text, raw))
    payload = {"voice": VOICE, "blocks": blocks, "spoken_text": text, "events": events,
               "audio_sha256": hashlib.sha256(raw.read_bytes()).hexdigest()}
    cache_temp = cache_file.with_suffix(".tmp")
    cache_temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    os.replace(cache_temp, cache_file)
    timing = validate_cues(source, events, manifest["content_id"])
    output = job / "article.mp3"
    encode(raw, output)
    seconds = duration(output)
    if seconds <= 0 or timing["cues"][-1]["end"] > seconds + .25:
        raise ValueError("Audio duration does not match its word timings")
    if timing["cues"][-1]["end"] > seconds:
        timing["cues"][-1]["end"] = seconds
    timing_file = job / "timing.json"
    timing_file.write_text(json.dumps(timing, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    audio_key = f"audio/articles/{args.slug}/{manifest['content_id']}.mp3"
    index = {"version": 1, "voice": PROFILE, "content_id": manifest["content_id"], "audio": audio_key}
    index_file = job / "availability.json"
    index_file.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Prepared {len(timing['cues'])} timed sentences; {seconds:.2f}s; {output.stat().st_size} bytes", flush=True)
    if not args.upload:
        return
    from local_speech_storage import BUCKET, client
    storage = client()
    paginator = storage.get_paginator("list_objects_v2")
    total = sum(item["Size"] for page in paginator.paginate(Bucket=BUCKET) for item in page.get("Contents", []))
    if total + output.stat().st_size + timing_file.stat().st_size + index_file.stat().st_size > MAX_BUCKET_BYTES:
        raise StorageLimitError("The dedicated audio bucket reached its 8 GB limit")
    put_verified(storage, output, audio_key, "audio/mpeg")
    put_verified(storage, timing_file, timing_key(args.slug, manifest["content_id"]), "application/json")
    put_verified(storage, index_file, f"audio/manifests/{args.slug}/{manifest['content_id']}.json", "application/json")
    print("Verified audio, timing data and availability index uploaded", flush=True)


if __name__ == "__main__":
    try:
        main()
    except StorageLimitError as error:
        print(str(error), file=sys.stderr, flush=True)
        raise SystemExit(30)
    except Exception as error:
        # Do not log service URLs or credentials from HTTP exception strings.
        status = getattr(error, "status", None)
        response = getattr(error, "response", None)
        if isinstance(response, dict):
            status = response.get("ResponseMetadata", {}).get("HTTPStatusCode", status)
        if isinstance(error, (TimeoutError, ConnectionError)) or status in (408, 429, 500, 502, 503, 504):
            print(f"Temporary voice or storage service error ({status or type(error).__name__}); retry later", file=sys.stderr, flush=True)
            raise SystemExit(10)
        print(f"InJoon generation requires review ({type(error).__name__}, status {status or 'unknown'})", file=sys.stderr, flush=True)
        raise SystemExit(20)
