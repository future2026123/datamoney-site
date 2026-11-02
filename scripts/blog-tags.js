(() => {
  const card = document.getElementById("blog-tags");
  const content = document.getElementById("blog-tags-content");
  if (!card || !content) return;

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

  const index = globalThis.dmBlogTagsIndex || (globalThis.dmBlogTagsIndex = fetch("/blog/tags-index.json?v=20261102-dates", {cache:"no-cache"})
    .then((response) => {
      if (!response.ok) throw new Error("Tag index unavailable");
      return response.json();
    }));
  index.then(({tags}) => {
      if (!Array.isArray(tags) || !tags.length) return;
      content.append(tagList(tags.slice(0, 10)));
      card.hidden = false;
    })
    .catch(() => {});
})();
