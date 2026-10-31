import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../blog/article-speech.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, {window});
const say = window.prepareDataMoneySpeech;
assert.equal(say('S&P 500과 S&P500, PER는 ETF를 본다.'), '에스 엔 피 오백과 에스 엔 피 오백, 퍼는 이 티 에프를 본다.');
assert.equal(say('per도 보지만 one per year와 SUPER는 그대로.'), '퍼도 보지만 one per year와 SUPER는 그대로.');
assert.equal(say('선행 per 낮아지는 이유'), '선행 퍼 낮아지는 이유');
assert.equal(say('PBR·CPI·ISA·IRP·KOSPI'), '피 비 알·씨 피 아이·아이 에스 에이·아이 알 피·코스피');
console.log('Shared speech pronunciation rules: device voice and generator inputs agree');
