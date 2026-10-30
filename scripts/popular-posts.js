(() => {
  const container = document.getElementById("popular-posts");
  const note = document.getElementById("popular-posts-note");
  if (!container || !note) return;

  fetch("/blog/popular-posts.json", { cache: "no-cache" })
    .then(response => {
      if (!response.ok) throw new Error("Popular posts unavailable");
      return response.json();
    })
    .then(async data => {
      if (!Array.isArray(data.posts)) return;
      if (!data.posts.length) {
        if (data.generatedAt) container.querySelector(".popular-empty").textContent = "아직 집계된 조회수가 없습니다.";
        return;
      }
      let cardRoot = document;
      if (!document.querySelector(".latest-posts > a.post-card")) {
        try {
          const response = await fetch("/blog/", { cache: "no-cache" });
          if (response.ok) {
            const page = document.createElement("template");
            page.innerHTML = await response.text();
            cardRoot = page.content;
          }
        } catch (_) { /* Keep the fallback thumbnail map when the home page is unavailable. */ }
      }
      const cards = new Map(
        [...cardRoot.querySelectorAll(".latest-posts > a.post-card")]
          .map(card => [new URL(card.getAttribute("href"), location.origin).pathname.replace(/\/?$/, "/"), card])
      );
      const otherThumbnails = {
        "/blog/super-isa-youth-isa-guide/": "/blog/thumbnails/l6OWTb7__ow.jpg",
        "/blog/beginner-investor-148man-2026/": "/blog/thumbnails/NATj2h0cdh4.jpg",
        "/blog/covered-call-etf-principal/": "/blog/thumbnails/rGwarer6JzQ.jpg",
        "/blog/molppang-math-2026/": "/blog/thumbnails/94dBOfMedtk.jpg",
        "/blog/ria-overseas-stock-yangdose-0won/": "/blog/thumbnails/AmyqHO3RK5w.jpg",
        "/blog/dividend-100manwon-roadmap/": "/blog/thumbnails/dividend-100manwon-roadmap-a4446411.png",
      };
      const list = document.createElement("ol");
      list.className = "popular-list";
      data.posts.slice(0, 5).forEach(post => {
        if (typeof post.path !== "string" || !/^\/blog\/[a-z0-9][a-z0-9-]*\/$/.test(post.path) ||
            typeof post.title !== "string" || !post.title.trim()) return;
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = post.path;
        const image = cards.get(post.path)?.querySelector(".post-thumb img");
        const imageSrc = image?.getAttribute("src") || otherThumbnails[post.path];
        if (imageSrc) {
          const thumbnail = document.createElement("img");
          thumbnail.src = imageSrc;
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
