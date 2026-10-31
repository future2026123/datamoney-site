(() => {
  'use strict';

  const AUDIO_ORIGIN = 'https://audio.datamoney.kr';
  const HASH = /^[a-f0-9]{64}$/;

  window.initDataMoneyArticleSpeech = ({toolbar, speechButton, onUnavailable}) => {
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
