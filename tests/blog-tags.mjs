import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

class Element {
  constructor(tag = "div") { this.tag = tag; this.children = []; this.hidden = false; this.attributes = {}; this.textContent = ""; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const sidebarSource = await readFile(new URL("../scripts/blog-tags.js", import.meta.url), "utf8");
const searchSource = await readFile(new URL("../search/search.js", import.meta.url), "utf8");
const tags = Array.from({length: 15}, (_, i) => ({name: i ? `태그 ${i}` : "S&P 500", count: 15 - i}));
const articles = [
  {path: "/blog/one/", title: "첫 번째", description: "설명", tags: ["S&P 500", "태그 1"]},
  {path: "/blog/two/", title: "두 번째", description: "설명", tags: ["태그 1"]},
  {path: "/blog/three/", title: "태그처럼 보이는 제목", description: "S&P 500", tags: ["태그 2"]},
];
const flush = () => new Promise((resolve) => setImmediate(resolve));
async function sidebar(path) {
  const card = new Element(), content = new Element();
  card.hidden = true;
  const document = {getElementById: (id) => ({"blog-tags": card, "blog-tags-content": content})[id], createElement: (tag) => new Element(tag)};
  vm.runInNewContext(sidebarSource, {document, location: {pathname: path}, fetch: async () => ({ok: true, json: async () => ({articles, tags})})});
  await flush();
  return {card, content};
}
const home = await sidebar("/blog/");
assert.equal(home.card.hidden, false);
assert.equal(home.content.children.length, 1, "there is no expandable list");
assert.equal(home.content.children[0].children.length, 10);
assert.equal(home.content.children[0].children[0].href, "/search/?tag=S%26P%20500");
const article = await sidebar("/blog/one/");
assert.equal(article.content.children.length, 1, "article-specific tags are not displayed");
assert.equal(article.content.children[0].children.length, 10);
assert.deepEqual(article.content.children[0].children.map((link) => link.href), home.content.children[0].children.map((link) => link.href), "home and articles show the same ten global tags");

async function search(search, fetchData) {
  const nodes = Object.fromEntries(["dm-header-query", "search-heading", "search-status", "search-results"].map((id) => [id, new Element()]));
  const document = {getElementById: (id) => nodes[id], createElement: (tag) => new Element(tag), createDocumentFragment: () => new Element("fragment")};
  vm.runInNewContext(searchSource, {document, window: {location: {search}}, URLSearchParams, fetch: async (url) => ({ok: true, json: async () => fetchData[url]})});
  await flush();
  return nodes;
}
const tagResult = await search("?tag=S%26P%20500", {"/blog/tags-index.json": {articles, tags}});
assert.equal(tagResult["search-status"].textContent, "총 1개의 글을 찾았습니다.");
assert.equal(tagResult["search-results"].children[0].children[0].children[0].href, "/blog/one/", "tag results use assigned tags, not unrelated text");
const missing = await search("?tag=없는태그", {"/blog/tags-index.json": {articles, tags}});
assert.equal(missing["search-status"].textContent, "이 태그에 해당하는 글이 없습니다.");
const query = await search("?q=복리", {"/search/index.json": [{path: "/blog/one/", title: "복리 투자", description: "", text: "복리 투자"}]});
assert.equal(query["search-status"].textContent, "총 1개의 글을 찾았습니다.", "ordinary search still works");
console.log("Blog tags: the same top ten on home and articles, exact tag results, and ordinary search passed");
