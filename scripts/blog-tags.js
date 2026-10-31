(() => {
  const card = document.getElementById("blog-tags");
  const content = document.getElementById("blog-tags-content");
  if (!card || !content) return;

  const tagKey = (value) => value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
  const normalizedPath = (path) => path.replace(/\/index\.html$/, "/");

  function tagList(tags) {
    const container = document.createElement("div");
    container.className = "tag-chips";
    tags.forEach(({name, count}) => {
      const link = document.createElement("a");
      link.className = "tag-chip";
      link.href = `/search/?tag=${encodeURIComponent(name)}`;
      link.setAttribute("aria-label", `${name} 태그 글 ${count}개 보기`);
      const label = document.createElement("span");
      label.textContent = `#${name}`;
      const number = document.createElement("span");
      number.className = "tag-count";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(count);
      link.append(label, number);
      container.append(link);
    });
    return container;
  }

  function moreTags(label, tags) {
    const details = document.createElement("details");
    details.className = "tags-more";
    const summary = document.createElement("summary");
    summary.textContent = label;
    details.append(summary, tagList(tags));
    return details;
  }

  fetch("/blog/tags-index.json")
    .then((response) => {
      if (!response.ok) throw new Error("Tag index unavailable");
      return response.json();
    })
    .then(({articles, tags}) => {
      if (!Array.isArray(articles) || !Array.isArray(tags) || !tags.length) return;
      const byName = new Map(tags.map((tag) => [tagKey(tag.name), tag]));
      const current = articles.find((article) => normalizedPath(article.path) === normalizedPath(location.pathname));
      if (current && Array.isArray(current.tags) && current.tags.length) {
        const label = document.createElement("p");
        label.className = "tag-context";
        label.textContent = "이 글의 태그";
        const currentTags = current.tags.map((name) => byName.get(tagKey(name))).filter(Boolean);
        content.append(label, tagList(currentTags), moreTags("전체 태그 보기", tags));
      } else {
        content.append(tagList(tags.slice(0, 12)));
        if (tags.length > 12) content.append(moreTags("태그 더 보기", tags.slice(12)));
      }
      card.hidden = false;
    })
    .catch(() => {});
})();
