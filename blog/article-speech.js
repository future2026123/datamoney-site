(() => {
  'use strict';

  const AUDIO_ORIGIN = 'https://audio.datamoney.kr';
  const HASH = /^[a-f0-9]{64}$/;

  // Resolve the spoken text to DOM ranges without changing links or markup.
  window.createDataMoneySpeechHighlighter = ({title, content, followInput}) => {
    const excluded = 'script, style, nav, aside, svg, noscript, iframe, figcaption, [hidden], [aria-hidden="true"], .dm-comments, .dm-references, .references, .reference-list, .references-list, .sources, .source-list, .sources-box, .source-box, .bibliography, .eyebrow';
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
    return {prepare, show, clear};
  };

  window.initDataMoneyArticleSpeech = ({toolbar, speechButton, onUnavailable, highlighter}) => {
    const menu = toolbar.querySelector('.dm-speech-menu');
    const start = menu.querySelector('[data-speech-play]');
    const close = menu.querySelector('[data-speech-close]');
    const feedback = menu.querySelector('.dm-speech-feedback');
    const speeds = Array.from(menu.querySelectorAll('[name="dm-speech-speed"]'));
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
    try { speed = Number(localStorage.getItem('dm-speech-rate')) || 1; } catch (_) {}
    if (![0.85, 1, 1.2].includes(speed)) speed = 1;
    speeds.forEach(option => { option.checked = Number(option.value) === speed; });

    const setFeedback = message => { feedback.textContent = message; };
    const closeMenu = focus => {
      menu.hidden = true;
      speechButton.setAttribute('aria-expanded', 'false');
      if (focus) speechButton.focus();
    };
    const updatePlaying = value => {
      playing = value;
      speechButton.setAttribute('aria-pressed', String(value));
      start.textContent = value ? '음성 중지' : '음성 재생';
    };
    const stop = message => {
      run++;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      highlighter?.clear();
      updatePlaying(false);
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
      const index = cues.findIndex(cue => cue.start <= time && time < cue.end);
      highlighter.show(index);
    };
    audio.addEventListener('playing', syncHighlight);
    audio.addEventListener('timeupdate', syncHighlight);
    audio.addEventListener('seeked', syncHighlight);
    audio.addEventListener('ended', () => { if (playing) stop('음성 재생을 마쳤어요.'); });
    audio.addEventListener('error', () => {
      if (playing) stop('음성을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    });
    const openMenu = () => {
      menu.hidden = !menu.hidden;
      speechButton.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden && !playing) loadAudio();
    };
    speechButton.disabled = true;
    loadAudio().then(result => {
      speechButton.disabled = false;
      if (result) speechButton.addEventListener('click', openMenu);
      else if (typeof onUnavailable === 'function') onUnavailable();
      else speechButton.addEventListener('click', openMenu);
    });
    close.addEventListener('click', () => closeMenu(true));
    start.addEventListener('click', () => {
      if (playing) { stop('음성을 중지했어요.'); return; }
      if (!available) { loadAudio(); return; }
      run++;
      const currentRun = run;
      audio.src = available;
      audio.playbackRate = speed;
      updatePlaying(true);
      setFeedback('음성 재생 중');
      // play() must run synchronously inside the user's click on iOS.
      const result = audio.play();
      if (result?.catch) result.catch(() => {
        if (playing && currentRun === run) stop('음성을 재생하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
    });
    speeds.forEach(option => option.addEventListener('change', () => {
      if (!option.checked) return;
      speed = Number(option.value);
      if (![0.85, 1, 1.2].includes(speed)) speed = 1;
      audio.playbackRate = speed;
      try { localStorage.setItem('dm-speech-rate', String(speed)); } catch (_) {}
    }));
    document.addEventListener('click', event => {
      if (!menu.hidden && !event.target.closest('.dm-speech-wrap')) closeMenu(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
    });
    window.addEventListener('pagehide', () => { if (playing) stop(); });
  };
})();
