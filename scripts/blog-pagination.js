(() => {
  const posts = [...document.querySelectorAll(".latest-posts > a.post-card")];
  const navigation = document.getElementById("post-pagination");
  const pageSize = 10;
  if (!navigation || !posts.length) return;

  const pageCount = Math.ceil(posts.length / pageSize);
  const requested = new URLSearchParams(window.location.search).get("page");
  const requestedPage = /^[1-9]\d*$/.test(requested || "") ? Number(requested) : 1;
  const currentPage = Number.isSafeInteger(requestedPage)
    ? Math.min(requestedPage, pageCount)
    : 1;

  posts.forEach((post, index) => {
    post.hidden = index < (currentPage - 1) * pageSize || index >= currentPage * pageSize;
  });
  if (pageCount <= 1) return;

  const pageUrl = page => {
    const url = new URL(window.location.href);
    if (page === 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(page));
    url.hash = "";
    return url.pathname + url.search;
  };
  const addLink = (label, page, ariaLabel, disabled = false) => {
    const item = document.createElement(disabled ? "span" : "a");
    item.textContent = label;
    if (disabled) {
      item.className = "pagination-disabled";
      item.setAttribute("aria-disabled", "true");
    } else {
      item.href = pageUrl(page);
      if (page === currentPage && /^\d+$/.test(label)) item.setAttribute("aria-current", "page");
    }
    if (ariaLabel) item.setAttribute("aria-label", ariaLabel);
    navigation.appendChild(item);
  };

  addLink("이전", currentPage - 1, "이전 페이지", currentPage === 1);
  const visiblePages = new Set([1, pageCount]);
  const firstPage = pageCount <= 5 ? 1 : Math.max(1, currentPage - 1);
  const lastPage = pageCount <= 5 ? pageCount : Math.min(pageCount, currentPage + 1);
  for (let page = firstPage; page <= lastPage; page++) {
    visiblePages.add(page);
  }
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
  navigation.hidden = false;
})();
