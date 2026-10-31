import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../scripts/back-navigation.js', import.meta.url), 'utf8');
function scenario({length = 2, open = false, embedded = false} = {}) {
  let keydown, backs = 0, closes = 0;
  const mainWindow = {
    history: {length, back() { backs++; }},
    document: {querySelector() { return open ? {click() { closes++; }} : null; }}
  };
  const window = embedded ? {frameElement: {closest() {return {}; }}, parent: mainWindow} : mainWindow;
  const document = {addEventListener(name, fn) {if (name === 'keydown') keydown = fn;}};
  vm.runInNewContext(source, {document, window});
  function press(options = {}) {
    let prevented = false;
    const node = {nodeType: 1, isContentEditable: !!options.editable, matches() {return !!options.field;}};
    const event = {key: 'Backspace', composedPath() {return [node];}, preventDefault() {prevented = true;}, ...options};
    keydown(event);
    return prevented;
  }
  return {press, counts: () => ({backs, closes})};
}

const ordinary = scenario();
assert.equal(ordinary.press(), true);
assert.deepEqual(ordinary.counts(), {backs: 1, closes: 0});
for (const options of [{field: true}, {editable: true}, {isComposing: true}, {repeat: true}, {ctrlKey: true}, {altKey: true}, {metaKey: true}, {shiftKey: true}, {defaultPrevented: true}, {key: 'Delete'}]) {
  assert.equal(ordinary.press(options), false, JSON.stringify(options));
}
assert.deepEqual(ordinary.counts(), {backs: 1, closes: 0}, 'editing or shortcuts must not navigate');
const noHistory = scenario({length: 1});
assert.equal(noHistory.press(), false);
assert.deepEqual(noHistory.counts(), {backs: 0, closes: 0});
for (const embedded of [false, true]) {
  const test = scenario({open: true, embedded});
  assert.equal(test.press(), true);
  assert.deepEqual(test.counts(), {backs: 0, closes: 1}, 'embedded test returns to its underlying page');
}
console.log('Backspace navigates outside editable fields and closes the embedded test: passed');
