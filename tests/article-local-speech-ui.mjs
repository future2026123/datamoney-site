import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../blog/article-speech.js', import.meta.url), 'utf8');
const create = extra => ({
  handlers: {}, attrs: {}, textContent: '', hidden: false, disabled: false,
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
  fire(type, event = {}) { for (const fn of this.handlers[type] || []) fn(event); },
  setAttribute(name, value) { this.attrs[name] = value; },
  focus() { this.focused = true; }, ...extra
});
const id = 'a'.repeat(64);

async function scenario(remoteId, includeHighlighter = false) {
  const play = create({disabled: true});
  const close = create();
  const feedback = create();
  const speeds = ['0.85', '1', '1.2'].map(value => create({value, checked: false}));
  const menu = create({hidden: true,
    querySelector(selector) { return ({'[data-speech-play]':play, '[data-speech-close]':close, '.dm-speech-feedback':feedback})[selector]; },
    querySelectorAll() { return speeds; }
  });
  const button = create();
  const toolbar = {querySelector: () => menu};
  const document = create();
  const fakeWindow = create();
  const storage = new Map();
  const localStorage = {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)};
  const fetched = [];
  const highlighter = includeHighlighter ? {
    entries:[], shown:[], clears:0,
    prepare(entries) { this.entries = entries; },
    show(index) { this.shown.push(index); },
    clear() { this.clears++; }
  } : null;
  const fetch = async url => {
    fetched.push(String(url));
    if (String(url).startsWith('/blog/speech-manifests/')) {
      return Response.json({version:1, voice:'female-v1', content_id:id});
    }
    if (String(url).endsWith('-cues-v1.json')) {
      return Response.json({version:1, content_id:id, cues:[
        {text:'첫 문장입니다.', start:0, end:2}, {text:'두 번째 문장입니다.', start:2.5, end:5}
      ]});
    }
    return Response.json({version:1, voice:'female-v1', content_id:remoteId,
      audio:`audio/articles/test-article/${remoteId}.mp3`});
  };
  const audio = create({src:'', currentTime:0, playbackRate:1, plays:0, pauses:0,
    play() { this.plays++; return Promise.resolve(); },
    pause() { this.pauses++; },
    removeAttribute(name) { if (name === 'src') this.src = ''; }, load() {}
  });
  function Audio() { return audio; }
  fakeWindow.Audio = Audio;
  vm.runInNewContext(source, {window:fakeWindow, document, location:{pathname:'/blog/test-article/'},
    Audio, fetch, localStorage, Promise, Number, Array, RegExp});
  let fallbackCount = 0;
  fakeWindow.initDataMoneyArticleSpeech({toolbar, speechButton:button, highlighter, onUnavailable: () => { fallbackCount++; }});
  await new Promise(resolve => setTimeout(resolve, 0));
  button.fire('click');
  await new Promise(resolve => setTimeout(resolve, 0));
  return {button, menu, play, feedback, audio, speeds, storage, fetched, fallbackCount, highlighter};
}

const good = await scenario(id);
assert.equal(good.play.disabled, false);
assert.equal(good.fetched.length, 2, 'only metadata loads before playback; audio waits for a click');
assert.ok(good.fetched[1].endsWith(`/test-article/${id}.json`), 'availability is keyed by the current article fingerprint');
good.play.fire('click');
assert.equal(good.audio.plays, 1, 'play is initiated within the user gesture');
assert.equal(good.audio.src, `https://audio.datamoney.kr/audio/articles/test-article/${id}.mp3`);
good.speeds[2].checked = true;
good.speeds[2].fire('change');
assert.equal(good.audio.playbackRate, 1.2);
assert.equal(good.storage.get('dm-speech-rate'), '1.2');
good.play.fire('click');
assert.equal(good.audio.src, '');
assert.equal(good.button.attrs['aria-pressed'], 'false');

const stale = await scenario('b'.repeat(64));
assert.equal(stale.play.disabled, true, 'old audio must not play after article text changes');
assert.equal(stale.fallbackCount, 1, 'unconverted articles retain their existing reader during rollout');
assert.match(stale.feedback.textContent, /준비/);
assert.equal(stale.audio.plays, 0);

const timed = await scenario(id, true);
assert.equal(timed.highlighter.entries.length, 2, 'timings are prepared for the matching recording');
assert.equal(timed.fetched.length, 3, 'metadata and timing load without fetching the MP3');
timed.play.fire('click');
timed.audio.fire('playing');
assert.equal(timed.highlighter.shown.at(-1), 0, 'the first sentence highlights when playback starts');
timed.audio.currentTime = 2.2;
timed.audio.fire('timeupdate');
assert.equal(timed.highlighter.shown.at(-1), 0, 'the previous sentence stays highlighted through a silent gap');
timed.audio.currentTime = 3;
timed.audio.fire('timeupdate');
assert.equal(timed.highlighter.shown.at(-1), 1, 'the highlight follows audio time');
timed.audio.currentTime = 5.5;
timed.audio.fire('timeupdate');
assert.equal(timed.highlighter.shown.at(-1), 1, 'the final sentence remains highlighted until playback ends');
timed.audio.currentTime = 2.2;
timed.audio.fire('seeked');
assert.equal(timed.highlighter.shown.at(-1), 0, 'seeking backward into a gap restores the previous sentence');
timed.play.fire('click');
assert.equal(timed.highlighter.clears, 1, 'stopping audio clears the highlight');
console.log('Local speech UI: on-demand playback, speed, stop, and changed-content protection passed');
