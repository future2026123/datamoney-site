import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const dom = new JSDOM(`<!doctype html><body><article class="dm-post">
  <div class="dm-article-heading"><h1>시험 글</h1></div>
  <p>한국어로 ETF를 설명합니다.</p>
  <blockquote><p>Annualized returns for the S&amp;P 500 were negative.</p></blockquote>
  <p>그는 “Keep investment costs low.”라고 말했다.</p>
  <p>다시 한국어로 설명합니다.</p>
</article></body>`, {url:'https://datamoney.kr/blog/test-article/', runScripts:'outside-only'});
const {window} = dom;
Object.defineProperty(window.HTMLElement.prototype, 'innerText', {get() { return this.textContent; }});
const englishVoice = {name:'English', lang:'en-US'};
const synth = {
  pending:[],
  getVoices() { return [{name:'Korean', lang:'ko-KR'}, englishVoice]; },
  speak(utterance) { this.pending.push(utterance); },
  cancel() {}, pause() {}, resume() {}
};
window.speechSynthesis = synth;
window.SpeechSynthesisUtterance = function(text) { this.text = text; };
window.fetch = async () => ({ok:true, json:async () => ({reactions:0, comments:0})});
window.eval(await readFile(new URL('../blog/article-speech.js', import.meta.url), 'utf8'));
window.createDataMoneySpeechHighlighter = () => null;
window.initDataMoneyArticleSpeech = ({onUnavailable}) => onUnavailable();
window.eval(await readFile(new URL('../blog/article-actions.js', import.meta.url), 'utf8'));
window.document.querySelector('[data-action="speech"]').click();
const spoken = [];
while (synth.pending.length) {
  const utterance = synth.pending.shift();
  spoken.push(utterance);
  utterance.onstart?.();
  utterance.onend?.();
}
assert.deepEqual(spoken.map(item => item.lang), ['ko-KR', 'ko-KR', 'en-US', 'ko-KR', 'en-US', 'ko-KR', 'ko-KR']);
assert.match(spoken[1].text, /이 티 에프/);
assert.equal(spoken[2].text, 'Annualized returns for the S&P 500 were negative.');
assert.equal(spoken[2].voice, englishVoice);
assert.equal(spoken[4].voice, englishVoice);
assert.equal(spoken[4].text, '“Keep investment costs low.”');
dom.window.close();
console.log('Device fallback selects an English voice only for the English sentence.');
