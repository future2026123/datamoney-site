(() => {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get("tag")?.trim() || "";
  const query = params.get("q")?.trim() || "";
  const input = document.getElementById("dm-header-query");
  const heading = document.getElementById("search-heading");
  const status = document.getElementById("search-status");
  const list = document.getElementById("search-results");
  if (input) input.value = query;
  if (!query && !tag) return;

  const normalize = (value) => value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();

  function render(articles, emptyMessage) {
    status.textContent = articles.length ? `총 ${articles.length}개의 글을 찾았습니다.` : emptyMessage;
    const fragment = document.createDocumentFragment();
    articles.forEach((article) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const title = document.createElement("h2");
      link.href = article.path;
      title.textContent = article.title;
      link.appendChild(title);
      if (article.description) {
        const description = document.createElement("p");
        description.textContent = article.description;
        link.appendChild(description);
      }
      item.appendChild(link);
      fragment.appendChild(item);
    });
    list.replaceChildren(fragment);
  }

  function json(url) {
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    });
  }

  status.textContent = "검색 중입니다.";
  if (tag) {
    heading.textContent = `‘${tag}’ 태그 글`;
    json("/blog/tags-index.json")
      .then(({articles}) => render(
        articles.filter((article) => article.tags.some((value) => normalize(value) === normalize(tag))),
        "이 태그에 해당하는 글이 없습니다."
      ))
      .catch(() => { status.textContent = "태그 글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."; });
    return;
  }

  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  heading.textContent = `‘${query}’ 검색 결과`;
  json("/search/index.json")
    .then((articles) => {
      const results = articles.map((article) => {
        const title = normalize(article.title);
        const content = normalize(`${article.title} ${article.description} ${article.text}`);
        const score = (title.includes(normalizedQuery) ? 100 : 0)
          + terms.filter((term) => title.includes(term)).length * 10;
        return {article, score, matches: terms.every((term) => content.includes(term))};
      }).filter((result) => result.matches)
        .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, "ko"));
      render(results.map(({article}) => article), "검색 결과가 없습니다. 다른 검색어로 다시 검색해 주세요.");
    })
    .catch(() => { status.textContent = "검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."; });
})();
