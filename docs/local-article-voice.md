# Local article narration

The default Qwen article narration is synthesized on the dedicated Windows PC
and uploaded as 48 kbps mono MP3 to the private `datamoney-article-voice` R2
bucket. Cloudflare serves it through `audio.datamoney.kr`; the bucket's
development URL is disabled. Korean Qwen speech is generated locally. When a
readable English sentence is present, that public English text is sent to the
online voice service from the dedicated `injoon-env` environment and spoken by
`en-US-JennyNeural`; the generated groups are combined into the same MP3.

The Pages build runs `scripts/build_speech_manifests.py`. It publishes a small
fingerprint for each article, derived from the readable text and voice profile.
The player requests an availability index and audio at paths containing that
fingerprint, so a changed article cannot accidentally play its older recording.
Figure captions and reference lists are excluded. Until an exact matching
recording exists, the previous device voice remains available and the UI says
that the AI voice is being prepared.

For new InJoon narration, use `ko-KR-InJoonNeural-low5-v2`: the user's preferred
InJoon voice with pitch lowered by 5 Hz. The original
`ko-KR-InJoonNeural-v1` profile stays available at its original pitch so older
immutable recordings retain their identity. Both profiles use the online
InJoon text-to-speech service through the dedicated `injoon-env`
environment; it sends the article's public text to the service. The generated
mono MP3 uses 32 kbps, and word timings are mapped back to the article's exact
sentences. Figure captions, reference lists and bracketed citation numbers are
not spoken. When the article changes, the idle runner generates a new recording
and timing file for its new content fingerprint before publishing its index.
The existing female voice generator never handles an InJoon article.

English sentences and English quotations inside Korean paragraphs use the
native US English voice `en-US-GuyNeural` with InJoon narration. Korean parts
retain the selected InJoon pitch. The text, voice routing, and voice names are
included in the fingerprint for articles containing English, so an older
Korean-accented recording cannot be mistaken for the new version. InJoon word
timings are offset across language changes and the complete article remains one
MP3. In the device-voice fallback, English sentences request an installed
English voice; availability depends on the reader's device.

The pronunciation dictionary in `blog/article-speech.js` is shared by both
generators and the device-voice fallback for Korean speech. English sentences
keep their original spelling and bypass Korean abbreviation substitutions. It
changes spoken text only: the
article and its sentence highlighting retain the displayed spelling. An article
fingerprint includes its transformed speech, so a pronunciation change cannot
reuse a stale recording, even if a rule is later removed. Unlisted capitalized
terms in Korean text are logged and generation is held for pronunciation
review before uploading. Update the dictionary after checking each term; this
conservative check can also flag an ordinary name or ticker. The check does not
prove that every other word is pronounced correctly.

Do not add speculative pronunciation substitutions. Verify a real error in
the relevant voice and context, compare the original and replacement audio,
and preserve the original spelling when a replacement is unverified. Honor an
explicit user-requested pronunciation. `AI` is currently passed through as
written instead of being changed to spaced Korean syllables. Other existing
dictionary entries have not automatically been validated by this change.

The Qwen generator caches individual groups, verifies the entire recording with
a local transcription model and checks number tokens before uploading. This
automated check catches some omissions but does not guarantee pronunciation or
financial accuracy; items that fail are held for review. An uploaded file is
size- and SHA-256-checked before its availability index is published. A change
to the Korean voice model, reference, grouping or encoding requires changing
`VOICE_PROFILE_ID` in `scripts/build_speech_manifests.py`. A change to English
voice routing requires a new `LANGUAGE_ROUTING_VERSION` in `speech_language.py`.
Audio and index URLs are immutable and must never be reused for different
recordings.

Optional sentence timing is stored separately at
`audio/manifests/<slug>/<content_id>-cues-v1.json`. It contains the article
fingerprint and ordered `{text, start, end}` entries in seconds. For the local
voice, the recognizer aligns its word timings to the original article text;
uncertain matches are omitted. A missing timing file never blocks playback.
The Windows runner backfills timing for existing local recordings without
rewriting the audio. The player highlights the current sentence and can follow
its location; manual scrolling suspends following until the reader enables it
again.

An article using the preferred InJoon voice includes `<meta name="dm-speech-voice"
content="ko-KR-InJoonNeural-low5-v2">`. This changes its content fingerprint and
marks the voice as separately managed: the female generator and its timing
backfill will not upload or replace that article's recording. A dedicated
generator for another voice must use its own fingerprint, upload the audio and
timing first, and publish the matching availability index last.

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
  logged-in user. It starts after three minutes without input and stops the
  generator promptly when desktop activity resumes. The default Qwen voice also
  requires 6 GiB free GPU memory. The PC must be on and signed in. Completed
  groups are retained for retry; a group interrupted in progress is regenerated.
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
