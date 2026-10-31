(() => {
  'use strict';

  const AUDIO_ORIGIN = 'https://audio.datamoney.kr';
  const HASH = /^[a-f0-9]{64}$/;

  // Shared by the offline generators and device speech. Keep this JSON array
  // machine-readable so every voice uses the same pronunciation rules.
  const PRONUNCIATION_RULES = /* dm-pronunciations:start */
  [
    {"pattern":"EP\\.01", "spoken":"에피소드 1"},
    {"pattern":"PNAS", "spoken":"피 엔 에이 에스"},
    {"pattern":"S\\s*&\\s*P\\s*500", "spoken":"에스 엔 피 오백", "ignoreCase":true},
    {"pattern":"S\\s*&\\s*P", "spoken":"에스 엔 피", "ignoreCase":true},
    {"pattern":"PER", "spoken":"퍼"},
    {"pattern":"per(?=[가-힣])", "spoken":"퍼", "ignoreCase":true},
    {"pattern":"per(?=\\s+[가-힣])", "spoken":"퍼", "ignoreCase":true},
    {"pattern":"PBR", "spoken":"피 비 알"},
    {"pattern":"ETF", "spoken":"이 티 에프"},
    {"pattern":"ETN", "spoken":"이 티 엔"},
    {"pattern":"EPS", "spoken":"이 피 에스"},
    {"pattern":"BPS", "spoken":"비 피 에스"},
    {"pattern":"DPS", "spoken":"디 피 에스"},
    {"pattern":"ROE", "spoken":"알 오 이"},
    {"pattern":"ROA", "spoken":"알 오 에이"},
    {"pattern":"ROIC", "spoken":"알 오 아이 씨"},
    {"pattern":"GDP", "spoken":"지 디 피"},
    {"pattern":"CPI", "spoken":"씨 피 아이"},
    {"pattern":"PCE", "spoken":"피 씨 이"},
    {"pattern":"FOMC", "spoken":"에프 오 엠 씨"},
    {"pattern":"ISA", "spoken":"아이 에스 에이"},
    {"pattern":"IRP", "spoken":"아이 알 피"},
    {"pattern":"SEC", "spoken":"에스 이 씨"},
    {"pattern":"AI", "spoken":"에이 아이"},
    {"pattern":"GPU", "spoken":"지 피 유"},
    {"pattern":"CMA", "spoken":"씨 엠 에이"},
    {"pattern":"MMF", "spoken":"엠 엠 에프"},
    {"pattern":"MMW", "spoken":"엠 엠 더블유"},
    {"pattern":"RP", "spoken":"알 피"},
    {"pattern":"ELS", "spoken":"이 엘 에스"},
    {"pattern":"DLS", "spoken":"디 엘 에스"},
    {"pattern":"CFD", "spoken":"씨 에프 디"},
    {"pattern":"NAV", "spoken":"엔 에이 브이"},
    {"pattern":"AUM", "spoken":"에이 유 엠"},
    {"pattern":"MSCI", "spoken":"엠 에스 씨 아이"},
    {"pattern":"KRX", "spoken":"케이 알 엑스"},
    {"pattern":"FINRA", "spoken":"핀라"},
    {"pattern":"FRED", "spoken":"프레드"},
    {"pattern":"COFIX", "spoken":"코픽스"},
    {"pattern":"SNS", "spoken":"에스 엔 에스"},
    {"pattern":"KOSPI", "spoken":"코스피"},
    {"pattern":"KOSDAQ", "spoken":"코스닥"},
    {"pattern":"KODEX", "spoken":"코덱스"},
    {"pattern":"TIGER", "spoken":"타이거"},
    {"pattern":"NASDAQ", "spoken":"나스닥"},
    {"pattern":"SPY", "spoken":"스파이"},
    {"pattern":"QQQ", "spoken":"큐 큐 큐"}
  ]
  /* dm-pronunciations:end */;
  window.prepareDataMoneySpeech = text => PRONUNCIATION_RULES.reduce((value, rule) => {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(?:${rule.pattern})(?![A-Za-z0-9])`, rule.ignoreCase ? 'gi' : 'g');
    return value.replace(pattern, (_, prefix) => prefix + rule.spoken);
  }, String(text));

  // Resolve the spoken text to DOM ranges without changing links or markup.
  window.createDataMoneySpeechHighlighter = ({title, content, followInput}) => {
    const excluded = 'script, style, nav, aside, svg, noscript, iframe, figcaption, [hidden], [aria-hidden="true"], .dm-end-actions, .dm-feedback, .dm-comments, .dm-references, .references, .reference-list, .references-list, .sources, .source-list, .sources-box, .source-box, .bibliography, .eyebrow';
    const block = 'p, li, h1, h2, h3, h4, blockquote, th, td, div';
    const customHighlights = window.CSS?.highlights && typeof window.Highlight === 'function';
    let items = [], matches = [], ranges = [], active = false, current = -1, marks = [], currentRange = null;

    const clearMarks = () => {
      const parents = new Set();
      marks.forEach(mark => {
        if (!mark.parentNode) return;
        const parent = mark.parentNode;
        parents.add(parent);
        mark.replaceWith(...mark.childNodes);
      });
      marks = [];
      parents.forEach(parent => parent.normalize());
    };
    const clearVisual = () => {
      if (customHighlights) window.CSS.highlights.delete('dm-speech-reading');
      clearMarks();
      currentRange = null;
    };
    const textIndex = () => {
      let text = '', refs = [], previousBlock = null;
      const space = () => {
        if (text && !text.endsWith(' ')) { text += ' '; refs.push(null); }
      };
      const append = node => {
        for (let i = 0; i < node.data.length; i++) {
          const char = node.data[i];
          if (/\s/u.test(char)) {
            if (text && !text.endsWith(' ')) { text += ' '; refs.push({node, offset:i}); }
          } else {
            text += char;
            refs.push({node, offset:i});
          }
        }
      };
      [title, content].filter(Boolean).forEach((root, rootIndex) => {
        const walker = document.createTreeWalker(root, 5);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (node.nodeType === 1) {
            if (node.tagName === 'BR' && !node.closest(excluded)) space();
            continue;
          }
          const parent = node.parentElement;
          if (!parent || parent.closest(excluded)) continue;
          if (rootIndex && (title?.contains(node) || parent.closest('.dm-article-heading'))) continue;
          if (parent.closest('[style*="display:none"], [style*="display: none"]')) continue;
          const currentBlock = parent.closest(block) || root;
          if (previousBlock && currentBlock !== previousBlock) space();
          previousBlock = currentBlock;
          append(node);
        }
        space();
      });
      return {text, refs};
    };
    const rangeFor = (index, indexed) => {
      const match = matches[index];
      if (!match) return null;
      const refs = indexed.refs.slice(match.start, match.end).filter(Boolean);
      if (!refs.length) return null;
      const range = document.createRange();
      range.setStart(refs[0].node, refs[0].offset);
      const last = refs[refs.length - 1];
      range.setEnd(last.node, last.offset + 1);
      return {range, refs};
    };
    const prepare = entries => {
      clearVisual();
      current = -1;
      items = entries;
      const indexed = textIndex();
      let cursor = 0;
      matches = entries.map(entry => {
        const needle = String(entry.text || '').replace(/\s+/gu, ' ').trim();
        if (!needle) return null;
        const start = indexed.text.indexOf(needle, cursor);
        if (start < 0) return null;
        cursor = start + needle.length;
        return {start, end: cursor, needle};
      });
      ranges = customHighlights ? matches.map((_, index) => rangeFor(index, indexed)) : [];
    };
    const following = () => !followInput || followInput.checked;
    const follow = range => {
      if (!active || !following() || !range?.getBoundingClientRect) return;
      const rect = range.getBoundingClientRect();
      if (!rect.height || (rect.top >= 90 && rect.bottom <= window.innerHeight - 70)) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      window.scrollBy({top: rect.top - window.innerHeight * 0.38, behavior: reduce ? 'auto' : 'smooth'});
    };
    const suspendFollow = event => {
      if (!active || !event.isTrusted || !followInput) return;
      if (event.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
      if (event.type === 'keydown' && event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      followInput.checked = false;
    };
    window.addEventListener('wheel', suspendFollow, {passive:true});
    window.addEventListener('touchmove', suspendFollow, {passive:true});
    window.addEventListener('keydown', suspendFollow);
    followInput?.addEventListener('change', () => { if (followInput.checked && currentRange) follow(currentRange); });

    const wrapRefs = refs => {
      const spans = [];
      refs.forEach(({node, offset}) => {
        const last = spans[spans.length - 1];
        if (last && last.node === node && last.end === offset) last.end++;
        else spans.push({node, start:offset, end:offset + 1});
      });
      spans.reverse().forEach(({node, start, end}) => {
        if (end < node.length) node.splitText(end);
        const middle = start ? node.splitText(start) : node;
        const mark = document.createElement('mark');
        mark.className = 'dm-speech-reading';
        middle.parentNode.insertBefore(mark, middle);
        mark.appendChild(middle);
        marks.push(mark);
      });
    };
    const show = index => {
      active = true;
      if (index === current) return;
      clearVisual();
      current = index;
      if (!matches[index]) return;
      let found = ranges[index];
      if (!customHighlights) {
        let indexed = textIndex();
        if (indexed.text.slice(matches[index].start, matches[index].end) !== matches[index].needle) {
          prepare(items);
          current = index;
          indexed = textIndex();
        }
        found = rangeFor(index, indexed);
      }
      if (!found) return;
      currentRange = found.range;
      follow(currentRange);
      if (customHighlights) {
        window.CSS.highlights.set('dm-speech-reading', new window.Highlight(found.range));
      } else {
        wrapRefs(found.refs);
      }
    };
    const clear = () => { active = false; current = -1; clearVisual(); };
    const indexAtPoint = (x, y, target) => {
      if (!target || ![title, content].some(root => root?.contains(target))) return -1;
      const caret = document.caretPositionFromPoint?.(x, y);
      const fallback = !caret && document.caretRangeFromPoint?.(x, y);
      const node = caret?.offsetNode || fallback?.startContainer;
      const offset = caret ? caret.offset : fallback?.startOffset;
      if (!node || node.nodeType !== 3) return -1;
      const refs = textIndex().refs;
      let at = refs.findIndex(ref => ref && ref.node === node && ref.offset === offset);
      if (at < 0 && offset === node.length) {
        at = refs.findIndex(ref => ref && ref.node === node && ref.offset === offset - 1);
      }
      return at < 0 ? -1 : matches.findIndex(match => match && at >= match.start && at < match.end);
    };
    return {prepare, show, clear, indexAtPoint};
  };

  window.initDataMoneyArticleSpeech = ({toolbar, speechButton, player, onUnavailable, highlighter}) => {
    const menu = toolbar.querySelector('.dm-speech-menu');
    const start = menu.querySelector('[data-speech-play]');
    const close = menu.querySelector('[data-speech-close]');
    const feedback = menu.querySelector('.dm-speech-feedback');
    const speeds = Array.from(menu.querySelectorAll('[name="dm-speech-speed"]'));
    const settings = toolbar.querySelector('[data-speech-settings]');
    const label = speechButton.querySelector?.('[data-speech-label]');
    const info = speechButton.querySelector?.('[data-speech-info]');
    const playerToggle = player?.querySelector('[data-player-toggle]');
    const playerClose = player?.querySelector('[data-player-close]');
    const playerTitle = player?.querySelector('[data-player-title]');
    const playerCurrent = player?.querySelector('[data-player-current]');
    const playerTime = player?.querySelector('[data-player-time]');
    const slug = location.pathname.match(/^\/blog\/([a-z0-9][a-z0-9-]{0,95})\/?$/)?.[1];
    if (!slug || !window.Audio) {
      speechButton.disabled = true;
      speechButton.title = '이 브라우저에서는 음성을 재생할 수 없습니다';
      return;
    }

    const audio = new Audio();
    audio.preload = 'none';
    let available = null;
    let cues = [];
    let loading = null;
    let playing = false;
    let run = 0;
    let speed = 1;
    let contentId = '', voiceName = '', resumeAt = 0, resumePending = false;
    let heard = 0, totalHeard = 0, lastTime = null, lastSavedAt = 0;
    const milestones = new Set();
    const listenedMilestones = new Set();
    const storageKey = () => 'dm-speech-position:' + slug + ':' + contentId;
    const report = (name, data = {}) => {
      try { window.gtag?.('event', name, {article_slug:slug, ...data}); } catch (_) {}
    };
    const savePosition = () => {
      if (!contentId || !Number.isFinite(audio.currentTime)) return;
      try {
        if (audio.currentTime < 3 || (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 3))
          localStorage.removeItem(storageKey());
        else localStorage.setItem(storageKey(), String(Math.floor(audio.currentTime)));
      } catch (_) {}
    };
    const reportListening = () => {
      if (heard >= 1) report('audio_listening', {seconds:Math.round(heard)});
      heard = 0;
    };
    const formatTime = value => {
      if (!Number.isFinite(value) || value < 0) return '';
      const seconds = Math.floor(value), minutes = Math.floor(seconds / 60);
      return minutes + ':' + String(seconds % 60).padStart(2, '0');
    };
    const updateTime = () => {
      const total = Number.isFinite(audio.duration) ? Math.floor(audio.duration) : null;
      const durationText = total === null ? '' : Math.floor(total / 60) + '분 ' + (total % 60) + '초';
      if (info) info.textContent = [voiceName, durationText].filter(Boolean).join(' · ');
      if (playerTime) playerTime.textContent = Number.isFinite(audio.duration) ? formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration) : formatTime(audio.currentTime);
    };
    try { speed = Number(localStorage.getItem('dm-speech-rate')) || 1; } catch (_) {}
    if (![0.85, 1, 1.2].includes(speed)) speed = 1;
    speeds.forEach(option => { option.checked = Number(option.value) === speed; });

    const setFeedback = message => { feedback.textContent = message; };
    const closeMenu = focus => {
      menu.hidden = true;
      settings?.setAttribute('aria-expanded', 'false');
      if (focus) settings?.focus();
    };
    const updatePlaying = value => {
      playing = value;
      speechButton.setAttribute('aria-pressed', String(value));
      speechButton.setAttribute('aria-label', value ? '음성 일시정지' : (resumeAt >= 3 ? '이어 듣기' : '글 듣기'));
      if (label) label.textContent = value ? '일시정지' : (resumeAt >= 3 ? '이어 듣기' : '글 듣기');
      if (playerToggle) { playerToggle.textContent = value ? '❚❚' : '▶'; playerToggle.setAttribute('aria-label', value ? '일시정지' : '재생'); }
      start.textContent = value ? '일시정지' : '음성 재생';
    };
    const stop = (message, completed = false) => {
      run++;
      audio.pause();
      if (completed) { try { localStorage.removeItem(storageKey()); } catch (_) {} resumeAt = 0; audio.currentTime = 0; }
      else { savePosition(); resumeAt = audio.currentTime || 0; }
      reportListening();
      highlighter?.clear();
      updatePlaying(false);
      if (player) player.hidden = true;
      setFeedback(message || '');
    };
    const loadAudio = () => {
      if (available) return Promise.resolve(available);
      if (!loading) {
        start.disabled = true;
        setFeedback('음성을 확인하고 있어요.');
        loading = fetch(`/blog/speech-manifests/${slug}.json`, {cache: 'no-cache', credentials: 'same-origin'})
          .then(async current => {
          if (!current.ok) throw new Error('not-ready');
          const article = await current.json();
          const id = article?.content_id;
          if (article?.version !== 1 || !HASH.test(id || '')) throw new Error('invalid');
          // A content-addressed URL avoids stale recordings after an article edit.
          // A not-yet-created recording must be checked again on the next page visit.
          const ready = await fetch(`${AUDIO_ORIGIN}/audio/manifests/${slug}/${id}.json`, {cache: 'no-store', credentials: 'omit'});
          if (!ready.ok) throw new Error('not-ready');
          const recording = await ready.json();
          if (recording?.version !== 1 ||
              recording.content_id !== id || article.voice !== recording.voice ||
              recording.audio !== `audio/articles/${slug}/${id}.mp3`) throw new Error('not-ready');
          available = `${AUDIO_ORIGIN}/${recording.audio}`;
          contentId = id;
          voiceName = article.voice?.includes('InJoon') ? '인준 음성' : 'AI 음성';
          if (playerTitle) playerTitle.textContent = voiceName;
          try { resumeAt = Math.max(0, Number(localStorage.getItem(storageKey())) || 0); } catch (_) {}
          updatePlaying(false);
          audio.preload = 'metadata';
          audio.src = available;
          audio.load();
          updateTime();
          if (highlighter) {
            fetch(`${AUDIO_ORIGIN}/audio/manifests/${slug}/${id}-cues-v1.json`, {cache:'no-store', credentials:'omit'})
              .then(response => response.ok ? response.json() : null)
              .then(timing => {
                if (timing?.version !== 1 || timing.content_id !== id || !Array.isArray(timing.cues)) return;
                const valid = timing.cues.every((cue, i, all) => typeof cue.text === 'string' && cue.text.length > 0 &&
                  cue.text.length <= 5000 && Number.isFinite(cue.start) && Number.isFinite(cue.end) &&
                  cue.start >= 0 && cue.end > cue.start && (!i || cue.start >= all[i - 1].start));
                if (!valid || timing.cues.length > 10000) return;
                cues = timing.cues;
                highlighter.prepare(cues);
                if (playing) syncHighlight();
              }).catch(() => {});
          }
          start.disabled = false;
          setFeedback('');
          return available;
        }).catch(() => {
          setFeedback('이 글의 음성을 준비하고 있어요. 나중에 다시 확인해 주세요.');
          return null;
        }).finally(() => { loading = null; });
      }
      return loading;
    };
    const syncHighlight = () => {
      if (!playing || !highlighter || !cues.length) return;
      const time = audio.currentTime || 0;
      // Keep the current sentence highlighted through pauses until the next starts.
      let low = 0, high = cues.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (cues[mid].start <= time) low = mid + 1;
        else high = mid;
      }
      highlighter.show(low - 1);
      if (playerCurrent) playerCurrent.textContent = cues[low - 1]?.text || '음성을 재생하고 있어요';
    };
    audio.addEventListener('loadedmetadata', () => {
      if (resumePending) {
        audio.currentTime = Number.isFinite(audio.duration) && resumeAt < audio.duration - 3 ? resumeAt : 0;
        resumePending = false;
      }
      updateTime();
    });
    audio.addEventListener('playing', syncHighlight);
    audio.addEventListener('timeupdate', () => {
      if (playing && lastTime !== null) {
        const delta = audio.currentTime - lastTime;
        if (!audio.seeking && delta > 0 && delta < 10) {
          const elapsed = delta / (audio.playbackRate || 1);
          heard += elapsed;
          totalHeard += elapsed;
          for (const seconds of [30, 60, 300, 600]) {
            if (!listenedMilestones.has(seconds) && totalHeard >= seconds) {
              listenedMilestones.add(seconds); report('audio_listened_' + seconds + 's');
            }
          }
        }
        if (heard >= 30) reportListening();
      }
      lastTime = audio.currentTime;
      if (playing && Math.abs(audio.currentTime - lastSavedAt) >= 5) {
        savePosition();
        lastSavedAt = audio.currentTime;
      }
      if (playing && Number.isFinite(audio.duration) && audio.duration > 0) {
        for (const percent of [25, 50, 75, 90]) {
          if (!milestones.has(percent) && audio.currentTime / audio.duration >= percent / 100) {
            milestones.add(percent); report('audio_progress', {percent});
          }
        }
      }
      updateTime(); syncHighlight();
    });
    audio.addEventListener('seeking', () => { lastTime = null; });
    audio.addEventListener('seeked', () => { lastTime = audio.currentTime; lastSavedAt = audio.currentTime; savePosition(); updateTime(); syncHighlight(); });
    audio.addEventListener('ended', () => { if (playing) { report('audio_complete'); stop('음성 재생을 마쳤어요.', true); } });
    audio.addEventListener('error', () => {
      if (playing) stop('음성을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    });
    const openMenu = () => {
      menu.hidden = !menu.hidden;
      settings?.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden && !playing) loadAudio();
    };
    speechButton.disabled = true;
    loadAudio().then(result => {
      speechButton.disabled = false;
      if (result) { speechButton.addEventListener('click', togglePlayback); settings?.addEventListener('click', openMenu); }
      else if (typeof onUnavailable === 'function') onUnavailable();
      else speechButton.addEventListener('click', openMenu);
    });
    close.addEventListener('click', () => closeMenu(true));
    const togglePlayback = () => {
      if (playing) {
        audio.pause(); savePosition(); resumeAt = audio.currentTime || 0; reportListening();
        report('audio_pause'); lastTime = null; updatePlaying(false); setFeedback('일시정지'); return;
      }
      if (!available) { loadAudio(); return; }
      run++;
      const currentRun = run;
      if (!audio.getAttribute?.('src')) { audio.src = available; resumePending = resumeAt >= 3; }
      else if (!audio.currentTime && resumeAt >= 3) {
        if (audio.readyState >= 1) audio.currentTime = resumeAt;
        else resumePending = true;
      }
      audio.playbackRate = speed;
      updatePlaying(true);
      if (player) player.hidden = false;
      report('audio_play', {resumed:audio.currentTime > 0 || resumeAt >= 3});
      setFeedback('음성 재생 중');
      // play() must run synchronously inside the user's click on iOS.
      const result = audio.play();
      if (result?.catch) result.catch(() => {
        if (playing && currentRun === run) stop('음성을 재생하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
    };
    start.addEventListener('click', togglePlayback);
    playerToggle?.addEventListener('click', togglePlayback);
    playerClose?.addEventListener('click', () => stop('음성을 중지했어요.'));
    speeds.forEach(option => option.addEventListener('change', () => {
      if (!option.checked) return;
      speed = Number(option.value);
      if (![0.85, 1, 1.2].includes(speed)) speed = 1;
      audio.playbackRate = speed;
      try { localStorage.setItem('dm-speech-rate', String(speed)); } catch (_) {}
    }));
    document.addEventListener('click', event => {
      if (!menu.hidden && !event.target.closest('.dm-speech-wrap')) closeMenu(false);
      if (!playing || !cues.length || typeof highlighter?.indexAtPoint !== 'function' ||
          event.defaultPrevented || (event.button != null && event.button !== 0) ||
          event.target.closest('a, button, input, select, textarea, [contenteditable], label') ||
          !window.getSelection?.()?.isCollapsed) return;
      const index = highlighter.indexAtPoint(event.clientX, event.clientY, event.target);
      if (index < 0 || !cues[index]) return;
      audio.currentTime = cues[index].start;
      syncHighlight();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
    });
    window.addEventListener('pagehide', () => { if (playing) stop(); });
  };
})();
