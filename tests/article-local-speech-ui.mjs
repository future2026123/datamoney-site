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

async function scenario(remoteId, includeHighlighter = false, saved = []) {
  const play = create({disabled: true});
  const close = create();
  const feedback = create();
  const speeds = ['0.85', '1', '1.2'].map(value => create({value, checked: false}));
  const menu = create({hidden: true,
    querySelector(selector) { return ({'[data-speech-play]':play, '[data-speech-close]':close, '.dm-speech-feedback':feedback})[selector]; },
    querySelectorAll() { return speeds; }
  });
  const settings = create();
  const label = create(), info = create();
  const button = create({querySelector: selector => ({'[data-speech-label]':label, '[data-speech-info]':info})[selector]});
  const toggle = create(), playerClose = create(), current = create(), playerTime = create();
  const player = create({hidden:true, querySelector: selector => ({'[data-player-toggle]':toggle, '[data-player-close]':playerClose, '[data-player-current]':current, '[data-player-time]':playerTime})[selector]});
  const toolbar = {querySelector: selector => selector === '.dm-speech-menu' ? menu : settings};
  const document = create();
  const fakeWindow = create();
  fakeWindow.getSelection = () => ({isCollapsed:true});
  const analytics = [];
  fakeWindow.gtag = (...args) => analytics.push(args);
  const storage = new Map(saved);
  const localStorage = {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem:key => storage.delete(key)};
  const fetched = [];
  const highlighter = includeHighlighter ? {
    entries:[], shown:[], clears:0,
    prepare(entries) { this.entries = entries; },
    show(index) { this.shown.push(index); },
    clear() { this.clears++; },
    indexAtPoint(x, y, target) { return target.sentenceIndex ?? -1; }
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
  const audio = create({src:'', currentTime:0, duration:10, readyState:1, playbackRate:1, plays:0, pauses:0,
    play() { this.plays++; return Promise.resolve(); },
    pause() { this.pauses++; },
    getAttribute(name) { return name === 'src' ? this.src : null; },
    removeAttribute(name) { if (name === 'src') this.src = ''; }, load() {}
  });
  function Audio() { return audio; }
  fakeWindow.Audio = Audio;
  vm.runInNewContext(source, {window:fakeWindow, document, location:{pathname:'/blog/test-article/'},
    Audio, fetch, localStorage, Promise, Number, Array, RegExp});
  let fallbackCount = 0;
  fakeWindow.initDataMoneyArticleSpeech({toolbar, speechButton:button, player, highlighter, onUnavailable: () => { fallbackCount++; }});
  await new Promise(resolve => setTimeout(resolve, 0));
  return {button, settings, label, info, player, toggle, playerClose, current, playerTime, menu, play, feedback, audio, speeds, storage, fetched, fallbackCount, highlighter, document, fakeWindow, analytics};
}

const good = await scenario(id);
assert.equal(good.play.disabled, false);
assert.equal(good.fetched.length, 2, 'availability is checked before playback');
assert.ok(good.fetched[1].endsWith(`/test-article/${id}.json`), 'availability is keyed by the current article fingerprint');
assert.equal(good.audio.plays, 0, 'audio does not play before a click');
good.audio.fire('loadedmetadata');
assert.match(good.info.textContent, /AI 음성.*0분 10초/, 'voice and actual duration are shown');
good.settings.fire('click');
assert.equal(good.menu.hidden, false, 'settings open separately from playback');
good.button.fire('click');
assert.equal(good.audio.plays, 1, 'play is initiated within the user gesture');
assert.equal(good.player.hidden, false, 'compact player appears when playback begins');
assert.equal(good.audio.src, `https://audio.datamoney.kr/audio/articles/test-article/${id}.mp3`);
good.speeds[2].checked = true;
good.speeds[2].fire('change');
assert.equal(good.audio.playbackRate, 1.2);
assert.equal(good.storage.get('dm-speech-rate'), '1.2');
good.audio.currentTime = 1;
good.audio.fire('timeupdate');
good.audio.currentTime = 2.2;
good.audio.fire('timeupdate');
good.audio.currentTime = 4;
good.toggle.fire('click');
assert.equal(good.audio.pauses, 1, 'player pauses without discarding audio');
assert.equal(good.storage.get('dm-speech-position:test-article:' + id), '4', 'position is saved for this recording');
assert.equal(good.button.attrs['aria-pressed'], 'false');
good.toggle.fire('click');
assert.equal(good.audio.plays, 2, 'player resumes with one click');
good.playerClose.fire('click');
assert.equal(good.player.hidden, true, 'closing hides the player');
assert.equal(good.button.attrs['aria-pressed'], 'false');
assert.ok(good.analytics.some(event => event[1] === 'audio_play'), 'play events reach analytics');
assert.ok(good.analytics.some(event => event[1] === 'audio_listening'), 'listening time reaches analytics');

const resumed = await scenario(id, false, [['dm-speech-position:test-article:' + id, '4']]);
assert.equal(resumed.label.textContent, '이어 듣기', 'saved position is offered on a later visit');
resumed.button.fire('click');
assert.equal(resumed.audio.currentTime, 4, 'one click resumes at the saved position');

const measured = await scenario(id);
measured.audio.duration = 100;
measured.button.fire('click');
for (let second = 0; second <= 35; second += 5) {
  measured.audio.currentTime = second;
  measured.audio.fire('timeupdate');
}
assert.ok(measured.analytics.some(event => event[1] === 'audio_listened_30s'), 'audible listening duration emits a milestone');
measured.audio.fire('ended');
assert.ok(measured.analytics.some(event => event[1] === 'audio_complete'), 'completion is recorded');
assert.equal(measured.storage.has('dm-speech-position:test-article:' + id), false, 'completion clears the saved position');
assert.equal(measured.audio.currentTime, 0, 'completed audio can be replayed from the beginning');

const stale = await scenario('b'.repeat(64));
assert.equal(stale.play.disabled, true, 'old audio must not play after article text changes');
assert.equal(stale.fallbackCount, 1, 'unconverted articles retain their existing reader during rollout');
assert.match(stale.feedback.textContent, /준비/);
assert.equal(stale.audio.plays, 0);

const timed = await scenario(id, true);
assert.equal(timed.highlighter.entries.length, 2, 'timings are prepared for the matching recording');
assert.equal(timed.fetched.length, 3, 'metadata and timing load without fetching the MP3');
timed.button.fire('click');
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
const sentence = {sentenceIndex:1, closest:() => null};
timed.document.fire('click', {target:sentence, button:0, clientX:20, clientY:30});
assert.equal(timed.audio.currentTime, 2.5, 'clicking a sentence seeks to its start');
assert.equal(timed.highlighter.shown.at(-1), 1, 'clicking updates the highlight immediately');
timed.fakeWindow.getSelection = () => ({isCollapsed:false});
timed.document.fire('click', {target:{...sentence, sentenceIndex:0}, button:0});
assert.equal(timed.audio.currentTime, 2.5, 'selecting text does not seek');
timed.fakeWindow.getSelection = () => ({isCollapsed:true});
timed.document.fire('click', {target:{sentenceIndex:0, closest:selector => selector.includes('a, button') ? {} : null}, button:0});
assert.equal(timed.audio.currentTime, 2.5, 'clicking a link does not seek');
timed.playerClose.fire('click');
assert.equal(timed.highlighter.clears, 1, 'stopping audio clears the highlight');
timed.document.fire('click', {target:{...sentence, sentenceIndex:0}, button:0});
assert.equal(timed.audio.currentTime, 2.5, 'clicking after playback stops does not seek');

// Exercise the actual text-position mapping, including text split across inline elements.
const paragraph = {closest: selector => selector.startsWith('p, li') ? paragraph : null};
const first = {nodeType:3, data:'첫 문장. ', length:6, parentElement:paragraph};
const second = {nodeType:3, data:'두 번째 문장.', length:8, parentElement:paragraph};
const root = {contains: target => target === paragraph};
const positionWindow = create({getSelection:() => ({isCollapsed:true})});
const positionDocument = {
  createTreeWalker() {
    const nodes = [first, second];
    return {nextNode: () => nodes.shift() || null};
  },
  caretPositionFromPoint(x) { return x === 1 ? {offsetNode:first, offset:1} : {offsetNode:second, offset:2}; }
};
vm.runInNewContext(source, {window:positionWindow, document:positionDocument, RegExp, String});
const locator = positionWindow.createDataMoneySpeechHighlighter({title:null, content:root, followInput:null});
locator.prepare([{text:'첫 문장.'}, {text:'두 번째 문장.'}]);
assert.equal(locator.indexAtPoint(1, 0, paragraph), 0, 'first sentence maps from its text node');
assert.equal(locator.indexAtPoint(2, 0, paragraph), 1, 'second sentence maps from its text node');
assert.equal(locator.indexAtPoint(1, 0, {}), -1, 'clicks outside the article are ignored');
console.log('Local speech UI: on-demand playback, speed, stop, and changed-content protection passed');
