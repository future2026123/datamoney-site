(() => {
  const query = new URLSearchParams(window.location.search).get("q")?.trim() || "";
  const input = document.getElementById("dm-header-query");
  const heading = document.getElementById("search-heading");
  const status = document.getElementById("search-status");
  const list = document.getElementById("search-results");
  if (input) input.value = query;
  if (!query) return;

  const normalize = (value) => value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  heading.textContent = `‘${query}’ 검색 결과`;
  status.textContent = "검색 중입니다.";

  fetch("/search/index.json")
    .then((response) => {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    })
    .then((articles) => {
      const results = articles.map((article) => {
        const title = normalize(article.title);
        const content = normalize(`${article.title} ${article.description} ${article.text}`);
        const score = (title.includes(normalizedQuery) ? 100 : 0)
          + terms.filter((term) => title.includes(term)).length * 10;
        return { article, score, matches: terms.every((term) => content.includes(term)) };
      }).filter((result) => result.matches)
        .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, "ko"));

      status.textContent = results.length ? `총 ${results.length}개의 글을 찾았습니다.` : "검색 결과가 없습니다. 다른 검색어로 다시 검색해 주세요.";
      const fragment = document.createDocumentFragment();
      results.forEach(({ article }) => {
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
    })
    .catch(() => {
      status.textContent = "검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    });
})();
