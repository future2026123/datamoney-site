"""Generate and upload one article's locally synthesized Korean speech.

Audio is derived from the currently checked-out article, cached by text, and
published only after all parts and a transcript sanity check pass. Run under the
dedicated DataMoney-TTS environment on the Windows machine with the voice model.
"""

import argparse
import ctypes
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from build_speech_manifests import VOICE_PROFILE_ID, build_manifest
from local_speech_storage import BUCKET, client, upload
from speech_timing import timing_for, timing_key

ROOT = Path(__file__).resolve().parents[1]
TOOL_ROOT = Path(r"D:\Tools\DataMoney-TTS")
MODEL = TOOL_ROOT / "models" / "qwen3-0.6b-base"
REF_AUDIO = TOOL_ROOT / "samples" / "qwen-female-design.wav"
REF_TEXT = ("주식으로 천만 원을 잃은 사람이 있다고 가정해 보자. "
            "그는 매일 계좌를 확인한다. 지난달에도, 이번 달에도 손실이 이어진다.")
CACHE = TOOL_ROOT / "local-voice-cache"
MODEL_VERSION = "qwen3-0.6b-base-5d839924-fp32-female-v1-group150"
MAX_GROUP = 150
MAX_BUCKET_BYTES = 8_000_000_000


def idle_seconds():
    """Read Windows input idle time without changing the user's desktop."""
    if os.name != "nt":
        return 0
    class LastInput(ctypes.Structure):
        _fields_ = [("size", ctypes.c_uint), ("tick", ctypes.c_uint)]
    info = LastInput(ctypes.sizeof(LastInput), 0)
    if not ctypes.windll.user32.GetLastInputInfo(ctypes.byref(info)):
        return 0
    current = ctypes.windll.kernel32.GetTickCount() & 0xffffffff
    return ((current - info.tick) & 0xffffffff) / 1000


def grouped_text(chunks):
    """Combine adjacent short blocks while retaining every word and its order."""
    groups, pending = [], ""
    for item in chunks:
        text = item["text"].strip()
        candidate = (pending + " " + text).strip()
        if pending and len(candidate) > MAX_GROUP:
            groups.append(pending)
            pending = text
        else:
            pending = candidate
    if pending:
        groups.append(pending)
    if " ".join(groups) != " ".join(item["text"].strip() for item in chunks):
        raise ValueError("Audio grouping changed the article text")
    if not groups or any(len(item) > MAX_GROUP for item in groups):
        raise ValueError("Invalid audio group length")
    return groups


def group_hash(text):
    reference = hashlib.sha256(REF_AUDIO.read_bytes()).hexdigest()
    return hashlib.sha256((MODEL_VERSION + "\n" + reference + "\n" + text).encode("utf-8")).hexdigest()


def valid_wav(path, text):
    import soundfile as sf
    try:
        info = sf.info(str(path))
        return info.channels == 1 and info.samplerate == 24000 and max(.25, len(text) * .025) <= info.duration <= 120
    except (OSError, RuntimeError):
        return False


def normalize(text):
    text = unicodedata.normalize("NFKC", text).lower()
    return "".join(ch for ch in text if ch.isalnum())


def transcript_check(audio, expected):
    """Reject obvious omissions; a pass does not certify exact pronunciation."""
    from faster_whisper import WhisperModel

    model_root = Path.home() / ".cache" / "huggingface" / "hub" / "models--Systran--faster-whisper-small" / "snapshots"
    choices = sorted(p for p in model_root.iterdir() if (p / "model.bin").is_file())
    if not choices:
        raise RuntimeError("Local speech verification model is unavailable")
    model = WhisperModel(str(choices[-1]), device="cpu", compute_type="int8", cpu_threads=3, local_files_only=True)
    segments, _ = model.transcribe(str(audio), language="ko", beam_size=5,
                                   condition_on_previous_text=False, word_timestamps=True)
    segments = list(segments)
    transcript = " ".join(segment.text for segment in segments)
    words = [{"text": word.word, "start": word.start, "end": word.end}
             for segment in segments for word in segment.words or []]
    a, b = normalize(expected), normalize(transcript)
    ratio = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
    # A number disappearing entirely may change a financial claim. This check is
    # deliberately conservative; ambiguous number readings require human review.
    numbers = {match.replace(",", "").replace(".", "") for match in re.findall(r"\d[\d,.]*", expected)}
    spoken_digits = "".join(re.findall(r"\d+", transcript))
    missing = sorted(value for value in numbers if value not in spoken_digits)
    return {"similarity": round(ratio, 4), "missing_numbers": missing, "transcript": transcript, "words": words,
            "passed": ratio >= .72 and not missing}


