"""Synchronize generated article speech while this Windows PC is idle.

The checkout is dedicated to this service. The runner never resets a dirty
checkout, never publishes audio that failed verification, and preserves partial
generation so it can continue after an interruption.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from build_speech_manifests import VOICE_PROFILE_ID, build_manifest
from generate_local_speech import grouped_text, idle_seconds
from local_speech_storage import BUCKET, client
from speech_timing import timing_key

ROOT = Path(__file__).resolve().parents[1]
TOOL_ROOT = Path(r"D:\Tools\DataMoney-TTS")
CHECKOUT = TOOL_ROOT / "published-site-local-voice"
STATE = TOOL_ROOT / "local-voice-cache" / "runner-state.json"
LOG = TOOL_ROOT / "local-voice-cache" / "runner.log"
PYTHON = TOOL_ROOT / "venv" / "Scripts" / "python.exe"
GENERATOR = ROOT / "scripts" / "generate_local_speech.py"
INJOON_PROFILE = "ko-KR-InJoonNeural-v1"
INJOON_PYTHON = TOOL_ROOT / "injoon-env" / "Scripts" / "python.exe"
INJOON_GENERATOR = ROOT / "scripts" / "generate_injoon_speech.py"
EXPECTED_REMOTE = "https://github.com/future2026123/datamoney-site.git"
MANIFEST_DEPENDENCIES = ("scripts/build_speech_manifests.py", "scripts/speech_pronunciation.py",
                         "scripts/sync_blog_sidebars.py", "blog/article-speech.js")
LOADED_MANIFEST_DEPENDENCIES = {
    path: hashlib.sha256((ROOT / path).read_bytes()).digest() for path in MANIFEST_DEPENDENCIES
}


def log(message):
    print(datetime.now(timezone.utc).isoformat(timespec="seconds"), message, flush=True)


def git(*args):
    return subprocess.check_output(["git", "-C", str(CHECKOUT), *args], text=True, encoding="utf-8").strip()


def sync_checkout():
    if not (CHECKOUT / ".git").is_dir():
        raise RuntimeError("The dedicated published-site checkout is missing")
    if git("remote", "get-url", "origin").rstrip("/") != EXPECTED_REMOTE:
        raise RuntimeError("The dedicated checkout has an unexpected remote")
    if git("status", "--porcelain", "--untracked-files=normal"):
        raise RuntimeError("The dedicated checkout contains changes; refusing to update it")
    git("fetch", "--quiet", "origin", "master")
    git("merge", "--ff-only", "origin/master")
    for path, loaded_hash in LOADED_MANIFEST_DEPENDENCIES.items():
        deployed = CHECKOUT / path
        if not deployed.exists() or hashlib.sha256(deployed.read_bytes()).digest() != loaded_hash:
            raise RuntimeError("Speech manifest dependencies changed; retry on the next run")
    return git("rev-parse", "HEAD")


def load_state():
    try:
        state = json.loads(STATE.read_text(encoding="utf-8"))
        return state if isinstance(state, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(state):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE.with_suffix(".tmp")
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(STATE)


def is_ready(storage, slug, manifest):
    from botocore.exceptions import ClientError

    try:
        body = storage.get_object(Bucket=BUCKET, Key=f"audio/manifests/{slug}/{manifest['content_id']}.json")["Body"]
        try:
            current = json.loads(body.read().decode("utf-8"))
        finally:
            body.close()
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
            return False
        raise
    return (current.get("version") == 1 and current.get("voice") == manifest["voice"] and
            current.get("content_id") == manifest["content_id"] and
            current.get("audio") == f"audio/articles/{slug}/{manifest['content_id']}.mp3")


def is_timing_ready(storage, slug, manifest):
    from botocore.exceptions import ClientError
    try:
        storage.head_object(Bucket=BUCKET, Key=timing_key(slug, manifest["content_id"]))
        return True
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
            return False
        raise


def managed_locally(manifest):
    return manifest.get("voice") == VOICE_PROFILE_ID


def managed_by_runner(manifest):
    return managed_locally(manifest) or manifest.get("voice") == INJOON_PROFILE


def generator_command(slug, manifest, alignment_only, idle_only):
    if manifest.get("voice") == INJOON_PROFILE:
        if alignment_only:
            raise ValueError("InJoon audio and timing data are generated together")
        return [str(INJOON_PYTHON), "-B", str(INJOON_GENERATOR), slug,
                "--source-root", str(CHECKOUT), "--upload"]
    if not managed_locally(manifest):
        raise ValueError("Unsupported automatic voice profile")
    command = [str(PYTHON), "-B", str(GENERATOR), slug, "--source-root", str(CHECKOUT), "--upload"]
    if alignment_only:
        command.append("--alignment-only")
    if idle_only:
        command.append("--yield-when-active")
    return command


def wait_for_generator(process, idle_only):
    """Wait without imposing an article-length limit; stop promptly for desktop activity."""
    while True:
        try:
            return process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            if not idle_only or idle_seconds() >= 30:
                continue
            log("Desktop activity resumed; stopping the current audio group")
            # On Windows a venv launcher can have a separate Python child. Stop
            # the whole dedicated generator tree, not just the launcher.
            result = subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                    capture_output=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                                    timeout=20)
            if result.returncode and process.poll() is None:
                raise RuntimeError("Could not stop the generator after desktop activity resumed")
            process.wait(timeout=15)
            return 10


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--idle-only", action="store_true")
    parser.add_argument("--inspect", action="store_true", help="Synchronize and report readiness without synthesis")
    parser.add_argument("--retry-review", action="store_true", help="Retry items held for speech review")
    args = parser.parse_args()
    if os.name != "nt":
        raise SystemExit("This runner requires the configured Windows PC")
    if args.idle_only and idle_seconds() < 180:
        log("PC is active; generation will retry during idle time")
        return

    import msvcrt
    STATE.parent.mkdir(parents=True, exist_ok=True)
    lock = (STATE.parent / "runner.lock").open("a+b")
    lock.seek(0)
    if lock.read(1) == b"":
        lock.write(b"0")
        lock.flush()
    lock.seek(0)
    try:
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        log("Another voice generation pass is already running")
        return
    try:
        revision = sync_checkout()
        storage = client()
        state = load_state()
        failures = state.get("review_required", {})
        if not isinstance(failures, dict):
            failures = {}
        timing_failures = state.get("timing_review_required", {})
        if not isinstance(timing_failures, dict):
            timing_failures = {}
        entries = []
        for path in sorted((CHECKOUT / "blog").glob("*/index.html")):
            slug = path.parent.name
            if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,95}", slug):
                continue
            manifest = build_manifest(path.read_text(encoding="utf-8"))
            entries.append((len(grouped_text(manifest["chunks"])), slug, manifest))
        ready, pending = [], []
        for _, slug, manifest in sorted(entries):
            (ready if is_ready(storage, slug, manifest) else pending).append((slug, manifest))
        missing_timing = [(slug, manifest) for slug, manifest in ready
                          if managed_locally(manifest) and not is_timing_ready(storage, slug, manifest)]
        state.update({"checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                      "source_commit": revision, "total": len(entries), "ready": len(ready),
                      "pending": [slug for slug, _ in pending], "review_required": failures,
                      "timing_pending": [slug for slug, _ in missing_timing],
                      "timing_review_required": timing_failures,
                      "external_voice_pending": [slug for slug, manifest in pending if not managed_by_runner(manifest)]})
        save_state(state)
        log(f"Published checkout: {revision[:12]}; ready {len(ready)}/{len(entries)}; pending {len(pending)}")
        if args.inspect:
            return
        jobs = [(slug, manifest, True) for slug, manifest in missing_timing]
        jobs += [(slug, manifest, False) for slug, manifest in pending if manifest.get("voice") == INJOON_PROFILE]
        jobs += [(slug, manifest, False) for slug, manifest in pending if managed_locally(manifest)]
        for slug, manifest, alignment_only in jobs:
            if args.idle_only and idle_seconds() < 180:
                log("PC is active; remaining articles will retry later")
                break
            job_failures = timing_failures if alignment_only else failures
            if job_failures.get(slug) == manifest["content_id"] and not args.retry_review:
                log(f"Awaiting speech review: {slug}")
                continue
            args_for_child = generator_command(slug, manifest, alignment_only, args.idle_only)
            log(f"{'Aligning existing audio' if alignment_only else 'Generating article'}: {slug}")
            flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) | getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)
            with LOG.open("a", encoding="utf-8", buffering=1) as output:
                process = subprocess.Popen(args_for_child, cwd=str(ROOT), stdout=output, stderr=subprocess.STDOUT,
                                           text=True, creationflags=flags)
                result = wait_for_generator(process, args.idle_only)
            if result == 0:
                job_failures.pop(slug, None)
                if alignment_only:
                    state["timing_pending"] = [value for value in state["timing_pending"] if value != slug]
                    log(f"Sentence timing uploaded: {slug}")
                else:
                    state["ready"] += 1
                    state["pending"] = [value for value in state["pending"] if value != slug]
                    log(f"Audio uploaded: {slug}")
            elif result == 10:
                log("GPU unavailable or desktop activity resumed; will retry later")
                break
            elif result in (20, 30):
                job_failures[slug] = manifest["content_id"]
                log(f"Audio held for review or storage limit: {slug}")
                if result == 30:
                    break
            else:
                job_failures[slug] = manifest["content_id"]
                log(f"Audio generation failed ({result}): {slug}")
            state["review_required"] = failures
            state["timing_review_required"] = timing_failures
            save_state(state)
    finally:
        lock.seek(0)
        msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
        lock.close()


if __name__ == "__main__":
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8", buffering=1) as output:
        original_out, original_err = sys.stdout, sys.stderr
        try:
            sys.stdout = sys.stderr = output
            main()
        except Exception as error:
            log(f"Runner error: {type(error).__name__}: {error}")
            raise
        finally:
            sys.stdout, sys.stderr = original_out, original_err
