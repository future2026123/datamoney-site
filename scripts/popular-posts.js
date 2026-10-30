(() => {
  const container = document.getElementById("popular-posts");
  const note = document.getElementById("popular-posts-note");
  if (!container || !note) return;

  fetch("/blog/popular-posts.json", { cache: "no-cache" })
    .then(response => {
      if (!response.ok) throw new Error("Popular posts unavailable");
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.posts)) return;
      if (!data.posts.length) {
        if (data.generatedAt) container.querySelector(".popular-empty").textContent = "아직 집계된 조회수가 없습니다.";
        return;
      }
      const cards = new Map(
        [...document.querySelectorAll(".latest-posts > a.post-card, .side-posts > a.post-card")]
          .map(card => [new URL(card.href).pathname.replace(/\/?$/, "/"), card])
      );
      const list = document.createElement("ol");
      list.className = "popular-list";
      data.posts.slice(0, 5).forEach((post, index) => {
        if (typeof post.path !== "string" || !/^\/blog\/[a-z0-9][a-z0-9-]*\/$/.test(post.path) ||
            typeof post.title !== "string" || !post.title.trim()) return;
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = post.path;
        const rank = document.createElement("span");
        rank.className = "popular-rank";
        rank.textContent = String(index + 1);
        link.appendChild(rank);
        const image = cards.get(post.path)?.querySelector(".post-thumb img");
        if (image) {
          const thumbnail = document.createElement("img");
          thumbnail.src = image.getAttribute("src");
          thumbnail.alt = "";
          thumbnail.loading = "lazy";
          link.appendChild(thumbnail);
        } else {
          link.classList.add("no-thumbnail");
        }
        const title = document.createElement("span");
        title.className = "popular-title";
        title.textContent = post.title;
        link.appendChild(title);
        item.appendChild(link);
        list.appendChild(item);
      });
      if (!list.children.length) return;
      container.replaceChildren(list);
      const day = typeof data.generatedAt === "string" ? data.generatedAt.slice(0, 10) : "";
      note.textContent = `최근 28일 페이지 요청 기준 · 자동 접속 포함 가능${day ? ` · ${day} 갱신` : ""}`;
    })
    .catch(() => {});
})();