def render_mp3(wavs, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="dm-audio-") as directory:
        playlist = Path(directory) / "playlist.txt"
        playlist.write_text("".join("file '" + p.as_posix().replace("'", "'\\''") + "'\n" for p in wavs), encoding="utf-8")
        temporary = Path(directory) / "article.mp3"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                        "-i", str(playlist), "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "48k",
                        "-ar", "24000", "-ac", "1", str(temporary)], check=True)
        if temporary.stat().st_size < 1000:
            raise RuntimeError("Generated MP3 is unexpectedly small")
        target.write_bytes(temporary.read_bytes())


def bucket_bytes(storage):
    paginator = storage.get_paginator("list_objects_v2")
    return sum(obj["Size"] for page in paginator.paginate(Bucket=BUCKET) for obj in page.get("Contents", []))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slug", help="Article folder inside blog/")
    parser.add_argument("--source-root", type=Path, default=ROOT, help="Clean checkout of the published site")
    parser.add_argument("--max-groups", type=int, help="Make a local preview only")
    parser.add_argument("--upload", action="store_true", help="Upload only a complete, verified article")
    parser.add_argument("--alignment-only", action="store_true", help="Add timing to an existing recording")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yield-when-active", action="store_true", help="Pause after a group when desktop activity resumes")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,95}", args.slug):
        parser.error("Invalid article slug")
    if args.max_groups is not None and (args.max_groups < 1 or args.upload):
        parser.error("A partial preview cannot be uploaded")
    if args.alignment_only and (not args.upload or args.max_groups is not None or args.dry_run):
        parser.error("Alignment-only mode requires --upload and a complete recording")
    source = args.source_root / "blog" / args.slug / "index.html"
    source_text = source.read_text(encoding="utf-8")
    manifest = build_manifest(source_text)
    if manifest["voice"] != VOICE_PROFILE_ID:
        print("This article uses a separately managed voice; local female generation is disabled.", flush=True)
        raise SystemExit(20)
    groups = grouped_text(manifest["chunks"])
    chosen = groups[:args.max_groups] if args.max_groups else groups
    job = CACHE / "articles" / args.slug / manifest["content_id"]
    wavs = [] if args.alignment_only else [CACHE / "groups" / (group_hash(value) + ".wav") for value in chosen]
    missing = [] if args.alignment_only else [i for i, (p, text) in enumerate(zip(wavs, chosen)) if not valid_wav(p, text)]
    print(f"Article: {args.slug}; groups: {len(chosen)}/{len(groups)}; to generate: {len(missing)}", flush=True)
    if args.dry_run:
        return
    if missing and not args.alignment_only:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        import numpy as np
        import soundfile as sf
        import torch
        from qwen_tts import Qwen3TTSModel

        if not torch.cuda.is_available() or torch.cuda.mem_get_info()[0] < 6 * 1024**3:
            print("At least 6 GiB of available GPU memory is needed; retry later.", flush=True)
            raise SystemExit(10)
        torch.set_num_threads(3)
        model = Qwen3TTSModel.from_pretrained(str(MODEL), device_map="cuda:0", dtype=torch.float32,
                                               attn_implementation="sdpa", local_files_only=True)
        prompt = model.create_voice_clone_prompt(ref_audio=str(REF_AUDIO), ref_text=REF_TEXT)
        (CACHE / "groups").mkdir(parents=True, exist_ok=True)
        for i in missing:
            if args.yield_when_active and idle_seconds() < 30:
                print("Desktop activity resumed; cached audio is retained and generation will retry later.", flush=True)
                raise SystemExit(10)
            seed = int(hashlib.sha256(chosen[i].encode("utf-8")).hexdigest()[:8], 16)
            torch.manual_seed(seed)
            print(f"Generating {i + 1}/{len(chosen)}", flush=True)
            with torch.inference_mode():
                waves, rate = model.generate_voice_clone(text=chosen[i], language="Korean", voice_clone_prompt=prompt)
            if not waves or not len(waves[0]) or not np.isfinite(waves[0]).all() or rate != 24000:
                raise RuntimeError(f"Invalid generated audio at group {i + 1}")
            temp = wavs[i].with_suffix(".partial.wav")
            sf.write(str(temp), waves[0], rate)
            if not valid_wav(temp, chosen[i]):
                raise RuntimeError(f"Generated audio failed duration validation at group {i + 1}")
            temp.replace(wavs[i])
        del model, prompt
        torch.cuda.empty_cache()
    output = job / ("preview.mp3" if args.max_groups else "article.mp3")
    if args.alignment_only:
        if not output.is_file():
            output.parent.mkdir(parents=True, exist_ok=True)
            temporary = output.with_suffix(".download.partial")
            client().download_file(BUCKET, f"audio/articles/{args.slug}/{manifest['content_id']}.mp3", str(temporary))
            temporary.replace(output)
    else:
        render_mp3(wavs, output)
    print(f"Local audio ready: {output}; bytes: {output.stat().st_size}", flush=True)
    if not args.upload:
        return
    review = transcript_check(output, " ".join(groups))
    (job / "transcript-review.json").write_text(json.dumps(review, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Transcript similarity: {review['similarity']}; missing numeric tokens: {len(review['missing_numbers'])}", flush=True)
    if not review["passed"]:
        print("Audio requires review; it was not uploaded.", flush=True)
        raise SystemExit(20)
    timing = timing_for(source_text, review["words"], manifest["content_id"])
    timing_path = job / "sentence-timing-v1.json"
    timing_path.write_text(json.dumps(timing, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Sentence timestamps aligned: {len(timing['cues'])}", flush=True)
    if args.alignment_only:
        if not timing["cues"]:
            print("Sentence timing requires review; no timing data was uploaded.", flush=True)
            raise SystemExit(20)
        if bucket_bytes(client()) + timing_path.stat().st_size > MAX_BUCKET_BYTES:
            print("Dedicated audio bucket has reached its 8 GB safety limit.", flush=True)
            raise SystemExit(30)
        upload(timing_path, timing_key(args.slug, manifest["content_id"]), "application/json",
               "public, max-age=31536000, immutable")
        print("Sentence timing uploaded for existing audio", flush=True)
        return
    remote = f"audio/articles/{args.slug}/{manifest['content_id']}.mp3"
    index = {"version": 1, "voice": manifest["voice"], "content_id": manifest["content_id"], "audio": remote}
    index_path = job / "availability.json"
    index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    storage = client()
    total = bucket_bytes(storage)
    if total + output.stat().st_size + index_path.stat().st_size + timing_path.stat().st_size > MAX_BUCKET_BYTES:
        print("Dedicated audio bucket has reached its 8 GB safety limit; audio was not uploaded.", flush=True)
        raise SystemExit(30)
    upload(output, remote, "audio/mpeg", "public, max-age=31536000, immutable")
    remote_info = storage.head_object(Bucket=BUCKET, Key=remote)
    if remote_info.get("ContentLength") != output.stat().st_size:
        raise RuntimeError("Uploaded audio size does not match local file; index was not published")
    expected_digest = hashlib.sha256(output.read_bytes()).digest()
    body = storage.get_object(Bucket=BUCKET, Key=remote)["Body"]
    remote_digest = hashlib.sha256()
    try:
        for block in iter(lambda: body.read(1024 * 1024), b""):
            remote_digest.update(block)
    finally:
        body.close()
    if remote_digest.digest() != expected_digest:
        raise RuntimeError("Uploaded audio checksum mismatch; index was not published")
    if timing["cues"]:
        upload(timing_path, timing_key(args.slug, manifest["content_id"]), "application/json",
               "public, max-age=31536000, immutable")
    upload(index_path, f"audio/manifests/{args.slug}/{manifest['content_id']}.json", "application/json",
           "public, max-age=31536000, immutable")
    print("Verified audio and availability index uploaded", flush=True)


if __name__ == "__main__":
    main()
