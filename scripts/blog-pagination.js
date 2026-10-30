(() => {
  let posts = [...document.querySelectorAll(".latest-posts > a.post-card")];
  const navigation = document.getElementById("post-pagination");
  const categoryBar = document.querySelector(".category-bar");
  const categoryLinks = categoryBar ? [...categoryBar.querySelectorAll("a[data-category]")] : [];
  const status = document.querySelector(".category-status");
  const heading = document.getElementById("latest-heading");
  const pageSize = 10;
  if (!navigation || !posts.length) return;

  const knownCategories = new Set(categoryLinks.map(link => link.dataset.category)
    .filter(category => category !== "all" && category !== "other"));
  const postCategory = post => knownCategories.has(post.dataset.category) ? post.dataset.category : "other";
  const urlFor = (category, page) => {
    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    if (page === 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(page));
    url.hash = "";
    return url.pathname + url.search;
  };

  const render = () => {
    posts = [...document.querySelectorAll(".latest-posts > a.post-card")];
    const params = new URLSearchParams(window.location.search);
    const counts = {all: posts.length, other: 0};
    knownCategories.forEach(category => { counts[category] = 0; });
    posts.forEach(post => { counts[postCategory(post)] += 1; });
    const requestedCategory = params.get("category") || "all";
    const category = Object.hasOwn(counts, requestedCategory) && counts[requestedCategory] > 0
      ? requestedCategory : "all";
    const matching = category === "all" ? posts : posts.filter(post => postCategory(post) === category);
    const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
    const requested = params.get("page");
    const requestedPage = /^[1-9]\d*$/.test(requested || "") ? Number(requested) : 1;
    const currentPage = Number.isSafeInteger(requestedPage) ? Math.min(requestedPage, pageCount) : 1;

    posts.forEach(post => { post.hidden = true; });
    matching.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      .forEach(post => { post.hidden = false; });

    categoryLinks.forEach(link => {
      const key = link.dataset.category;
      const count = counts[key] || 0;
      const label = link.querySelector("span")?.textContent || "";
      const countElement = link.querySelector(".category-count");
      if (countElement) countElement.textContent = String(count);
      link.hidden = key === "other" && count === 0;
      link.href = urlFor(key, 1);
      link.setAttribute("aria-label", `${label}, 글 ${count}개`);
      if (key === category) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (status) {
      const label = categoryLinks.find(link => link.dataset.category === category)?.querySelector("span")?.textContent || "전체";
      status.textContent = `${label} 글 ${matching.length}개, ${currentPage} / ${pageCount}페이지`;
    }

    navigation.replaceChildren();
    navigation.hidden = pageCount <= 1;
    if (pageCount <= 1) return;

    const addLink = (label, page, ariaLabel, disabled = false) => {
      const item = document.createElement(disabled ? "span" : "a");
      item.textContent = label;
      if (disabled) {
        item.className = "pagination-disabled";
        item.setAttribute("aria-disabled", "true");
      } else {
        item.href = urlFor(category, page);
        if (page === currentPage && /^\d+$/.test(label)) item.setAttribute("aria-current", "page");
      }
      if (ariaLabel) item.setAttribute("aria-label", ariaLabel);
      navigation.appendChild(item);
    };

    addLink("이전", currentPage - 1, "이전 페이지", currentPage === 1);
    const visiblePages = new Set([1, pageCount]);
    const firstPage = pageCount <= 5 ? 1 : Math.max(1, currentPage - 1);
    const lastPage = pageCount <= 5 ? pageCount : Math.min(pageCount, currentPage + 1);
    for (let page = firstPage; page <= lastPage; page++) visiblePages.add(page);
    let previous = 0;
    [...visiblePages].sort((a, b) => a - b).forEach(page => {
      if (page - previous > 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.setAttribute("aria-hidden", "true");
        ellipsis.textContent = "…";
        navigation.appendChild(ellipsis);
      }
      addLink(String(page), page, `${page}페이지`);
      previous = page;
    });
    addLink("다음", currentPage + 1, "다음 페이지", currentPage === pageCount);
  };

  const follow = (event, scrollToList) => {
    const link = event.target.closest("a[href]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    event.preventDefault();
    if (url.href !== window.location.href) history.pushState(null, "", url.href);
    render();
    if (scrollToList && heading) {
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
      heading.scrollIntoView({block: "start"});
    }
  };
  categoryBar?.addEventListener("click", event => follow(event, false));
  navigation.addEventListener("click", event => follow(event, true));
  window.addEventListener("popstate", render);
  render();
})();
