# Local article narration

Article narration is synthesized on the dedicated Windows PC with the locally
installed Qwen voice and uploaded as 48 kbps mono MP3 to the private
`datamoney-article-voice` R2 bucket. Cloudflare serves it through
`audio.datamoney.kr`; the bucket's development URL is disabled. No TTS API is
used for generation.

The Pages build runs `scripts/build_speech_manifests.py`. It publishes a small
fingerprint for each article, derived from the readable text and voice profile.
The player requests an availability index and audio at paths containing that
fingerprint, so a changed article cannot accidentally play its older recording.
Figure captions and reference lists are excluded. Until an exact matching
recording exists, the previous device voice remains available and the UI says
that the AI voice is being prepared.

The generator caches individual groups, verifies the entire recording with a
local transcription model and checks number tokens before uploading. This
automated check catches some omissions but does not guarantee pronunciation or
financial accuracy; items that fail are held for review. An uploaded file is
size- and SHA-256-checked before its availability index is published. Changing
the voice model, reference, grouping or audio encoding requires changing
`VOICE_PROFILE_ID` in `scripts/build_speech_manifests.py`: audio and index URLs
are immutable and must never be reused for different recordings.

## Windows operation

- Dedicated checkout: `D:\Tools\DataMoney-TTS\published-site-local-voice`.
  It must be clean and track the site's `origin/master`.
- Local model, group cache, generated recordings, logs and state live under
  `D:\Tools\DataMoney-TTS`. The runner state is
  `local-voice-cache\runner-state.json` and the log is
  `local-voice-cache\runner.log`.
- The restricted bucket token is protected with Windows DPAPI for the current
  user at `%LOCALAPPDATA%\DataMoneyTTS\r2-credentials.dpapi`. Never commit
  credentials or put them in the site.
- Task Scheduler runs `scripts/local_voice_runner.py --idle-only` under the
  logged-in user. It starts after three minutes without input, requires 6 GiB
  free GPU memory, and stops between groups when desktop activity resumes.
  The PC must be on and signed in. Partial groups are retained for retry.
- To inspect without generating, use the TTS environment's Python with
  `-B scripts/local_voice_runner.py --inspect`. Items in `review_required`
  are not retried automatically for the same article fingerprint. Review the
  cached MP3 and transcript before using `--retry-review`.
- The dedicated bucket is checked against an 8 GB ceiling before upload. This
  is an application safeguard for this bucket, not an account-wide charge cap.

## Delivery and cost safeguards

Cloudflare caches versioned audio and protects `/audio/` with a per-IP rate
limit. WAF rules block unrelated paths on the audio host and query strings that
could bypass the cache. A specific manifest cache rule bypasses edge caching
when the origin supplies no cache policy and bypasses browser caching, so a
previous 404 does not hide a newly uploaded recording. These controls reduce
automated abuse; distributed attacks and all charges cannot be ruled out.

The Cloudflare budget alert is account-wide and warns at $0.01 of applicable
usage charges. It is an alert, not an automatic stop. R2 free allowances and
prices can change; verify current terms at
https://developers.cloudflare.com/r2/pricing/ and inspect account usage.
